<script setup>
import { ref, onMounted, computed } from 'vue'

const beers = ref([])
const taps = ref([])
const selectedTap = ref(null)

const showModal = ref(false)
const editingBeer = ref(null)

const search = ref('')
const displayMode = ref('normal')

// ======================
// TASTING NOTES
// ======================

const showTastingModal = ref(false)
const tastingBeer = ref(null)
const tastingNotes = ref([])

const newNoteDate = ref('')
const newNoteText = ref('')

const selectedImage = ref(null)
const imagePreview = ref(null)

const API_BASE = import.meta.env.VITE_API_BASE


// ======================
// BREWING CALCULATIONS
// ======================

function calculateAbv(beer) {
  const og = parseFloat(beer?.og)
  const fg = parseFloat(beer?.fg)

  if (!isNaN(og) && !isNaN(fg) && og > fg) {
    return ((og - fg) * 131.25).toFixed(2)
  }

  if (
    beer?.abv !== null &&
    beer?.abv !== undefined &&
    beer?.abv !== ''
  ) {
    return Number(beer.abv).toFixed(1)
  }

  return null
}

const calculatedAbv = computed(() => {
  return calculateAbv(editingBeer.value)
})

const calculatedBuGu = computed(() => {
  const og = parseFloat(editingBeer.value?.og)
  const ibu = parseFloat(editingBeer.value?.ibu)

  if (!isNaN(og) && !isNaN(ibu) && og > 1) {
    const gu = (og - 1) * 1000
    return (ibu / gu).toFixed(2)
  }

  return null
})


// ======================
// DISPLAY MODE
// ======================

async function loadDisplayMode() {
  const response = await fetch(
    `${API_BASE}/settings/display-mode`
  )

  const data = await response.json()

  displayMode.value = data.displayMode
}

async function setDisplayMode(mode) {
  await fetch(
    `${API_BASE}/settings/display-mode`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayMode: mode
      })
    }
  )

  displayMode.value = mode
}


// ======================
// LOAD DATA
// ======================

async function load() {
  beers.value = await fetch(
    `${API_BASE}/beers`
  ).then(r => r.json())

  taps.value = await fetch(
    `${API_BASE}/taps`
  ).then(r => r.json())
}


// ======================
// TAP MANAGEMENT
// ======================

// Assign beer to tap
async function assignBeer(beerId) {
  if (!selectedTap.value) return

  await fetch(
    `${API_BASE}/taps/${selectedTap.value}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        beer_id: beerId
      })
    }
  )

  selectedTap.value = null

  load()
}


// Clear tap
async function clearTap() {
  if (!selectedTap.value) return

  await fetch(
    `${API_BASE}/taps/${selectedTap.value}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        beer_id: null
      })
    }
  )

  selectedTap.value = null

  load()
}


// ======================
// BEER MANAGEMENT
// ======================

async function saveBeer(beer) {

  let beerId = beer.id

  // ======================
  // SAVE BEER
  // ======================

  if (beerId) {

    await fetch(
      `${API_BASE}/beers/${beerId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(beer)
      }
    )

  } else {

    const response = await fetch(
      `${API_BASE}/beers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(beer)
      }
    )

    const data = await response.json()

    beerId = data.id
  }


  // ======================
  // UPLOAD IMAGE
  // ======================

  if (selectedImage.value && beerId) {

    const formData = new FormData()

    formData.append(
      'image',
      selectedImage.value
    )

    await fetch(
      `${API_BASE}/beers/${beerId}/image`,
      {
        method: 'POST',
        body: formData
      }
    )
  }


  // ======================
  // CLOSE
  // ======================

  selectedImage.value = null
  imagePreview.value = null

  showModal.value = false

  await load()
}


// New beer
function newBeer() {

  editingBeer.value = {
    name: '',
    style: '',
    abv: '',
    ibu: '',
    og: '',
    fg: '',
    mash_temp: '',
    fermentation_temp: '',
    hops: '',
    description: '',
    dateBrewed: '',
    dateKegged: '',
    finished: 0,
    fermenting: 0,
    conditioning: 0,
    kegNumber: '',
    yeast: '',
    boil_hops: '',
    whirlpool_hops: '',
    cold_side_hops: ''
  }

  showModal.value = true
  selectedImage.value = null
  imagePreview.value = null
}


