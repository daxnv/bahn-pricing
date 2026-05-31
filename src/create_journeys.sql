CREATE TABLE IF NOT EXISTS journeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin INTEGER NOT NULL,
    destination INTEGER NOT NULL,
    FOREIGN KEY (origin) REFERENCES stations(id),
    FOREIGN KEY (destination) REFERENCES stations(id),
    UNIQUE (origin, destination)
);

INSERT INTO journeys (origin, destination)
SELECT s1.id, s2.id
FROM stations s1, stations s2
WHERE s1.name='Bonn Hbf' AND s2.name='Karlsruhe Hbf'
ON CONFLICT DO NOTHING;

INSERT INTO journeys (origin, destination)
SELECT s1.id, s2.id
FROM stations s1
JOIN stations s2 ON s1.id != s2.id
WHERE s1.name='Karlsruhe Hbf'
ON CONFLICT DO NOTHING;

INSERT INTO journeys (origin, destination)
SELECT s1.id, s2.id
FROM stations s1
JOIN stations s2 ON s1.id != s2.id
WHERE s1.name='Köln Hbf' AND s2.name != 'Bonn Hbf'
ON CONFLICT DO NOTHING;

INSERT INTO journeys (origin, destination)
SELECT s1.id, s2.id
FROM stations s1
JOIN stations s2 ON s1.id != s2.id
WHERE s1.name='München Hbf' AND s2.name NOT IN ('Bonn Hbf','Hamburg Hbf')
ON CONFLICT DO NOTHING;


INSERT INTO journeys (origin, destination)
SELECT s1.id, s2.id
FROM stations s1
JOIN stations s2 ON s1.id != s2.id
WHERE s1.name='Hamburg Hbf' AND s2.name NOT IN ('Bonn Hbf','München Hbf')
ON CONFLICT DO NOTHING;

INSERT INTO journeys (origin, destination)
SELECT s1.id, s2.id
FROM stations s1
JOIN stations s2 ON s1.id != s2.id
WHERE s1.name='Berlin Hbf' AND s2.name != 'Bonn Hbf'
ON CONFLICT DO NOTHING;

INSERT INTO journeys (origin, destination)
SELECT s1.id, s2.id
FROM stations s1
JOIN stations s2 ON s1.id != s2.id
WHERE s1.name='Hannover Hbf' AND s2.name != 'Bonn Hbf'
ON CONFLICT DO NOTHING;

INSERT INTO journeys (origin, destination)
SELECT s1.id, s2.id
FROM stations s1
JOIN stations s2 ON s1.id != s2.id
WHERE s1.name='Frankfurt(Main)Hbf' AND s2.name != 'Bonn Hbf'
ON CONFLICT DO NOTHING;

