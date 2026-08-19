const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const cors = require('cors')
const path = require('path')

const app = express()

app.use(cors())
app.use(express.json())

// ======================
// DATABASE
// ======================

const db = new sqlite3.Database('./taplist.db')

// ======================
// SETTINGS
// ======================

// GET display mode
app.get('/settings/display-mode', (req, res) => {
  db.get(
    `SELECT value FROM settings WHERE key='display_mode'`,
    (err, row) => {
      if (err) return res.status(500).send(err)

      res.json({
        displayMode: row ? row.value : 'normal'
      })
    }
  )
})

// UPDATE display mode
app.put('/settings/display-mode', (req, res) => {
  const mode = req.body.displayMode

  if (!['normal', 'brewers'].includes(mode)) {
    return res.status(400).json({
      error: 'Invalid display mode'
    })
  }

  db.run(
    `UPDATE settings SET value=? WHERE key='display_mode'`,
    [mode],
    err => {
      if (err) return res.status(500).send(err)

      res.json({
        success: true,
        displayMode: mode
      })
    }
  )
})

// ======================
// BEERS
// ======================

// GET all beers
app.get('/beers', (req, res) => {
  db.all('SELECT * FROM beers', (err, rows) => {
    if (err) return res.status(500).send(err)
    res.json(rows)
  })
})