// Edit beer
function editBeer(beer) {

  editingBeer.value = {
    ...beer
  }

  selectedImage.value = null

  imagePreview.value =
    beer.image
      ? `${API_BASE}/uploads/${beer.image}`
      : null

  showModal.value = true
}

function selectImage(event) {

  const file =
    event.target.files?.[0]

  if (!file) return

  selectedImage.value = file

  imagePreview.value =
    URL.createObjectURL(file)
}

async function removeBeerImage() {

  if (!editingBeer.value?.id) {

    selectedImage.value = null
    imagePreview.value = null

    return
  }

  await fetch(
    `${API_BASE}/beers/${editingBeer.value.id}/image`,
    {
      method: 'DELETE'
    }
  )

  editingBeer.value.image = null
  selectedImage.value = null
  imagePreview.value = null
}


// Release keg
async function releaseKeg(beer) {

  beer.kegNumber = null

  await saveBeer(beer)
}


// Delete beer
async function deleteBeer(id) {

  if (!confirm('Delete this beer?')) return

  await fetch(
    `${API_BASE}/beers/${id}`,
    {
      method: 'DELETE'
    }
  )

  showModal.value = false

  load()
}


// Toggle finished
async function toggleFinished(beer) {

  beer.finished = beer.finished ? 0 : 1

  await saveBeer(beer)
}


// ======================
// TASTING NOTES
// ======================

// Get today's date in local YYYY-MM-DD format
function getTodayDate() {

  const today = new Date()

  const year = today.getFullYear()
  const month = String(
    today.getMonth() + 1
  ).padStart(2, '0')

  const day = String(
    today.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}


// Open tasting notes popup
async function openTastingNotes(beer) {

  tastingBeer.value = beer

  tastingNotes.value = []

  newNoteDate.value = getTodayDate()
  newNoteText.value = ''

  showTastingModal.value = true

  await loadTastingNotes(beer.id)
}


// Load tasting notes
async function loadTastingNotes(beerId) {

  tastingNotes.value = await fetch(
    `${API_BASE}/beers/${beerId}/tasting-notes`
  ).then(r => r.json())
}


// Add tasting note
async function addTastingNote() {

  if (!tastingBeer.value?.id) return

  if (
    !newNoteDate.value ||
    !newNoteText.value.trim()
  ) {
    return
  }

  await fetch(
    `${API_BASE}/beers/${tastingBeer.value.id}/tasting-notes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        note_date: newNoteDate.value,
        note: newNoteText.value.trim()
      })
    }
  )

  newNoteDate.value = getTodayDate()
  newNoteText.value = ''

  await loadTastingNotes(
    tastingBeer.value.id
  )
}


// Edit tasting note
function editTastingNote(note) {

  const newDate = prompt(
    'Date:',
    note.note_date
  )

  if (newDate === null) return

  const newText = prompt(
    'Tasting note:',
    note.note
  )

  if (newText === null) return

  updateTastingNote(
    note.id,
    newDate,
    newText
  )
}


// Update tasting note
async function updateTastingNote(
  id,
  note_date,
  note
) {

  await fetch(
    `${API_BASE}/tasting-notes/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        note_date,
        note
      })
    }
  )

  await loadTastingNotes(
    tastingBeer.value.id
  )
}


// Delete tasting note
async function deleteTastingNote(id) {

  if (!confirm('Delete this tasting note?')) {
    return
  }

  await fetch(
    `${API_BASE}/tasting-notes/${id}`,
    {
      method: 'DELETE'
    }
  )

  await loadTastingNotes(
    tastingBeer.value.id
  )
}


// Close tasting notes
function closeTastingNotes() {

  showTastingModal.value = false

  tastingBeer.value = null
  tastingNotes.value = []

  newNoteDate.value = ''
  newNoteText.value = ''
}


// ======================
// FILTER
// ======================

function filteredBeers() {

  return beers.value.filter(b =>
    b.name
      ?.toLowerCase()
      .includes(
        search.value.toLowerCase()
      )
  )
}


