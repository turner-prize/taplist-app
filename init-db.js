const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'taplist.db')

const db = new sqlite3.Database(dbPath)

db.serialize(() => {
  console.log(`Creating development database: ${dbPath}`)



// ======================
// SETTINGS
// ======================

db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`)

// Set default display mode if it doesn't exist
db.run(`
  INSERT OR IGNORE INTO settings (key, value)
  VALUES ('display_mode', 'normal')
`)




  // ======================
  // BEERS
  // ======================

db.run(`
  CREATE TABLE IF NOT EXISTS beers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    style TEXT,
    abv REAL,
    ibu INTEGER,

    yeast TEXT,
    boil_hops TEXT,
    whirlpool_hops TEXT,
    cold_side_hops TEXT,

    description TEXT,
    dateBrewed TEXT,
    dateKegged TEXT,
    finished INTEGER DEFAULT 0,
    fermenting INTEGER DEFAULT 0,
    conditioning INTEGER DEFAULT 0,
    kegNumber INTEGER,

    og REAL,
    fg REAL,
    mash_temp REAL,
    fermentation_temp REAL,
    image TEXT
  )
`)

  // ======================
  // TAPS
  // ======================

  db.run(`
    CREATE TABLE IF NOT EXISTS taps (
      id INTEGER PRIMARY KEY,
      beer_id INTEGER,
      FOREIGN KEY (beer_id) REFERENCES beers(id)
    )
  `)

  // Four taps
  db.run(`
    INSERT OR IGNORE INTO taps (id, beer_id)
    VALUES
      (1, NULL),
      (2, NULL),
      (3, NULL),
      (4, NULL)
  `)

  // ======================
  // KEGS
  // ======================

  db.run(`
    CREATE TABLE IF NOT EXISTS kegs (
      id INTEGER PRIMARY KEY,
      dirty INTEGER DEFAULT 0,
      clean INTEGER DEFAULT 0,
      sanitised INTEGER DEFAULT 0,
      pressurised INTEGER DEFAULT 0,
      lastDeepCleanDate TEXT
    )
  `)

  // Six kegs
  db.run(`
    INSERT OR IGNORE INTO kegs
      (id, dirty, clean, sanitised, pressurised, lastDeepCleanDate)
    VALUES
      (1, 0, 1, 1, 1, NULL),
      (2, 0, 1, 1, 1, NULL),
      (3, 0, 1, 1, 1, NULL),
      (4, 0, 1, 1, 1, NULL),
      (5, 0, 1, 1, 1, NULL),
      (6, 0, 1, 1, 1, NULL)
  `)


  // ======================
// TASTING NOTES
// ======================

db.run(`
  CREATE TABLE IF NOT EXISTS tasting_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beer_id INTEGER NOT NULL,
    note_date TEXT NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY (beer_id) REFERENCES beers(id)
  )
`)

  console.log('Development database created successfully.')
})

db.close(err => {
  if (err) {
    console.error('Error closing database:', err)
    process.exit(1)
  }

  console.log('Database connection closed.')
})