import Database from 'better-sqlite3';
import { createClient } from 'db-vendo-client';
import { profile as dbnavProfile } from 'db-vendo-client/p/dbnav/index.js';

const client = createClient(dbnavProfile, 'station-id-lookup');

const stationNames = [
  'Karlsruhe Hbf',
  'Köln Hbf',
  'München Hbf',
  'Berlin Hbf',
  'Bonn Hbf',
  'Frankfurt(Main)Hbf',
  'Hamburg Hbf',
  'Hannover Hbf',
];

async function findStationByName(name) {
  try {
    const locations = await client.locations(name, {
      results: 1,
      stops: true,
      addresses: false,
      poi: false
    });

    if (locations.length == 0) {
      console.warn(`No station found for "${name}".`);
      return null;
    }

    return {
      search: name,
      name: locations[0].name,
      id: locations[0].id
    };
  } catch (error) {
    console.warn(`Could not look up "${name}": ${error.message}`);
    return null;
  }
}

async function main() {
  if (!process.env.DB_PATH) {
    throw new Error('DB_PATH environment variable is required.');
  }
  const db = new Database(process.env.DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      UNIQUE (name)
    )
  `);

  const selectStationByName = db.prepare(`SELECT id FROM stations WHERE name = ?`);
  const insertStation = db.prepare(`
    INSERT INTO stations (id, name)
    VALUES (@id, @name)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name
  `);
  const insertStations = db.transaction((stations) => {
    for (const station of stations) {
      insertStation.run(station);
    }
  });

  const stations = (await Promise.all(
      stationNames
        .filter((name) => !selectStationByName.get(name))
        .map(findStationByName))
    ).filter(Boolean);

  insertStations(stations);
  db.close();

  console.log(`Saved ${stations.length} stations to ${process.env.DB_PATH}`);
  for (const station of stations) {
    console.log(`- ${station.id}, ${station.name}${station.search !== station.name ? ` (search term "${station.search}")` : ''}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
