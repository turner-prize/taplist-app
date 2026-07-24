<script setup>
import { ref, onMounted } from 'vue'

const beers = ref([])
const taps = ref([])
const selectedTap = ref(null)

const showModal = ref(false)
const editingBeer = ref(null)

const search = ref('')

const API_BASE = 'http://192.168.1.109:3000'

// Load data
async function load() {
  beers.value = await fetch(`${API_BASE}/beers`).then(r => r.json())
  taps.value = await fetch(`${API_BASE}/taps`).then(r => r.json())
}

// Assign beer to tap
async function assignBeer(beerId) {
  if (!selectedTap.value) return

  await fetch(`${API_BASE}/taps/${selectedTap.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beer_id: beerId })
  })

  selectedTap.value = null
  load()
}

// Save (add/edit)
async function saveBeer(beer) {
  if (beer.id) {
    await fetch(`${API_BASE}/beers/${beer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(beer)
    })
  } else {
    await fetch(`${API_BASE}/beers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(beer)
    })
  }

  showModal.value = false
  load()
}


// Release Keg
async function releaseKeg(beer) {

  beer.kegNumber = null

  await saveBeer(beer)
}


// Delete
async function deleteBeer(id) {
  if (!confirm('Delete this beer?')) return

  await fetch(`${API_BASE}/beers/${id}`, {
    method: 'DELETE'
  })

  load()
}

// Toggles
async function toggleFinished(beer) {
  beer.finished = beer.finished ? 0 : 1
  await saveBeer(beer)
}

async function toggleFermenting(beer) {
  beer.fermenting = beer.fermenting ? 0 : 1
  beer.conditioning = 0
  await saveBeer(beer)
}

async function toggleConditioning(beer) {
  beer.conditioning = beer.conditioning ? 0 : 1
  beer.fermenting = 0
  await saveBeer(beer)
}

// New beer
function newBeer() {
  editingBeer.value = {
    name: '',
    style: '',
    abv: '',
    ibu: '',
    hops: '',
    description: '',
    dateBrewed: '',
    dateKegged: '',
    finished: 0,
    fermenting: 0,
    conditioning: 0,
    kegNumber: ''
  }
  showModal.value = true
}

// Edit beer
function editBeer(beer) {
  editingBeer.value = { ...beer }
  showModal.value = true
}

//Clear Tap
async function clearTap() {
  if (!selectedTap.value) return

  await fetch(`${API_BASE}/taps/${selectedTap.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beer_id: null })
  })

  selectedTap.value = null
  load()
}

// Filter
function filteredBeers() {
  return beers.value.filter(b =>
    b.name.toLowerCase().includes(search.value.toLowerCase())
  )
}

onMounted(load)
</script>

<template>
  <div class="container">
    <h1>🍺 Tap Control Panel</h1>

    <!-- ADD -->
    <button class="add-btn" @click="newBeer">+ Add Beer</button>

    <!-- TAPS -->
    <div class="taps">
      <div
        v-for="tap in taps"
        :key="tap.id"
        class="tap"
        :class="{ active: selectedTap === tap.id }"
        @click="selectedTap = tap.id"
      >
        <div>Tap {{ tap.id }}</div>
        <div>{{ tap.beerName || 'Empty' }}</div>
      </div>
    </div>

<button 
  v-if="selectedTap" 
  class="clear-btn"
  @click="clearTap"
>
  Clear Tap {{ selectedTap }}
</button>

    <input v-model="search" placeholder="Search beers..." class="search" />

    <!-- BEERS -->
    <div class="beer-list">
      <div v-for="beer in filteredBeers()" :key="beer.id" class="beer">

        <div class="beer-main" @click="assignBeer(beer.id)">
          <strong :class="{ finished: beer.finished }">{{ beer.name }}</strong>
          <div>{{ beer.style }} | {{ beer.abv }}%</div>
        </div>

        <div class="actions">
          <button @click.stop="editBeer(beer)">Edit</button>
          <button @click.stop="toggleFinished(beer)">
            {{ beer.finished ? 'Unfinish' : 'Finish' }}
          </button>
