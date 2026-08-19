-- Schema and seed for taplist.db
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS beers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  style TEXT,
  abv REAL,
  ibu REAL,
  hops TEXT,
  description TEXT,
  dateBrewed TEXT,
  dateKegged TEXT,
  finished INTEGER DEFAULT 0,
  fermenting INTEGER DEFAULT 0,
  conditioning INTEGER DEFAULT 0,
  kegNumber INTEGER
);

CREATE TABLE IF NOT EXISTS taps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  beer_id INTEGER,
  FOREIGN KEY(beer_id) REFERENCES beers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS kegs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dirty INTEGER DEFAULT 0,
  clean INTEGER DEFAULT 0,
  sanitised INTEGER DEFAULT 0,
  pressurised INTEGER DEFAULT 0,
  lastDeepCleanDate TEXT
);

-- Seed a few taps and kegs for initial display
INSERT INTO taps (id, beer_id) SELECT 1, NULL WHERE NOT EXISTS(SELECT 1 FROM taps WHERE id=1);
INSERT INTO taps (id, beer_id) SELECT 2, NULL WHERE NOT EXISTS(SELECT 1 FROM taps WHERE id=2);
INSERT INTO taps (id, beer_id) SELECT 3, NULL WHERE NOT EXISTS(SELECT 1 FROM taps WHERE id=3);

INSERT INTO kegs (id, dirty, clean, sanitised, pressurised, lastDeepCleanDate)
SELECT 1, 0, 1, 1, 1, NULL WHERE NOT EXISTS(SELECT 1 FROM kegs WHERE id=1);
INSERT INTO kegs (id, dirty, clean, sanitised, pressurised, lastDeepCleanDate)
SELECT 2, 1, 0, 0, 0, NULL WHERE NOT EXISTS(SELECT 1 FROM kegs WHERE id=2);
