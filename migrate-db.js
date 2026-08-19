const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, 'taplist.db')
const backupPath = path.join(
  __dirname,
  'taplist.db.before-migration'
)


// ======================
// HELPERS
// ======================

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err)
        return
      }

      resolve(this)
    })
  })
}


function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err)
        return
      }

      resolve(rows)
    })
  })
}


function close(db) {
  return new Promise((resolve, reject) => {
    db.close(err => {
      if (err) {
        reject(err)
        return
      }

      resolve()
    })
  })
}


async function getColumns(db, table) {

  const rows = await all(
    db,
    `PRAGMA table_info(${table})`
  )

  return rows.map(row => row.name)
}


async function addColumn(
  db,
  table,
  column,
  definition
) {

  console.log(
    `Adding ${table}.${column}...`
  )

  await run(
    db,
    `
      ALTER TABLE ${table}
      ADD COLUMN ${column} ${definition}
    `
  )

  console.log(
    `  Added ${column}`
  )
}


// ======================
// MAIN MIGRATION
// ======================

async function migrate() {

  console.log('========================================')
  console.log(' Taplist Database Migration')
  console.log('========================================')
  console.log()


  // ======================
  // CHECK DATABASE
  // ======================

  if (!fs.existsSync(dbPath)) {

    throw new Error(
      `Database not found: ${dbPath}`
    )
  }


  // ======================
  // CREATE BACKUP
  // ======================

  if (fs.existsSync(backupPath)) {

    throw new Error(
      `Backup already exists: ${backupPath}`
    )
  }

  console.log(
    'Creating database backup...'
  )

  fs.copyFileSync(
    dbPath,
    backupPath
  )

  console.log(
    `Backup created: ${backupPath}`
  )

  console.log()


  // ======================
  // OPEN DATABASE
  // ======================

  const db = new sqlite3.Database(
    dbPath
  )


  try {

    // ======================
    // SETTINGS
    // ======================

    console.log(
      'Checking settings table...'
    )

    await run(
      db,
      `
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `
    )

    await run(
      db,
      `
        INSERT OR IGNORE INTO settings
          (key, value)
        VALUES
          ('display_mode', 'normal')
      `
    )

    console.log(
      'Settings OK'
    )

    console.log()


    // ======================
    // BEERS
    // ======================

    console.log(
      'Checking beers table...'
    )

    let beerColumns =
      await getColumns(db, 'beers')

    console.log(
      'Existing beer columns:',
      beerColumns.join(', ')
    )


    // ----------------------
    // HOPS
    // ----------------------

    if (!beerColumns.includes('boil_hops')) {

      await addColumn(
        db,
        'beers',
        'boil_hops',
        'TEXT'
      )

    }


    if (!beerColumns.includes('whirlpool_hops')) {

      await addColumn(
        db,
        'beers',
        'whirlpool_hops',
        'TEXT'
      )

    }


    if (!beerColumns.includes('cold_side_hops')) {

      await addColumn(
        db,
        'beers',
        'cold_side_hops',
        'TEXT'
      )

    }


    // ----------------------
    // BREWING DATA
    // ----------------------

    if (!beerColumns.includes('mash_temp')) {

      await addColumn(
        db,
        'beers',
        'mash_temp',
        'REAL'
      )

    }


    if (
      !beerColumns.includes(
        'fermentation_temp'
      )
    ) {

      await addColumn(
        db,
        'beers',
        'fermentation_temp',
        'REAL'
      )

    }


    if (!beerColumns.includes('yeast')) {

      await addColumn(
        db,
        'beers',
        'yeast',
        'TEXT'
      )

    }


    // Refresh column list

    beerColumns =
      await getColumns(db, 'beers')


    console.log()
    console.log(
      'Beer schema updated.'
    )


    // ======================
    // MIGRATE OLD HOPS
    // ======================

    if (
      beerColumns.includes('hops') &&
      beerColumns.includes('cold_side_hops')
    ) {

      console.log()
      console.log(
        'Preserving existing hop data...'
      )

      await run(
        db,
        `
          UPDATE beers
          SET cold_side_hops = hops
          WHERE
            (
              cold_side_hops IS NULL
              OR cold_side_hops = ''
            )
            AND hops IS NOT NULL
            AND hops != ''
        `
      )

      console.log(
        'Existing hops copied to cold_side_hops.'
      )
    }


    // ======================
    // TASTING NOTES
    // ======================

    console.log()
    console.log(
      'Checking tasting_notes table...'
    )

    await run(
      db,
      `
        CREATE TABLE IF NOT EXISTS tasting_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          beer_id INTEGER NOT NULL,
          note_date TEXT NOT NULL,
          note TEXT NOT NULL,
          FOREIGN KEY (beer_id)
            REFERENCES beers(id)
            ON DELETE CASCADE
        )
      `
    )

    console.log(
      'Tasting notes OK.'
    )


    // ======================
    // TAPS
    // ======================

    console.log()
    console.log(
      'Checking taps table...'
    )

    await run(
      db,
      `
        CREATE TABLE IF NOT EXISTS taps (
          id INTEGER PRIMARY KEY,
          beer_id INTEGER,
          FOREIGN KEY (beer_id)
            REFERENCES beers(id)
        )
      `
    )

    await run(
      db,
      `
        INSERT OR IGNORE INTO taps
          (id, beer_id)
        VALUES
          (1, NULL),
          (2, NULL),
          (3, NULL),
          (4, NULL)
      `
    )

    console.log(
      'Taps OK.'
    )


    // ======================
    // KEGS
    // ======================

    console.log()
    console.log(
      'Checking kegs table...'
    )

    await run(
      db,
      `
        CREATE TABLE IF NOT EXISTS kegs (
          id INTEGER PRIMARY KEY,
          dirty INTEGER DEFAULT 0,
          clean INTEGER DEFAULT 0,
          sanitised INTEGER DEFAULT 0,
          pressurised INTEGER DEFAULT 0,
          lastDeepCleanDate TEXT
        )
      `
    )

    await run(
      db,
      `
        INSERT OR IGNORE INTO kegs
          (
            id,
            dirty,
            clean,
            sanitised,
            pressurised,
            lastDeepCleanDate
          )
        VALUES
          (1, 0, 1, 1, 1, NULL),
          (2, 0, 1, 1, 1, NULL),
          (3, 0, 1, 1, 1, NULL),
          (4, 0, 1, 1, 1, NULL),
          (5, 0, 1, 1, 1, NULL),
          (6, 0, 1, 1, 1, NULL)
      `
    )

    console.log(
      'Kegs OK.'
    )


    // ======================
    // SUCCESS
    // ======================

    console.log()
    console.log('========================================')
    console.log(' Migration completed successfully!')
    console.log('========================================')
    console.log()

    console.log(
      'Existing beers, taps and kegs preserved.'
    )

    console.log(
      'Existing hops copied to cold_side_hops.'
    )

    console.log(
      `Backup: ${backupPath}`
    )

  } finally {

    // IMPORTANT:
    // Only close the DB after ALL
    // migration operations have finished.

    await close(db)

    console.log()
    console.log(
      'Database connection closed.'
    )
  }
}


// ======================
// RUN
// ======================

migrate()
  .catch(err => {

    console.error()
    console.error('========================================')
    console.error(' MIGRATION FAILED')
    console.error('========================================')
    console.error()

    console.error(err)

    console.error()
    console.error(
      'Your backup is available at:'
    )

    console.error(
      backupPath
    )

    process.exitCode = 1
  })