import { createClient } from 'db-vendo-client';

// 'dbnav' emulates the DB Navigator App profile
const client = createClient('dbnav', 'my-custom-daily-scraper');

async function scrapePrices() {
  try {
    console.log('Locations')
    console.log(client.locations())
    console.log(`[${new Date().toISOString()}] Starting daily DB price scrape...`);

    // Departure date set to 7 days from now at 08:00 AM
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(8, 0, 0, 0);

    const response = await client.journeys(
      '8000105', // Frankfurt(Main)Hbf
      '8001111', // München Hbf
      {
        when: targetDate,
        tickets: true // Crucial: Tells the API to fetch price offers
      }
    );

    for (const journey of response.journeys) {
      const departure = journey.legs[0].departure;
      const arrival = journey.legs[journey.legs.length - 1].arrival;
      
      console.log(`\nConnection: ${departure} -> ${arrival}`);
      
      if (journey.price) {
        console.log(`  Base Price: ${journey.price.amount} EUR (${journey.price.currency})`);
      } else {
        console.log(`  Base Price: Not available`);
      }

      // If multiple fare options (Sparpreis, Flexpreis) are returned
      if (journey.tickets && journey.tickets.length > 0) {
        console.log(`  Available Offers:`);
        for (const ticket of journey.tickets) {
          console.log(`    - ${ticket.name}: ${ticket.price?.amount || 'N/A'} EUR`);
        }
      }
    }
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

scrapePrices();