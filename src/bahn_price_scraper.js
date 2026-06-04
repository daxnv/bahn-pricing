import Database from 'better-sqlite3';
import { createClient } from 'db-vendo-client';
import { withThrottling } from 'db-vendo-client/throttle.js'
import { profile as dbnavProfile } from 'db-vendo-client/p/dbnav/index.js';

const isDebugMode = process.env.DEBUG === 'true';

const client = createClient(withThrottling(dbnavProfile), 'bahn-price-scraper');

async function sendDiscordError(error, context = '') {
  try {
    if (!process.env.DISCORD_WEBHOOK_URL) {
      throw new Error('DISCORD_WEBHOOK_URL environment variable is required.');
    }
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨  Error${context ? ' ' : ''}${context}:\n\`\`\`${error.stack.slice(0, 1800)}\`\`\``
      })
    });
  } catch (err) {
    console.warn('Error sending alert to Discord:', err);
  }
}

async function scrapePrices() {
  try {
    const scrapeDate = new Date();
    console.log(`[${scrapeDate.toISOString()}] Starting daily DB price scrape...`);

    if (!process.env.DB_PATH) {
      throw new Error('DB_PATH environment variable is required.');
    }
    const db = new Database(process.env.DB_PATH);

    db.exec(`
      CREATE TABLE IF NOT EXISTS journeys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route INTEGER NOT NULL,
        departure DATETIME NOT NULL,
        arrival DATETIME NOT NULL,
        token TEXT,
        FOREIGN KEY (route) REFERENCES routes(id),
        UNIQUE (route, departure, arrival)
      )
    `);
    const insertJourneyStmt = db.prepare(`INSERT OR IGNORE INTO journeys (route, departure, arrival, token) VALUES (?, ?, ?, ?)`);
    const selectJourneyStmt = db.prepare(`SELECT id FROM journeys WHERE route = ? AND departure = ? AND arrival = ?`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATETIME NOT NULL,
        journey INTEGER NOT NULL,
        price REAL,
        currency TEXT,
        raw_response TEXT,
        FOREIGN KEY (journey) REFERENCES journeys(id),
        UNIQUE (journey, date)
      )
    `);
    const insertOfferStmt = db.prepare(`INSERT INTO offers (date, journey, price, currency, raw_response) VALUES (?, ?, ?, ?, ?)`);

    const routes = isDebugMode ?
      db.prepare('SELECT * FROM routes WHERE origin = 8000191 AND destination = 8000044').all() : // Karlsruhe Hbf - Bonn Hbf
      db.prepare('SELECT * FROM routes').all();

    const dateIntervals = isDebugMode ?
      function* () { yield 60; }() : // In debug mode, only fetch prices for in 60 days
      function* () { // In production mode, fetch prices for the next 105 days
        for (let i = 0; i < 105; i++) {
          yield 1;
        }
      }();

    for (const route of routes) { // For each route in the database
      const firstDeparture = new Date(scrapeDate);
      try {
        for (const daysToAdd of dateIntervals) { // Go through all future dates
          firstDeparture.setDate(firstDeparture.getDate() + daysToAdd);
          firstDeparture.setHours(8, 0, 0, 0);
          const lastArrival = new Date(firstDeparture);
          lastArrival.setHours(20, 15, 0, 0);

          for (let laterRef = null, keepScrolling = true; keepScrolling;) {
            const opt = laterRef ?
              { laterThan: laterRef } :
              { departure: firstDeparture }; // departure and laterThan are mutually exclusive, and only set them if not null. Otherwise the API returns an error

            const response = await client.journeys(
              route.origin.toString(),
              route.destination.toString(),
              opt
            );

            for (const journey of response.journeys) {
              const arrivalBeforeLastArrival = new Date(journey.legs[journey.legs.length - 1].plannedArrival) < lastArrival;
              keepScrolling = keepScrolling && arrivalBeforeLastArrival; // Note that arrival times need not be in order

              if (arrivalBeforeLastArrival) {
                const departure = journey.legs[0].plannedDeparture;
                const arrival = journey.legs[journey.legs.length - 1].plannedArrival;
                journey.legs = journey.legs.filter((leg) => !leg.walking).map((leg) => { // Remove walking legs and station information to save space
                  leg.origin = { id: leg.origin.id };
                  leg.destination = { id: leg.destination.id };
                  return leg;
                });

                try {
                  insertJourneyStmt.run(route.id, departure, arrival, journey.refreshToken);
                  const journeyId = selectJourneyStmt.get(route.id, departure, arrival).id;

                  insertOfferStmt.run(scrapeDate.getTime(), journeyId, journey.price ? journey.price.amount : null, journey.price ? journey.price.currency : null, JSON.stringify(journey));
                } catch (error) {
                  console.warn(`Error inserting offer for journey on route ${route.id} from ${departure} to ${arrival}:`, error);
                  sendDiscordAlert(error, `inserting offer for journey on route ${route.id} from ${departure} to ${arrival}`);
                }
              }
            }

            laterRef = response.laterRef; // Set laterRef to request next page
          }
        }
      } catch (error) {
        console.warn(`Error fetching journeys for route ${route.id} on ${firstDeparture}:`, error);
        sendDiscordError(error, `fetching journeys for route ${route.id} on ${firstDeparture}`);
      }
    }
    console.log(`[${new Date().toISOString()}] Finished scraping successfully.`);
  } catch (error) {
    console.error('Error during scraping:', error);
    sendDiscordError(error, 'during scraping');
  }
}

scrapePrices();