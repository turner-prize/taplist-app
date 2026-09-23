<script setup>
import { ref, onMounted } from 'vue'

const kegs = ref([])

const API_BASE = import.meta.env.VITE_API_BASE

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

  load()
}

function toggle(keg, field) {
  keg[field] = keg[field] ? 0 : 1
  saveKeg(keg)
}

function daysSince(dateStr) {
  if (!dateStr) return null

  const d = new Date(dateStr)
  const now = new Date()

  return Math.floor((now - d) / (1000 * 60 * 60 * 24))
}

async function setDeepCleanToday(keg) {
  keg.lastDeepCleanDate = new Date().toISOString().split('T')[0]
  await saveKeg(keg)
}

async function setOringChangeToday(keg) {
  keg.lastOringChangeDate = new Date().toISOString().split('T')[0]
  await saveKeg(keg)
}

onMounted(load)
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

<div class="maintenance">

  <div class="maintenance-item">
    <strong>Deep Clean:</strong>

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

  <div class="maintenance-item">
    <strong>O-Rings Changed:</strong>

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

</div>
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.keg-card {
  min-width: 0;
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-sizing: border-box;

  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08);
}

/* =========================
   KEG HEADER
   ========================= */

.keg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  margin-bottom: 15px;
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
  margin-bottom: 18px;
  line-height: 1.4;
}

.beer-info strong {
  display: block;
  margin-bottom: 2px;
}

.empty {
  opacity: 0.6;
  margin-bottom: 18px;
}

/* =========================
   STATUS BUTTONS
   ========================= */

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.status {
  width: 100%;
  min-width: 0;

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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
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

/* =========================
   MAINTENANCE
   ========================= */

.maintenance {
  margin-top: 12px;

  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.maintenance-item {
  min-width: 0;

  padding: 12px;
  box-sizing: border-box;

  background: #fafafa;
  border-radius: 10px;

  font-size: 0.9rem;
}

.maintenance-item strong {
  display: block;
  margin-bottom: 5px;
}

.maintenance-item button {
  width: 100%;

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

.maintenance-item button:hover {
  background: #ffe082;
  transform: translateY(-1px);
}

.maintenance-item button:active {
  transform: translateY(0);
}

/* =========================
   TABLET
   ========================= */

@media (max-width: 800px) {

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

  .keg-header {
    align-items: flex-start;
  }

  .keg-header h2 {
    font-size: 1.25rem;
  }

  .assigned {
    font-size: 0.8rem;
    padding: 5px 8px;
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
    margin-bottom: 12px;
  }

  .keg-header h2 {
    font-size: 1.25rem;
  }

  .assigned {
    font-size: 0.78rem;
  }

  .beer-info,
  .empty {
    margin-bottom: 15px;
  }

  .status-grid {
    gap: 8px;
  }

  .status {
    padding: 12px 8px;
    font-size: 0.9rem;
    border-radius: 10px;
  }

  .maintenance {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .maintenance-item {
    padding: 11px;
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

  .keg-header {
    align-items: flex-start;
  }

  .assigned {
    width: 100%;
    text-align: center;
    box-sizing: border-box;
  }

  .status {
    padding: 11px 6px;
    font-size: 0.85rem;
  }

}
</style>