// ======================
// STARTUP
// ======================

onMounted(() => {

  load()
  loadDisplayMode()

})
</script>


<template>

  <div class="container">

    <h1>🍺 Tap Control Panel</h1>


    <!-- ======================
         DISPLAY MODE
    ====================== -->

    <div class="display-mode">

      <label>Display Board</label>

      <div class="display-mode-buttons">

        <button
          :class="{
            active: displayMode === 'normal'
          }"
          @click="setDisplayMode('normal')"
        >
          Normal
        </button>

        <button
          :class="{
            active: displayMode === 'brewers'
          }"
          @click="setDisplayMode('brewers')"
        >
          Brewers
        </button>

      </div>

    </div>


    <!-- ======================
         ADD BEER
    ====================== -->

    <button
      class="add-btn"
      @click="newBeer"
    >
      + Add Beer
    </button>


    <!-- ======================
         TAPS
    ====================== -->

    <div class="taps">

      <div
        v-for="tap in taps"
        :key="tap.id"
        class="tap"
        :class="{
          active: selectedTap === tap.id
        }"
        @click="selectedTap = tap.id"
      >

        <div>Tap {{ tap.id }}</div>

        <div>
          {{ tap.beerName || 'Empty' }}
        </div>

      </div>

    </div>


    <!-- CLEAR TAP -->

    <button
      v-if="selectedTap"
      class="clear-btn"
      @click="clearTap"
    >
      Clear Tap {{ selectedTap }}
    </button>


    <!-- ======================
         SEARCH
    ====================== -->

    <input
      v-model="search"
      placeholder="Search beers..."
      class="search"
    />


    <!-- ======================
         BEER LIST
    ====================== -->

    <div class="beer-list">

      <div
        v-for="beer in filteredBeers()"
        :key="beer.id"
        class="beer"
      >

        <div
          class="beer-main"
          @click="assignBeer(beer.id)"
        >

          <strong
            :class="{
              finished: beer.finished
            }"
          >
            {{ beer.name }}
          </strong>

          <div>

            {{ beer.style }}

            <span
              v-if="calculateAbv(beer)"
            >
              | {{ calculateAbv(beer) }}%
            </span>

          </div>

        </div>


        <!-- ACTIONS -->

        <div class="actions">

          <button
            @click.stop="editBeer(beer)"
          >
            Edit
          </button>


          <button
            class="tasting-btn"
            @click.stop="openTastingNotes(beer)"
          >
            Tasting Notes
          </button>


          <button
            @click.stop="toggleFinished(beer)"
          >
            {{
              beer.finished
                ? 'Unfinish'
                : 'Finish'
            }}
          </button>


          <button
            v-if="beer.kegNumber"
            @click.stop="releaseKeg(beer)"
          >
            Release Keg {{ beer.kegNumber }}
          </button>


          <button
            class="delete-list-btn"
            @click.stop="deleteBeer(beer.id)"
          >
            Delete
          </button>

        </div>

      </div>

    </div>



    <!-- ==================================================
         EDIT / ADD BEER MODAL
    ================================================== -->

    <div
      v-if="showModal"
      class="modal"
    >

      <div class="modal-content">

        <h2>
          {{
            editingBeer.id
              ? 'Edit Beer'
              : 'Add Beer'
          }}
        </h2>


        <div class="form-grid">


          <!-- ======================
               LEFT COLUMN
          ====================== -->

          <div class="form-section">


            <div>

              <label>Name</label>

              <input
                v-model="editingBeer.name"
                placeholder="Beer Name"
              />

            </div>


            <div>

              <label>Style</label>

              <input
                v-model="editingBeer.style"
                placeholder="Style"
              />

            </div>

            <div class="image-upload">

  <label>Beer Image</label>

  <div
    v-if="imagePreview"
    class="image-preview"
  >
    <img
      :src="imagePreview"
      alt="Beer image"
    />
  </div>

  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    @change="selectImage"
  />

  <button
    v-if="editingBeer.image || imagePreview"
    type="button"
    class="remove-image-btn"
    @click="removeBeerImage"
  >
    Remove Image
  </button>