// ADD beer
app.post('/beers', (req, res) => {
  const b = req.body

  db.run(`
    INSERT INTO beers (
      name,
      style,
      abv,
      ibu,
      description,
      dateBrewed,
      dateKegged,
      finished,
      fermenting,
      conditioning,
      kegNumber,
      og,
      fg,
      mash_temp,
      fermentation_temp,
      yeast,
      boil_hops,
      whirlpool_hops,
      cold_side_hops
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    b.name,
    b.style,
    b.abv,
    b.ibu,
    b.description,
    b.dateBrewed,
    b.dateKegged,
    b.finished ? 1 : 0,
    b.fermenting ? 1 : 0,
    b.conditioning ? 1 : 0,
    b.kegNumber,
    b.og,
    b.fg,
    b.mash_temp,
    b.fermentation_temp,
    b.yeast,
    b.boil_hops,
    b.whirlpool_hops,
    b.cold_side_hops
  ], function (err) {

    if (err) {
      console.error('Error adding beer:', err)
      return res.status(500).send(err)
    }

    res.json({
      id: this.lastID
    })
  })
})


// UPDATE beer
app.put('/beers/:id', (req, res) => {
  const b = req.body
  const id = req.params.id

  db.run(`
    UPDATE beers SET
      name=?,
      style=?,
      abv=?,
      ibu=?,
      description=?,
      dateBrewed=?,
      dateKegged=?,
      finished=?,
      fermenting=?,
      conditioning=?,
      kegNumber=?,
      og=?,
      fg=?,
      mash_temp=?,
      fermentation_temp=?,
      yeast=?,
      boil_hops=?,
      whirlpool_hops=?,
      cold_side_hops=?
    WHERE id=?
  `, [
    b.name,
    b.style,
    b.abv,
    b.ibu,
    b.description,
    b.dateBrewed,
    b.dateKegged,
    b.finished ? 1 : 0,
    b.fermenting ? 1 : 0,
    b.conditioning ? 1 : 0,
    b.kegNumber,
    b.og,
    b.fg,
    b.mash_temp,
    b.fermentation_temp,
    b.yeast,
    b.boil_hops,
    b.whirlpool_hops,
    b.cold_side_hops,
    id
  ], err => {
    if (err) return res.status(500).send(err)

    res.json({
      success: true
    })
  })
})

// DELETE beer
app.delete('/beers/:id', (req, res) => {
  const id = req.params.id

  // Remove from taps first
  db.run(
    `UPDATE taps SET beer_id=NULL WHERE beer_id=?`,
    [id]
  )

  db.run(
    `DELETE FROM beers WHERE id=?`,
    [id],
    err => {
      if (err) return res.status(500).send(err)

      res.json({
        success: true
      })
    }
  )
})

// ======================
// TASTING NOTES
// ======================

// GET tasting notes for a beer
app.get('/beers/:id/tasting-notes', (req, res) => {
  const beerId = req.params.id

  db.all(`
    SELECT *
    FROM tasting_notes
    WHERE beer_id=?
    ORDER BY note_date DESC, id DESC
  `, [beerId], (err, rows) => {
    if (err) return res.status(500).send(err)

    res.json(rows)
  })
})

// ADD tasting note
app.post('/beers/:id/tasting-notes', (req, res) => {
  const beerId = req.params.id
  const { note_date, note } = req.body

  db.run(`
    INSERT INTO tasting_notes (
      beer_id,
      note_date,
      note
    )
    VALUES (?, ?, ?)
  `, [
    beerId,
    note_date,
    note
  ], function (err) {
    if (err) return res.status(500).send(err)

    res.json({
      id: this.lastID
    })
  })
})

// UPDATE tasting note
app.put('/tasting-notes/:id', (req, res) => {
  const { note_date, note } = req.body

  db.run(`
    UPDATE tasting_notes SET
      note_date=?,
      note=?
    WHERE id=?
  `, [
    note_date,
    note,
    req.params.id
  ], err => {
    if (err) return res.status(500).send(err)

    res.json({
      success: true
    })
  })
})

// DELETE tasting note
app.delete('/tasting-notes/:id', (req, res) => {
  db.run(`
    DELETE FROM tasting_notes
    WHERE id=?
  `, [
    req.params.id
  ], err => {
    if (err) return res.status(500).send(err)

    res.json({
      success: true
    })
  })
})

// ======================
// TAPS
// ======================

// GET taps (joined with beer data)
app.get('/taps', (req, res) => {
  db.all(`
    SELECT 
      taps.id,
      taps.beer_id,
      beers.name as beerName,
      beers.style,
      beers.abv,
      beers.ibu,
      beers.description,
      beers.dateBrewed,
      beers.dateKegged,
      beers.finished,
      beers.kegNumber,
      beers.og,
      beers.fg,
      beers.mash_temp,
      beers.fermentation_temp,
      beers.yeast,
      beers.boil_hops,
      beers.whirlpool_hops,
      beers.cold_side_hops
    FROM taps
    LEFT JOIN beers ON taps.beer_id = beers.id
    ORDER BY taps.id
  `, (err, rows) => {
    if (err) return res.status(500).send(err)

    res.json(rows)
  })
})

// Assign OR clear tap
app.post('/taps/:id', (req, res) => {
  db.run(
    `UPDATE taps SET beer_id=? WHERE id=?`,
    [
      req.body.beer_id,
      req.params.id
    ],
    err => {
      if (err) return res.status(500).send(err)

      res.json({
        success: true
      })
    }
  )
})

// ======================
// BREWING STAGES
// ======================

// Fermenting beers
app.get('/beers/fermenting', (req, res) => {
  db.all(
    `SELECT * FROM beers WHERE fermenting=1`,
    (err, rows) => {
      if (err) return res.status(500).send(err)

      res.json(rows)
    }
  )
})

// Conditioning beers
app.get('/beers/conditioning', (req, res) => {
  db.all(
    `SELECT * FROM beers WHERE conditioning=1`,
    (err, rows) => {
      if (err) return res.status(500).send(err)

      res.json(rows)
    }
  )
})

// ======================
// KEG MANAGEMENT
// ======================

// GET kegs
app.get('/api/kegs', (req, res) => {
  db.all(`
    SELECT
      kegs.*,
      beers.name as beerName,
      beers.style,
      taps.id as tapNumber
    FROM kegs
    LEFT JOIN beers ON beers.kegNumber = kegs.id
    LEFT JOIN taps ON taps.beer_id = beers.id
    ORDER BY kegs.id
  `, (err, rows) => {
    if (err) return res.status(500).send(err)

    res.json(rows)
  })
})

// UPDATE kegs
app.put('/api/kegs/:id', (req, res) => {
  const k = req.body

  db.run(`
    UPDATE kegs SET
      dirty=?,
      clean=?,
      sanitised=?,
      pressurised=?,
      lastDeepCleanDate=?
    WHERE id=?
  `, [
    k.dirty ? 1 : 0,
    k.clean ? 1 : 0,
    k.sanitised ? 1 : 0,
    k.pressurised ? 1 : 0,
    k.lastDeepCleanDate,
    req.params.id
  ], err => {
    if (err) return res.status(500).send(err)

    res.json({
      success: true
    })
  })
})

// ======================
// FRONTEND
// ======================

// Serve built Vue app
app.use(
  express.static(
    path.join(__dirname, 'frontend/dist')
  )
)

// Vue router fallback
app.use((req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      'frontend/dist/index.html'
    )
  )
})

// ======================
// START SERVER
// ======================

app.listen(3000, '0.0.0.0', () => {
  console.log('🍺 Taplist server running on port 3000')
})