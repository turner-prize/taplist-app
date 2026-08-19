const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const sqlPath = path.join(__dirname, 'init.sql')
const dbPath = path.join(__dirname, '..', 'taplist.db')

if (!fs.existsSync(sqlPath)) {
  console.error('init.sql not found')
  process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf8')
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Failed to open database:', err)
    process.exit(1)
  }
})

db.exec(sql, err => {
  if (err) {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  }

  console.log('✅ taplist.db initialized or already up-to-date')
  db.close()
})
