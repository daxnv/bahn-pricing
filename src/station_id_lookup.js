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

const normalizeStationName = (name) =>
  name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '')
    .toLowerCase();

async function findStationId(stationName) {
  try {
    const locations = await client.locations(stationName, {
      results: 1,
      stops: true,
      addresses: false,
      poi: false
    });

    const normalizedSearch = normalizeStationName(stationName);
    const station =
      locations.find((location) => normalizeStationName(location.name) === normalizedSearch) ??
      locations.find((location) => location.type === 'station' || location.type === 'stop') ??
      locations[0];

    if (!station) {
      console.warn(`No station found for "${stationName}"`);
      return null;
    }

    return {
      search: stationName,
      name: station.name,
      id: station.id
    };
  } catch (error) {
    console.warn(`Could not look up "${stationName}": ${error.message}`);
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

  const saveStation = db.prepare(`
    INSERT INTO stations (id, name)
    VALUES (@id, @name)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name
  `);

  const stations = (await Promise.all(stationNames.map(findStationId))).filter(Boolean);
  const saveStations = db.transaction((foundStations) => {
    for (const station of foundStations) {
      saveStation.run(station);
    }
  });

  saveStations(stations);
  db.close();

  for (const station of stations) {
    console.log(`${station.search}: ${station.id} (${station.name})`);
  }

  console.log(`Saved ${stations.length} stations to ${process.env.DB_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
