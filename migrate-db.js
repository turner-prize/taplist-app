const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, 'taplist.db')
const backupPath = path.join(__dirname, 'taplist.db.before-migration')

console.log('========================================')
console.log(' Taplist Database Migration')
console.log('========================================')
console.log()

// ======================
// CHECK DATABASE EXISTS
// ======================

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`)
  process.exit(1)
}


// ======================
// CREATE BACKUP
// ======================

if (fs.existsSync(backupPath)) {
  console.error(
    `Backup already exists: ${backupPath}`
  )

  console.error(
    'Delete/rename the existing backup if you want to run the migration again.'
  )

  process.exit(1)
}

console.log('Creating database backup...')

fs.copyFileSync(
  dbPath,
  backupPath
)

console.log(`Backup created: ${backupPath}`)
console.log()


// ======================
// OPEN DATABASE
// ======================

const db = new sqlite3.Database(dbPath)


// ======================
// HELPERS
// ======================

function getColumns(table) {
  return new Promise((resolve, reject) => {

    db.all(
      `PRAGMA table_info(${table})`,
      [],
      (err, rows) => {

        if (err) {
          reject(err)
          return
        }

        resolve(
          rows.map(row => row.name)
        )
      }
    )
  })
}


function addColumn(table, column, definition) {

  return new Promise((resolve, reject) => {

    console.log(
      `Adding ${table}.${column}...`
    )

    db.run(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
      [],
      err => {

        if (err) {
          reject(err)
          return
        }

        console.log(
          `  Added ${column}`
        )

        resolve()
      }
    )
  })
}


// ======================
// MIGRATION
// ======================

db.serialize(async () => {

  try {

    console.log('Checking database schema...')
    console.log()


    // ======================
    // SETTINGS
    // ======================

    console.log('Checking settings table...')

    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)

    db.run(`
      INSERT OR IGNORE INTO settings
        (key, value)
      VALUES
        ('display_mode', 'normal')
    `)

    console.log('Settings OK')
    console.log()


    // ======================
    // BEERS
    // ======================

    console.log('Checking beers table...')

    const beerColumns =
      await getColumns('beers')

    console.log(
      'Existing beer columns:',
      beerColumns.join(', ')
    )

    // New hop columns

    if (!beerColumns.includes('boil_hops')) {

      await addColumn(
        'beers',
        'boil_hops',
        'TEXT'
      )
    }

    if (!beerColumns.includes('whirlpool_hops')) {

      await addColumn(
        'beers',
        'whirlpool_hops',
        'TEXT'
      )
    }

    if (!beerColumns.includes('cold_side_hops')) {

      await addColumn(
        'beers',
        'cold_side_hops',
        'TEXT'
      )
    }


    // New brewing fields

    if (!beerColumns.includes('mash_temp')) {

      await addColumn(
        'beers',
        'mash_temp',
        'REAL'
      )
    }

    if (!beerColumns.includes('fermentation_temp')) {

      await addColumn(
        'beers',
        'fermentation_temp',
        'REAL'
      )
    }


    // Yeast

    if (!beerColumns.includes('yeast')) {

      await addColumn(
        'beers',
        'yeast',
        'TEXT'
      )
    }


    console.log()
    console.log('Beer schema updated.')
    console.log()


    // ======================
    // MIGRATE OLD HOPS
    // ======================

    console.log('Checking old hops data...')

    const updatedBeerColumns =
      await getColumns('beers')

    if (
      updatedBeerColumns.includes('hops') &&
      updatedBeerColumns.includes('cold_side_hops')
    ) {

      console.log(
        'Copying existing hops into cold_side_hops...'
      )

      await new Promise((resolve, reject) => {

        db.run(`
          UPDATE beers
          SET cold_side_hops = hops
          WHERE
            (cold_side_hops IS NULL
             OR cold_side_hops = '')
            AND hops IS NOT NULL
            AND hops != ''
        `, [], err => {

          if (err) {
            reject(err)
            return
          }

          console.log(
            'Existing hop data preserved.'
          )

          resolve()
        })
      })
    }


    // ======================
    // TASTING NOTES
    // ======================

    console.log()
    console.log('Checking tasting_notes table...')

    db.run(`
      CREATE TABLE IF NOT EXISTS tasting_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        beer_id INTEGER NOT NULL,
        note_date TEXT NOT NULL,
        note TEXT NOT NULL,
        FOREIGN KEY (beer_id)
          REFERENCES beers(id)
          ON DELETE CASCADE
      )
    `)

    console.log(
      'Tasting notes table OK.'
    )


    // ======================
    // TAPS
    // ======================

    console.log()
    console.log('Checking taps table...')

    db.run(`
      CREATE TABLE IF NOT EXISTS taps (
        id INTEGER PRIMARY KEY,
        beer_id INTEGER,
        FOREIGN KEY (beer_id)
          REFERENCES beers(id)
      )
    `)

    // Make sure four taps exist

    db.run(`
      INSERT OR IGNORE INTO taps
        (id, beer_id)
      VALUES
        (1, NULL),
        (2, NULL),
        (3, NULL),
        (4, NULL)
    `)

    console.log('Taps OK.')


    // ======================
    // KEGS
    // ======================

    console.log()
    console.log('Checking kegs table...')

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

    // Make sure six kegs exist

    db.run(`
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
    `)

    console.log('Kegs OK.')


    // ======================
    // FINISH
    // ======================

    console.log()
    console.log('========================================')
    console.log(' Migration completed successfully!')
    console.log('========================================')
    console.log()
    console.log(`Database: ${dbPath}`)
    console.log(`Backup:   ${backupPath}`)
    console.log()

    console.log(
      'Existing beers, taps and kegs have been preserved.'
    )

    console.log(
      'Existing hops have been copied to cold_side_hops.'
    )

    console.log()


  } catch (err) {

    console.error()
    console.error('========================================')
    console.error(' MIGRATION FAILED')
    console.error('========================================')
    console.error()

    console.error(err)

    console.error()
    console.error(
      'Your original database has NOT been deleted.'
    )

    console.error(
      `A backup exists at: ${backupPath}`
    )

    process.exitCode = 1

  }

})


// ======================
// CLOSE DATABASE
// ======================

db.close(err => {

  if (err) {

    console.error(
      'Error closing database:',
      err
    )

    process.exitCode = 1

    return
  }

  console.log(
    'Database connection closed.'
  )
})