</div>


            <div>

              <label>ABV Override</label>

              <input
                v-model="editingBeer.abv"
                type="number"
                step="0.1"
                placeholder="5.2"
              />

              <small
                v-if="calculatedAbv"
              >
                Calculated/displayed ABV:
                <strong>
                  {{ calculatedAbv }}%
                </strong>
              </small>

              <small
                v-if="
                  !editingBeer.og ||
                  !editingBeer.fg
                "
              >
                Enter OG and FG to calculate ABV,
                or use the override above.
              </small>

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

              <label>
                Original Gravity (OG)
              </label>

              <input
                v-model="editingBeer.og"
                type="number"
                step="0.001"
                min="1"
                placeholder="1.060"
              />

            </div>


            <div>

              <label>
                Final Gravity (FG)
              </label>

              <input
                v-model="editingBeer.fg"
                type="number"
                step="0.001"
                min="1"
                placeholder="1.010"
              />

            </div>


            <div>

              <label>BU/GU</label>

              <div
                v-if="calculatedBuGu"
                class="calculated-value"
              >
                {{ calculatedBuGu }}
              </div>

              <small v-else>
                Enter OG and IBU to calculate
                BU/GU.
              </small>

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


          <!-- ======================
               RIGHT COLUMN
          ====================== -->

          <div class="form-section">


            <div class="date-group">

              <label>Date Brewed</label>

              <input
                type="date"
                v-model="editingBeer.dateBrewed"
              />

            </div>


            <div class="date-group">

              <label>Date Kegged</label>

              <input
                type="date"
                v-model="editingBeer.dateKegged"
              />

            </div>


            <div>

              <label>
                Mash Temperature (°C)
              </label>

              <input
                v-model="editingBeer.mash_temp"
                type="number"
                step="0.5"
                placeholder="67"
              />

            </div>


            <div>

              <label>
                Fermentation Temperature (°C)
              </label>

              <input
                v-model="
                  editingBeer.fermentation_temp
                "
                type="number"
                step="0.5"
                placeholder="18"
              />

            </div>


            <div>

              <label>Yeast</label>

              <input
                v-model="editingBeer.yeast"
                placeholder="e.g. Wyeast 1056"
              />

            </div>


            <div>

              <label>Boil Hops</label>

              <textarea
                v-model="editingBeer.boil_hops"
                placeholder="e.g. Magnum, Citra"
              ></textarea>

            </div>


            <div>

              <label>Whirlpool Hops</label>

              <textarea
                v-model="
                  editingBeer.whirlpool_hops
                "
                placeholder="e.g. Citra, Mosaic, Simcoe"
              ></textarea>

            </div>


            <div>

              <label>Cold Side Hops</label>

              <textarea
                v-model="
                  editingBeer.cold_side_hops
                "
                placeholder="e.g. Citra, Galaxy, Mosaic"
              ></textarea>

            </div>


            <!-- BREWING STATUS -->

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


          <!-- ======================
               DESCRIPTION
          ====================== -->

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


        <!-- ======================
             EDIT BUTTONS
        ====================== -->

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



    <!-- ==================================================
         TASTING NOTES MODAL
    ================================================== -->

    <div
      v-if="showTastingModal"
      class="modal tasting-modal"
    >

      <div class="modal-content tasting-modal-content">


        <!-- HEADER -->

        <div class="tasting-modal-header">

          <div>

            <h2>
              Tasting Notes
            </h2>

            <div
              v-if="tastingBeer"
              class="tasting-beer-name"
            >
              {{ tastingBeer.name }}

              <span
                v-if="tastingBeer.style"
              >
                · {{ tastingBeer.style }}
              </span>
            </div>

          </div>


          <button
            class="close-modal-btn"
            @click="closeTastingNotes"
          >
            ×
          </button>

        </div>


        <!-- EXISTING NOTES -->

        <div
          v-if="tastingNotes.length"
          class="tasting-list"
        >

          <div
            v-for="tasting in tastingNotes"
            :key="tasting.id"
            class="tasting-note"
          >

            <div
              class="tasting-note-header"
            >

              <strong>
                {{ tasting.note_date }}
              </strong>


              <div class="tasting-note-actions">

                <button
                  @click="
                    editTastingNote(tasting)
                  "
                >
                  Edit
                </button>


                <button
                  class="note-delete-btn"
                  @click="
                    deleteTastingNote(
                      tasting.id
                    )
                  "
                >
                  Delete
                </button>

              </div>

            </div>


            <div
              class="tasting-note-text"
            >
              {{ tasting.note }}
            </div>

          </div>

        </div>


        <!-- NO NOTES -->

        <div
          v-else
          class="no-tasting-notes"
        >
          No tasting notes yet.
        </div>


        <!-- ======================
             NEW NOTE
        ====================== -->

        <div class="new-tasting-note">

          <h3>
            Add Tasting Note
          </h3>


          <label>Date</label>

          <input
            type="date"
            v-model="newNoteDate"
          />


          <label>Notes</label>

          <textarea
            v-model="newNoteText"
            placeholder="How is the beer tasting?"
          ></textarea>


          <button
            class="add-note-btn"
            @click="addTastingNote"
          >
            + Add Tasting Note
          </button>

        </div>


        <!-- CLOSE -->

        <div class="tasting-close-row">

          <button
            class="cancel-btn"
            @click="closeTastingNotes"
          >
            Close
          </button>

        </div>

      </div>

    </div>

  </div>

