<script setup>
import { ref, onMounted } from 'vue'

const taps = ref([])

async function loadTaps() {
  const res = await fetch('http://192.168.1.40:3000/taps')
  taps.value = await res.json()
}

onMounted(() => {
  loadTaps()
  setInterval(loadTaps, 10000)
})
</script>

<template>
  <router-view />
</template>

<style>
body {
  background: #111;
  color: white;
  font-family: sans-serif;
}

.container {
  padding: 40px;
}

.beer {
  display: flex;
  justify-content: space-between;
  font-size: 40px;
  margin: 15px 0;
}
</style>
