<script setup>
import { ref, onMounted } from 'vue'

const kegs = ref([])

const API_BASE = 'http://192.168.1.109:3000'

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

<div class="deep-clean">
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
        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>

.container {
  padding: 25px;
  max-width: 1400px;
  margin: auto;

  font-family: Arial, sans-serif;
  color: #111;
}

h1 {
  margin-bottom: 25px;
}

.keg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.keg-card {
  background: white;
  border-radius: 16px;
  padding: 20px;

  box-shadow:
    0 4px 12px rgba(0,0,0,0.08);
}

.keg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 15px;
}

.keg-header h2 {
  margin: 0;
}

.assigned {
  background: #e3f2fd;
  color: #1565c0;

  padding: 6px 10px;
  border-radius: 999px;

  font-size: 0.85rem;
  font-weight: bold;
}

.beer-info {
  margin-bottom: 18px;
}

.empty {
  opacity: 0.6;
  margin-bottom: 18px;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.status {
  border: none;
  border-radius: 12px;

  padding: 14px;

  font-size: 0.95rem;
  font-weight: bold;

  cursor: pointer;

  opacity: 0.35;

  transition:
    transform 0.15s ease,
    opacity 0.2s ease;
}

.status:hover {
  transform: translateY(-1px);
}

.status.active {
  opacity: 1;
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

.deep-clean {
  margin-top: 12px;
  padding: 10px;

  background: #fafafa;
  border-radius: 10px;

  font-size: 0.9rem;
}

.deep-clean button {
  margin-top: 8px;
  padding: 6px 10px;

  border: none;
  border-radius: 8px;

  background: #ffecb3;
  cursor: pointer;
}

</style>