</template>


<style>

/* ======================
   GLOBAL
====================== */

body {
  background: #f5f5f5;
  font-family: Arial, sans-serif;
  color: #111;
}


/* ======================
   PAGE
====================== */

.container {
  padding: 20px;
  max-width: 1200px;
  margin: auto;
}

h1 {
  margin-bottom: 20px;
}


/* ======================
   DISPLAY MODE
====================== */

.display-mode {
  background: white;
  border-radius: 12px;

  padding: 16px 18px;
  margin-bottom: 20px;

  box-shadow:
    0 2px 8px rgba(0,0,0,0.08);
}

.display-mode > label {
  display: block;

  margin-bottom: 10px;

  font-size: 0.9rem;
  font-weight: bold;

  color: #444;
}

.display-mode-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;

  background: #f1f1f1;

  border-radius: 10px;

  padding: 4px;
  gap: 4px;
}

.display-mode-buttons button {
  border: none;
  border-radius: 8px;

  padding: 12px 16px;

  background: transparent;
  color: #555;

  font-size: 1rem;
  font-weight: bold;

  cursor: pointer;

  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.1s ease;
}

.display-mode-buttons button:hover {
  color: #222;
}

.display-mode-buttons button:active {
  transform: scale(0.98);
}

.display-mode-buttons button.active {
  background: white;
  color: #2e7d32;

  box-shadow:
    0 2px 5px rgba(0,0,0,0.12);
}


/* ======================
   ADD BUTTON
====================== */

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

  transition:
    background 0.2s ease,
    transform 0.1s ease;
}

.add-btn:hover {
  background: #256b29;
}

.add-btn:active {
  transform: scale(0.99);
}


/* ======================
   TAPS
====================== */

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
    border 0.2s ease,
    box-shadow 0.2s ease;
}

.tap:hover {
  transform: translateY(-2px);

  box-shadow:
    0 4px 12px rgba(0,0,0,0.12);
}

.tap.active {
  border: 3px solid #4caf50;

  padding: 13px;
}


/* ======================
   CLEAR TAP
====================== */

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

  transition:
    background 0.2s ease,
    transform 0.1s ease;
}

.clear-btn:hover {
  background: #d84343;
}

.clear-btn:active {
  transform: scale(0.99);
}


/* ======================
   SEARCH
====================== */

.search {
  width: 100%;

  padding: 14px;

  border-radius: 10px;
  border: 1px solid #ccc;

  margin-bottom: 20px;

  box-sizing: border-box;

  font-size: 1rem;

  background: white;
}

.search:focus {
  outline: none;

  border-color: #4caf50;

  box-shadow:
    0 0 0 2px rgba(76,175,80,0.15);
}


/* ======================
   BEERS
====================== */

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

  gap: 15px;

  box-shadow:
    0 2px 8px rgba(0,0,0,0.08);

  transition:
    box-shadow 0.2s ease;
}

