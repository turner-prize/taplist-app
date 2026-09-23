<script setup>import { ref, onMounted, onUnmounted } from 'vue'

const kegs = ref([])
const now = ref(new Date())

const showLeakTestStart = ref(false)
const showLeakTestEnd = ref(false)
const selectedKeg = ref(null)

const leakTestStartPsi = ref(12.0)
const leakTestEndPsi = ref('')

const API_BASE = import.meta.env.VITE_API_BASE

let timer = null

async function load() {
  kegs.value = await fetch(`${API_BASE}/api/kegs`)
    .then(r => r.json())
}

async function saveKeg(keg) {
  await fetch(`${API_BASE}/api/kegs/${keg.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(keg)
  })

  await load()
}

function toggle(keg, field) {
  keg[field] = keg[field] ? 0 : 1
  saveKeg(keg)
}

function daysSince(dateStr) {
  if (!dateStr) return null

  const d = new Date(dateStr)
  const current = new Date()

  return Math.floor((current - d) / (1000 * 60 * 60 * 24))
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours < 24) {
    return mins
      ? `${hours}h ${mins}m`
      : `${hours}h`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  return remainingHours
    ? `${days}d ${remainingHours}h`
    : `${days}d`
}

function leakTestElapsed(keg) {
  if (!keg.leakTestStartedAt) return null

  const start = new Date(keg.leakTestStartedAt)
  return Math.max(
    0,
    Math.floor((now.value - start) / 60000)
  )
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''

  return new Date(dateStr).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function startLeakTest(keg) {
  selectedKeg.value = keg
  leakTestStartPsi.value = 12.0
  showLeakTestStart.value = true
}

async function confirmStartLeakTest() {
  const keg = selectedKeg.value

  if (!keg || leakTestStartPsi.value === '') return

  const response = await fetch(
    `${API_BASE}/api/kegs/${keg.id}/leak-test/start`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startPsi: Number(leakTestStartPsi.value)
      })
    }
  )

  if (!response.ok) {
    alert('Could not start leak test')
    return
  }

  showLeakTestStart.value = false
  selectedKeg.value = null

  await load()
}

function endLeakTest(keg) {
  selectedKeg.value = keg
  leakTestEndPsi.value = ''
  showLeakTestEnd.value = true
}

async function confirmEndLeakTest() {
  const keg = selectedKeg.value

  if (!keg || leakTestEndPsi.value === '') return

  const response = await fetch(
    `${API_BASE}/api/kegs/${keg.id}/leak-test/end`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endPsi: Number(leakTestEndPsi.value)
      })
    }
  )

  if (!response.ok) {
    alert('Could not end leak test')
    return
  }

  showLeakTestEnd.value = false
  selectedKeg.value = null

  await load()
}

async function setDeepCleanToday(keg) {
  keg.lastDeepCleanDate = new Date().toISOString().split('T')[0]
  await saveKeg(keg)
}

async function setOringChangeToday(keg) {
  keg.lastOringChangeDate = new Date().toISOString().split('T')[0]
  await saveKeg(keg)
}

onMounted(() => {
  load()

  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div class="container">

    <h1>🍺 Keg Lifecycle</h1>

    <div class="keg-grid">

      <div
        v-for="keg in kegs"
        :key="keg.id"
        class="keg-card"
      >

        <div class="keg-header">
          <h2>Keg {{ keg.id }}</h2>

          <div
            v-if="keg.beerName"
            class="assigned"
          >
            On Tap {{ keg.tapNumber }}
          </div>
        </div>

        <div
          class="beer-info"
          v-if="keg.beerName"
        >
          <strong>{{ keg.beerName }}</strong>
          <div>{{ keg.style }}</div>
        </div>

        <div
          v-else
          class="empty"
        >
          No beer assigned
        </div>

<div class="status-grid">

  <button
    class="status dirty"
    :class="{ active: keg.dirty }"
    @click="toggle(keg, 'dirty')"
  >
    Dirty
  </button>

  <button
    class="status clean"
    :class="{ active: keg.clean }"
    @click="toggle(keg, 'clean')"
  >
    Clean
  </button>

  <button
    class="status sanitised"
    :class="{ active: keg.sanitised }"
    @click="toggle(keg, 'sanitised')"
  >
    Sanitised
  </button>

  <button
    class="status pressurised"
    :class="{ active: keg.pressurised }"
    @click="toggle(keg, 'pressurised')"
  >
    Pressurised
  </button>

  <div class="status maintenance-status">
    <strong>Deep Clean</strong>

    <div v-if="keg.lastDeepCleanDate">
      {{ daysSince(keg.lastDeepCleanDate) }} days ago
    </div>

    <div v-else>
      Never recorded
    </div>

    <button @click="setDeepCleanToday(keg)">
      Set Today
    </button>
  </div>

  <div class="status maintenance-status">
    <strong>O-Rings Changed</strong>

    <div v-if="keg.lastOringChangeDate">
      {{ daysSince(keg.lastOringChangeDate) }} days ago
    </div>

    <div v-else>
      Never recorded
    </div>

    <button @click="setOringChangeToday(keg)">
      Set Today
    </button>
  </div>

  <div class="status maintenance-status leak-test-status">
  <strong>Leak Test</strong>

  <template v-if="keg.leakTestStartedAt">
    <div class="leak-active">
      <span class="test-badge">TEST IN PROGRESS</span>

      <div>
        Started:
        {{ formatDateTime(keg.leakTestStartedAt) }}
      </div>

      <div>
        Running:
        {{ formatDuration(leakTestElapsed(keg)) }}
      </div>

      <div>
        Starting pressure:
        <strong>{{ Number(keg.leakTestStartPsi).toFixed(1) }} PSI</strong>
      </div>

      <button
        class="end-test-btn"
        @click="endLeakTest(keg)"
      >
        End Test
      </button>
    </div>
  </template>

  <template v-else>
    <div v-if="keg.lastLeakTestDate" class="last-leak-test">
      <div>
        Last test:
        {{ formatDateTime(keg.lastLeakTestDate) }}
      </div>

      <div>
        {{ Number(keg.lastLeakTestStartPsi).toFixed(1) }}
        →
        {{ Number(keg.lastLeakTestEndPsi).toFixed(1) }}
        PSI
      </div>

      <div>
        Change:
        <strong>
          {{
            (Number(keg.lastLeakTestEndPsi) -
             Number(keg.lastLeakTestStartPsi)).toFixed(1)
          }}
          PSI
        </strong>
      </div>
    </div>

    <div v-else class="no-leak-test">
      No test recorded
    </div>

    <button @click="startLeakTest(keg)">
      Start Test
    </button>
  </template>
</div>

</div>

      </div>

    </div>
<div v-if="showLeakTestStart" class="modal-overlay">
  <div class="modal">
    <h2>Start Leak Test</h2>

    <p>
      Pressurise the keg and enter the pressure shown on the
      spunding valve.
    </p>

    <label>
      Starting pressure
      <div class="psi-input">
        <input
          v-model="leakTestStartPsi"
          type="number"
          step="0.1"
          min="0"
        />
        <span>PSI</span>
      </div>
    </label>

    <div class="modal-actions">
      <button
        class="cancel-btn"
        @click="showLeakTestStart = false"
      >
        Cancel
      </button>

      <button
        class="confirm-btn"
        @click="confirmStartLeakTest"
      >
        Start Test
      </button>
    </div>
  </div>
</div>
<div v-if="showLeakTestEnd" class="modal-overlay">
  <div class="modal">
    <h2>End Leak Test</h2>

    <div class="test-summary">
      <div>
        <span>Duration</span>
        <strong>
          {{ formatDuration(leakTestElapsed(selectedKeg)) }}
        </strong>
      </div>

      <div>
        <span>Starting pressure</span>
        <strong>
          {{ Number(selectedKeg.leakTestStartPsi).toFixed(1) }} PSI
        </strong>
      </div>
    </div>

    <label>
      Final pressure
      <div class="psi-input">
        <input
          v-model="leakTestEndPsi"
          type="number"
          step="0.1"
          min="0"
          placeholder="12.0"
        />
        <span>PSI</span>
      </div>
    </label>

    <p class="pressure-note">
      Enter the pressure currently shown on the spunding valve.
      The app will calculate the pressure change.
    </p>

    <div class="modal-actions">
      <button
        class="cancel-btn"
        @click="showLeakTestEnd = false"
      >
        Cancel
      </button>

      <button
        class="confirm-btn"
        @click="confirmEndLeakTest"
      >
        End Test
      </button>
    </div>
  </div>
</div>
  </div>
</template>

<style scoped>

.container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 25px;
  box-sizing: border-box;

  font-family: Arial, sans-serif;
  color: #111;
}

h1 {
  margin: 0 0 25px;
  font-size: 2rem;
}

/* =========================
   KEG GRID
   ========================= */

.keg-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  width: 100%;
}

/* =========================
   KEG CARD
   ========================= */

/*
  Important:
  The main app has a global .keg-card rule which is
  affecting this page. Explicitly force each keg card
  to be a normal vertical container.
*/

.keg-card {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;

  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  background: white;
  border-radius: 16px;
  padding: 20px;

  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08);
}

/* =========================
   KEG HEADER
   ========================= */

.keg-header {
  display: flex !important;
  flex-direction: row !important;
  justify-content: space-between;
  align-items: center;

  width: 100%;
  margin: 0 0 15px;
  gap: 12px;
  box-sizing: border-box;
}

.keg-header h2 {
  margin: 0;
  font-size: 1.4rem;
  line-height: 1.2;
}

.assigned {
  flex-shrink: 0;

  background: #e3f2fd;
  color: #1565c0;

  padding: 6px 10px;
  border-radius: 999px;

  font-size: 0.85rem;
  font-weight: bold;
  white-space: nowrap;
}

/* =========================
   BEER INFORMATION
   ========================= */

.beer-info {
  display: block !important;

  width: 100%;
  margin: 0 0 18px;
  box-sizing: border-box;

  line-height: 1.4;
}

.beer-info strong {
  display: block;
  margin-bottom: 2px;
}

.empty {
  display: block !important;

  width: 100%;
  margin: 0 0 18px;
  box-sizing: border-box;

  opacity: 0.6;
}

/* =========================
   STATUS BUTTONS
   ========================= */

.status-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;

  width: 100%;
  gap: 12px;

  box-sizing: border-box;
}

.status {
  display: block !important;

  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  border: none;
  border-radius: 12px;

  padding: 14px 10px;

  font-size: 0.95rem;
  font-weight: bold;

  cursor: pointer;

  opacity: 0.35;

  transition:
    transform 0.15s ease,
    opacity 0.2s ease,
    box-shadow 0.15s ease;
}

.status:hover {
  transform: translateY(-1px);
}

.status:active {
  transform: translateY(0);
}

.status.active {
  opacity: 1;

  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.08);
}

.dirty {
  background: #ef9a9a;
}

.clean {
  background: #c8e6c9;
}

.sanitised {
  background: #b3e5fc;
}

.pressurised {
  background: #d1c4e9;
}

.maintenance-status {
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between;

  min-width: 0;
  box-sizing: border-box;

  padding: 12px;

  background: #fafafa;

  border-radius: 12px;

  font-size: 0.9rem;

  opacity: 1;
}

.maintenance-status strong {
  display: block;
  margin-bottom: 5px;
}

.maintenance-status button {
  display: block !important;

  width: 100%;
  box-sizing: border-box;

  margin-top: 9px;
  padding: 8px 10px;

  border: none;
  border-radius: 8px;

  background: #ffecb3;

  font-size: 0.85rem;
  font-weight: bold;

  cursor: pointer;

  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.maintenance-status button:hover {
  background: #ffe082;
  transform: translateY(-1px);
}

.maintenance-status button:active {
  transform: translateY(0);
}

.leak-test-status {
  background: #f3f0ff;
}

.test-badge {
  display: inline-block;
  margin-bottom: 7px;
  padding: 4px 7px;
  border-radius: 6px;
  background: #d1c4e9;
  color: #4527a0;
  font-size: .7rem;
  font-weight: bold;
}

.leak-active,
.last-leak-test {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: .82rem;
}

.no-leak-test {
  font-size: .82rem;
  opacity: .65;
}

.end-test-btn {
  background: #d1c4e9 !important;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, .2);
  box-sizing: border-box;
}

.modal h2 {
  margin: 0 0 12px;
}

.modal p {
  margin: 0 0 20px;
  line-height: 1.5;
  color: #555;
}

.modal label {
  display: block;
  font-weight: bold;
}

.psi-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.psi-input input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

.psi-input span {
  font-weight: bold;
}

.test-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 15px 0 20px;
}

.test-summary div {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 10px;
}

.test-summary span {
  display: block;
  font-size: .75rem;
  opacity: .65;
  margin-bottom: 4px;
}

.test-summary strong {
  font-size: .95rem;
}

.pressure-note {
  margin-top: 12px !important;
  margin-bottom: 0 !important;
  font-size: .8rem;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.modal-actions button {
  flex: 1;
  border: none;
  border-radius: 9px;
  padding: 11px;
  font-weight: bold;
  cursor: pointer;
}

.cancel-btn {
  background: #eee;
}

.confirm-btn {
  background: #c8e6c9;
}

/* =========================
   TABLET
   ========================= */

@media (max-width: 900px) {

  .container {
    padding: 20px;
  }

  .keg-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
  }

  .keg-card {
    padding: 16px;
  }

}

/* =========================
   MOBILE
   ========================= */

@media (max-width: 600px) {

  .container {
    padding: 15px;
  }

  h1 {
    margin-bottom: 18px;
    font-size: 1.6rem;
  }

  .keg-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .keg-card {
    width: 100%;
    padding: 16px;
    border-radius: 14px;
  }

  .keg-header {
    flex-wrap: wrap;
    align-items: center;
  }

  .keg-header h2 {
    font-size: 1.25rem;
  }

  .assigned {
    font-size: 0.78rem;
    padding: 5px 8px;
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px;
  }

  .status {
    padding: 12px 8px;
    font-size: 0.9rem;
  }

}

/* =========================
   VERY SMALL PHONES
   ========================= */

@media (max-width: 380px) {

  .container {
    padding: 10px;
  }

  .keg-card {
    padding: 13px;
  }

  h1 {
    font-size: 1.45rem;
  }

  .assigned {
    width: auto;
  }

  .status {
    padding: 11px 6px;
    font-size: 0.85rem;
  }

}
</style>