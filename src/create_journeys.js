import Database from 'better-sqlite3';

async function main() {
  if (!process.env.DB_PATH) {
    throw new Error('DB_PATH environment variable is required');
  }
  const db = new Database(process.env.DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        origin INTEGER NOT NULL,
        destination INTEGER NOT NULL,
        FOREIGN KEY (origin, destination) REFERENCES stations(id),
        UNIQUE (origin, destination)
    );

    INSERT INTO routes (origin, destination)
    SELECT s1.id, s2.id
    FROM stations s1, stations s2
    WHERE s1.name='Bonn Hbf' AND s2.name='Karlsruhe Hbf'
    ON CONFLICT DO NOTHING;

    INSERT INTO routes (origin, destination)
    SELECT s1.id, s2.id
    FROM stations s1
    JOIN stations s2 ON s1.id != s2.id
    WHERE s1.name='Karlsruhe Hbf'
    ON CONFLICT DO NOTHING;

    INSERT INTO routes (origin, destination)
    SELECT s1.id, s2.id
    FROM stations s1
    JOIN stations s2 ON s1.id != s2.id
    WHERE s1.name='Köln Hbf' AND s2.name != 'Bonn Hbf'
    ON CONFLICT DO NOTHING;

    INSERT INTO routes (origin, destination)
    SELECT s1.id, s2.id
    FROM stations s1
    JOIN stations s2 ON s1.id != s2.id
    WHERE s1.name='München Hbf' AND s2.name NOT IN ('Bonn Hbf','Hamburg Hbf')
    ON CONFLICT DO NOTHING;


    INSERT INTO routes (origin, destination)
    SELECT s1.id, s2.id
    FROM stations s1
    JOIN stations s2 ON s1.id != s2.id
    WHERE s1.name='Hamburg Hbf' AND s2.name NOT IN ('Bonn Hbf','München Hbf')
    ON CONFLICT DO NOTHING;

    INSERT INTO routes (origin, destination)
    SELECT s1.id, s2.id
    FROM stations s1
    JOIN stations s2 ON s1.id != s2.id
    WHERE s1.name='Berlin Hbf' AND s2.name != 'Bonn Hbf'
    ON CONFLICT DO NOTHING;

    INSERT INTO routes (origin, destination)
    SELECT s1.id, s2.id
    FROM stations s1
    JOIN stations s2 ON s1.id != s2.id
    WHERE s1.name='Hannover Hbf' AND s2.name != 'Bonn Hbf'
    ON CONFLICT DO NOTHING;

    INSERT INTO routes (origin, destination)
    SELECT s1.id, s2.id
    FROM stations s1
    JOIN stations s2 ON s1.id != s2.id
    WHERE s1.name='Frankfurt(Main)Hbf' AND s2.name != 'Bonn Hbf'
    ON CONFLICT DO NOTHING;
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