.beer:hover {
  box-shadow:
    0 4px 12px rgba(0,0,0,0.11);
}

.beer-main {
  cursor: pointer;

  min-width: 0;
}

.beer-main strong {
  font-size: 1.2rem;
}

.finished {
  text-decoration: line-through;

  opacity: 0.6;
}


/* ======================
   ACTIONS
====================== */

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

  font-size: 0.9rem;

  transition:
    background 0.2s ease,
    transform 0.1s ease;
}

.actions button:hover {
  background: #ddd;
}

.actions button:active {
  transform: scale(0.97);
}

.actions .tasting-btn {
  background: #e8f5e9;
  color: #2e7d32;
  font-weight: bold;
}

.actions .tasting-btn:hover {
  background: #d5ecd7;
}

.actions .delete-list-btn {
  background: #ffebee;
  color: #c62828;
}

.actions .delete-list-btn:hover {
  background: #ffcdd2;
}


/* ======================
   MODAL
====================== */

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


/* ======================
   MODAL CONTENT
====================== */

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

  box-sizing: border-box;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 25px;

  font-size: 1.8rem;
}


/* ======================
   FORM GRID
====================== */

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


/* ======================
   LABELS
====================== */

label {
  display: block;

  margin-bottom: 5px;

  font-size: 0.9rem;
  font-weight: bold;

  color: #444;
}


/* ======================
   INPUTS
====================== */

input,
textarea {
  width: 100%;

  padding: 12px;

  border-radius: 10px;

  border: 1px solid #ccc;

  box-sizing: border-box;

  font-size: 1rem;

  font-family: inherit;

  background: white;
}

input:focus,
textarea:focus {
  outline: none;

  border-color: #4caf50;

  box-shadow:
    0 0 0 2px rgba(76,175,80,0.15);
}

textarea {
  min-height: 120px;

  resize: vertical;
}


/* ======================
   CALCULATED VALUES
====================== */

.calculated-value {
  background: #f3f3f3;

  border-radius: 10px;

  padding: 12px;

  font-size: 1rem;
  font-weight: bold;
}


/* ======================
   CHECKBOXES
====================== */

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

  margin-bottom: 0;

  cursor: pointer;
}