<button
  v-if="beer.kegNumber"
  @click.stop="releaseKeg(beer)"
>
  Release Keg {{ beer.kegNumber }}
</button>
          <button @click.stop="toggleFermenting(beer)">
            {{ beer.fermenting ? 'Stop Fermenting' : 'Fermenting' }}
          </button>

          <button @click.stop="toggleConditioning(beer)">
            {{ beer.conditioning ? 'Stop Conditioning' : 'Conditioning' }}
          </button>

          <button @click.stop="deleteBeer(beer.id)">Delete</button>
        </div>

      </div>
    </div>


<!-- MODAL -->
<div v-if="showModal" class="modal">
  <div class="modal-content">

    <h2>
      {{ editingBeer.id ? 'Edit Beer' : 'Add Beer' }}
    </h2>

    <div class="form-grid">

      <!-- LEFT COLUMN -->
      <div class="form-section">

        <div>
          <label>Name</label>
          <input v-model="editingBeer.name" placeholder="Beer Name" />
        </div>

        <div>
          <label>Style</label>
          <input v-model="editingBeer.style" placeholder="Style" />
        </div>

        <div>
          <label>ABV</label>
          <input
            v-model="editingBeer.abv"
            type="number"
            step="0.1"
            placeholder="5.2"
          />
        </div>

        <div>
          <label>IBU</label>
          <input
            v-model="editingBeer.ibu"
            type="number"
            placeholder="40"
          />
        </div>

        <div>
          <label>Keg Number</label>
          <input
            v-model="editingBeer.kegNumber"
            type="number"
            min="1"
            max="6"
            placeholder="1-6"
          />
        </div>

      </div>

      <!-- RIGHT COLUMN -->
      <div class="form-section">

        <div class="date-group">
          <label>Date Brewed</label>
          <input type="date" v-model="editingBeer.dateBrewed" />
        </div>

        <div class="date-group">
          <label>Date Kegged</label>
          <input type="date" v-model="editingBeer.dateKegged" />
        </div>

        <div class="checkbox-group">

          <label class="stage-fermenting">
            <input
              type="checkbox"
              v-model="editingBeer.fermenting"
              true-value="1"
              false-value="0"
            />
            Fermenting
          </label>

          <label class="stage-conditioning">
            <input
              type="checkbox"
              v-model="editingBeer.conditioning"
              true-value="1"
              false-value="0"
            />
            Conditioning
          </label>

          <label class="stage-finished">
            <input
              type="checkbox"
              v-model="editingBeer.finished"
              true-value="1"
              false-value="0"
            />
            Finished
          </label>

        </div>

      </div>

      <!-- FULL WIDTH HOPS -->
      <div class="form-section full-width">
        <div>
          <label>Hops</label>
          <textarea
            v-model="editingBeer.hops"
            placeholder="Citra, Mosaic, Simcoe"
          ></textarea>
        </div>
      </div>

      <!-- FULL WIDTH DESCRIPTION -->
      <div class="form-section full-width">
        <div>
          <label>Description</label>
          <textarea
            v-model="editingBeer.description"
            placeholder="Beer notes, tasting info, recipe details..."
          ></textarea>
        </div>
      </div>

    </div>

    <!-- BUTTONS -->
    <div class="button-row">

      <button
        v-if="editingBeer.id"
        class="delete-btn"
        @click="deleteBeer(editingBeer.id)"
      >
        Delete Beer
      </button>

      <button
        class="cancel-btn"
        @click="showModal = false"
      >
        Cancel
      </button>

      <button
        class="save-btn"
        @click="saveBeer(editingBeer)"
      >
        Save Beer
      </button>

    </div>

  </div>
</div>


  </div>
</template>

<style>

