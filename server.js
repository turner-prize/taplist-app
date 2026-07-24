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
      name, style, abv, ibu, hops, description,
      dateBrewed, dateKegged,
      finished, fermenting, conditioning,kegNumber
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    b.name,
    b.style,
    b.abv,
    b.ibu,
    b.hops,
    b.description,
    b.dateBrewed,
    b.dateKegged,
    b.finished ? 1 : 0,
    b.fermenting ? 1 : 0,
    b.conditioning ? 1 : 0,
    b.kegNumber
  ], function (err) {
    if (err) return res.status(500).send(err)
    res.json({ id: this.lastID })
  })
})

// UPDATE beer
app.put('/beers/:id', (req, res) => {
  const b = req.body
  const id = req.params.id

  db.run(`
    UPDATE beers SET
      name=?, style=?, abv=?, ibu=?, hops=?, description=?,
      dateBrewed=?, dateKegged=?,
      finished=?, fermenting=?, conditioning=?, kegNumber=?
    WHERE id=?
  `, [
    b.name,
    b.style,
    b.abv,
    b.ibu,
    b.hops,
    b.description,
    b.dateBrewed,
    b.dateKegged,
    b.finished ? 1 : 0,
    b.fermenting ? 1 : 0,
    b.conditioning ? 1 : 0,
    b.kegNumber,
    id
  ], err => {
    if (err) return res.status(500).send(err)
    res.json({ success: true })
  })
})

// DELETE beer
app.delete('/beers/:id', (req, res) => {
  const id = req.params.id

  // Remove from taps first
  db.run(`UPDATE taps SET beer_id=NULL WHERE beer_id=?`, [id])

  db.run(`DELETE FROM beers WHERE id=?`, [id], err => {
    if (err) return res.status(500).send(err)
    res.json({ success: true })
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
      beers.hops,
      beers.description,
      beers.dateBrewed,
      beers.dateKegged,
      beers.finished,
      beers.kegNumber
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
    [req.body.beer_id, req.params.id],
    err => {
      if (err) return res.status(500).send(err)
      res.json({ success: true })
    }
  )
})

// ======================
// BREWING STAGES
// ======================

// Fermenting beers
app.get('/beers/fermenting', (req, res) => {
  db.all(`SELECT * FROM beers WHERE fermenting=1`, (err, rows) => {
    if (err) return res.status(500).send(err)
    res.json(rows)
  })
})

// Conditioning beers
app.get('/beers/conditioning', (req, res) => {
  db.all(`SELECT * FROM beers WHERE conditioning=1`, (err, rows) => {
    if (err) return res.status(500).send(err)
    res.json(rows)
  })
})


// ======================
// KEG MANAGEMENT
// ======================

//get kegs
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

//update kegs

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
    res.json({ success: true })
  })
})




// ======================
// FRONTEND (VERY IMPORTANT - MUST BE LAST)
// ======================

// Serve built Vue app
app.use(express.static(path.join(__dirname, 'frontend/dist')))

// Vue router fallback
// Catch-all (SAFE VERSION)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'))
})

// ======================
// START SERVER
// ======================

app.listen(3000, '0.0.0.0', () => {
  console.log('🍺 Taplist server running on port 3000')
})