.checkbox-group input {
  width: auto;
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


/* ======================
   BUTTON ROW
====================== */

.button-row {
  display: flex;

  justify-content: flex-end;

  gap: 10px;

  margin-top: 30px;
}

.button-row button {
  border: none;

  border-radius: 8px;

  padding: 11px 16px;

  font-weight: bold;

  cursor: pointer;

  transition:
    background 0.2s ease,
    transform 0.1s ease;
}

.button-row button:active {
  transform: scale(0.97);
}

.save-btn {
  background: #2e7d32;

  color: white;
}

.save-btn:hover {
  background: #256b29;
}

.cancel-btn {
  background: #ddd;
}

.cancel-btn:hover {
  background: #ccc;
}

.delete-btn {
  background: #d32f2f;

  color: white;
}

.delete-btn:hover {
  background: #b71c1c;
}


/* ==================================================
   TASTING NOTES MODAL
================================================== */

.tasting-modal-content {
  width: 700px;
  max-width: 95vw;
}


.tasting-modal-header {
  display: flex;

  justify-content: space-between;
  align-items: flex-start;

  gap: 20px;

  margin-bottom: 20px;
}


.tasting-modal-header h2 {
  margin-bottom: 6px;
}


.tasting-beer-name {
  font-size: 0.95rem;

  color: #666;
}


.close-modal-btn {
  width: 38px;
  height: 38px;

  flex-shrink: 0;

  border: none;
  border-radius: 50%;

  background: #eee;

  font-size: 1.6rem;
  line-height: 1;

  cursor: pointer;

  color: #555;
}

.close-modal-btn:hover {
  background: #ddd;
}


/* ======================
   TASTING LIST
====================== */

.tasting-list {
  display: flex;

  flex-direction: column;

  gap: 10px;

  margin-bottom: 25px;
}


.tasting-note {
  background: #f7f7f7;

  border-radius: 10px;

  padding: 14px;
}


.tasting-note-header {
  display: flex;

  justify-content: space-between;
  align-items: center;

  gap: 15px;

  margin-bottom: 8px;
}


.tasting-note-actions {
  display: flex;

  gap: 6px;
}


.tasting-note-header button {
  border: none;

  border-radius: 7px;

  padding: 7px 10px;

  background: #e5e5e5;

  cursor: pointer;

  font-size: 0.8rem;
}


.tasting-note-header button:hover {
  background: #d8d8d8;
}


.tasting-note-header .note-delete-btn {
  background: #ffebee;

  color: #c62828;
}


.tasting-note-header .note-delete-btn:hover {
  background: #ffcdd2;
}


.tasting-note-text {
  white-space: pre-wrap;

  line-height: 1.4;

  color: #333;
}


.no-tasting-notes {
  background: #f7f7f7;

  border-radius: 10px;

  padding: 20px;

  text-align: center;

  color: #777;

  margin-bottom: 25px;
}


/* ======================
   NEW TASTING NOTE
====================== */

.new-tasting-note {
  border-top: 1px solid #ddd;

  padding-top: 22px;

  display: flex;

  flex-direction: column;

  gap: 8px;
}


.new-tasting-note h3 {
  margin: 0 0 8px;

  font-size: 1.1rem;
}


.new-tasting-note textarea {
  min-height: 100px;
}


.add-note-btn {
  margin-top: 5px;

  padding: 11px;

  background: #2e7d32;

  color: white;

  border: none;

  border-radius: 8px;

  font-weight: bold;

  cursor: pointer;
}


.add-note-btn:hover {
  background: #256b29;
}


.tasting-close-row {
  display: flex;

  justify-content: flex-end;

  margin-top: 20px;
}

.image-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-preview {
  width: 180px;
  height: 180px;

  border-radius: 12px;

  overflow: hidden;

  background: #f3f3f3;

  border: 1px solid #ddd;
}

.image-preview img {
  width: 100%;
  height: 100%;

  object-fit: cover;

  display: block;
}

.remove-image-btn {
  align-self: flex-start;

  border: none;
  border-radius: 8px;

  padding: 8px 12px;

  background: #ffebee;
  color: #c62828;

  font-weight: bold;

  cursor: pointer;
}

.remove-image-btn:hover {
  background: #ffcdd2;
}

/* ======================
   MOBILE
====================== */

@media (max-width: 800px) {

  .container {
    padding: 15px;
  }

  h1 {
    font-size: 1.6rem;
  }


  /* Form */

  .form-grid {
    grid-template-columns: 1fr;
  }


  /* Beer cards */

  .beer {
    flex-direction: column;

    align-items: flex-start;

    gap: 15px;
  }

  .beer-main {
    width: 100%;
  }


  /* Actions */

  .actions {
    width: 100%;
  }

  .actions button {
    flex: 1;
  }


  /* Taps */

  .taps {
    grid-template-columns: repeat(2, 1fr);
  }


  /* Modal */

  .modal-content {
    padding: 20px;

    max-height: 95vh;

    border-radius: 14px;
  }

  .modal-content h2 {
    font-size: 1.5rem;
  }


  /* Modal buttons */

  .button-row {
    flex-wrap: wrap;
  }

  .button-row button {
    flex: 1;
  }

  .delete-btn {
    flex-basis: 100%;
  }


  /* Tasting notes */

  .tasting-note-header {
    align-items: flex-start;
  }

  .tasting-note-actions {
    flex-shrink: 0;
  }

}


/* ======================
   SMALL PHONES
====================== */

@media (max-width: 450px) {

  .container {
    padding: 10px;
  }

  h1 {
    font-size: 1.4rem;
  }

  .beer {
    padding: 15px;
  }

  .actions button {
    padding: 9px 8px;

    font-size: 0.8rem;
  }

  .modal-content {
    padding: 15px;
  }

  .tasting-note-header {
    flex-direction: column;
  }

  .tasting-note-actions {
    width: 100%;
  }

  .tasting-note-actions button {
    flex: 1;
  }

}

</style>