body {
  background: #f5f5f5;
  font-family: Arial, sans-serif;
  color: #111;
}

/* PAGE */
.container {
  padding: 20px;
  max-width: 1200px;
  margin: auto;
}

h1 {
  margin-bottom: 20px;
}

/* ADD BUTTON */
.add-btn {
  width: 100%;
  margin-bottom: 20px;
  padding: 14px;

  background: #2e7d32;
  border: none;
  border-radius: 10px;

  color: white;
  font-size: 1rem;
  font-weight: bold;

  cursor: pointer;
}

/* TAPS */
.taps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  margin-bottom: 20px;
}

.tap {
  background: white;
  border-radius: 12px;
  padding: 16px;

  text-align: center;

  box-shadow:
    0 2px 8px rgba(0,0,0,0.08);

  cursor: pointer;

  transition:
    transform 0.15s ease,
    border 0.2s ease;
}

.tap:hover {
  transform: translateY(-2px);
}

.tap.active {
  border: 3px solid #4caf50;
}

/* CLEAR */
.clear-btn {
  width: 100%;

  margin-bottom: 20px;

  padding: 12px;

  background: #ef5350;

  border: none;
  border-radius: 10px;

  color: white;
  font-weight: bold;

  cursor: pointer;
}

/* SEARCH */
.search {
  width: 100%;

  padding: 14px;

  border-radius: 10px;
  border: 1px solid #ccc;

  margin-bottom: 20px;

  box-sizing: border-box;
}

/* BEERS */
.beer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.beer {
  background: white;

  border-radius: 12px;

  padding: 18px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  box-shadow:
    0 2px 8px rgba(0,0,0,0.08);
}

.beer-main {
  cursor: pointer;
}

.beer-main strong {
  font-size: 1.2rem;
}

.finished {
  text-decoration: line-through;
  opacity: 0.6;
}

/* ACTIONS */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actions button {
  border: none;
  border-radius: 8px;

  padding: 10px 12px;

  cursor: pointer;

  background: #ececec;
}

/* MODAL */
.modal {
  position: fixed;
  inset: 0;

  background: rgba(0,0,0,0.65);

  display: flex;
  justify-content: center;
  align-items: center;

  z-index: 1000;

  backdrop-filter: blur(4px);
}

/* MODAL CONTENT */
.modal-content {
  background: white;

  width: 900px;
  max-width: 95vw;
  max-height: 90vh;

  overflow-y: auto;

  border-radius: 16px;

  padding: 30px;

  box-shadow:
    0 10px 30px rgba(0,0,0,0.2);
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 25px;

  font-size: 1.8rem;
}

/* GRID */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.full-width {
  grid-column: 1 / -1;
}

/* LABELS */
label {
  display: block;

  margin-bottom: 5px;

  font-size: 0.9rem;
  font-weight: bold;

  color: #444;
}

/* INPUTS */
input,
textarea {
  width: 100%;

  padding: 12px;

  border-radius: 10px;
  border: 1px solid #ccc;

  box-sizing: border-box;

  font-size: 1rem;
}

textarea {
  min-height: 120px;
  resize: vertical;
}

/* CHECKBOXES */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 10px;

  padding: 12px;

  border-radius: 10px;
}

.stage-fermenting {
  background: #edf7ed;
}

.stage-conditioning {
  background: #eef5ff;
}

.stage-finished {
  background: #f3f3f3;
}

/* BUTTON ROW */
.button-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  margin-top: 30px;
}

.save-btn {
  background: #2e7d32;
  color: white;
}

.cancel-btn {
  background: #ddd;
}

.delete-btn {
  background: #d32f2f;
  color: white;
}

/* MOBILE */
@media (max-width: 800px) {

  .form-grid {
    grid-template-columns: 1fr;
  }

  .beer {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .actions {
    width: 100%;
  }

  .actions button {
    flex: 1;
  }

  .taps {
    grid-template-columns: repeat(2, 1fr);
  }
}

</style>
