<template>
  <div class="taplist-display" :class="{ 'with-extras': hasExtras }">

    <!-- TAP LIST -->
    <div class="tap-list">
      <div v-for="tap in taps" :key="tap.id" class="tap-row">

        <!-- Tap Number -->
        <div class="tap-no">
          {{ '#' + tap.id }}
       
         <div class="keg-number" v-if="tap.kegNumber">
           Keg {{ tap.kegNumber }}
         </div>

        </div>


        <!-- Name -->
     <div 
       class="name" 
       :class="{ finished: tap.finished }"
       :style="getOpacityStyle(tap)"
     >
       {{ tap.beerName || 'Empty' }}
     </div>

        <!-- Style -->
        <div class="style">
          {{ tap.style }}
        </div>

        <!-- ABV -->
	<div class="abv">
          {{ tap.abv ? '| ' + Number(tap.abv).toFixed(1) + '%' : '' }}
	</div>
        <!-- IBU -->
        <div class="ibu">
          <span v-if="tap.ibu"> |IBU {{ tap.ibu }}</span>
        </div>

        <!-- Hops -->
        <div class="hops">
          <div v-for="(hop, i) in splitHops(tap.hops)" :key="i">
            {{ hop }}
          </div>
        </div>

        <!-- Dates -->
        <div class="dates">
          <div v-if="tap.dateBrewed">
            Brewed: {{ daysElapsed(tap.dateBrewed) }}d
          </div>
          <div v-if="tap.dateKegged">
            Kegged: {{ daysElapsed(tap.dateKegged) }}d
          </div>
        </div>

        <!-- Description -->
        <div class="desc">
          {{ tap.description }}
        </div>

      </div>
    </div>

    <!-- CONDITIONING -->
    <div class="section conditioning" v-if="conditioning.length">
      <h2>Conditioning</h2>
      <div class="card-row">
        <div v-for="beer in conditioning" :key="beer.id" class="card">
          <strong>{{ beer.name }}</strong>
          <div>{{ beer.style }}</div>
          <div v-if="beer.kegNumber">   Keg {{ beer.kegNumber }} </div>
          <div v-if="beer.dateKegged">
            {{ daysElapsed(beer.dateKegged) }} days conditioning
          </div>
        </div>
      </div>
    </div>

    <!-- FERMENTING -->
    <div class="section fermenting" v-if="fermenting.length">
      <h2>Fermenting</h2>
      <div class="card-row">
        <div v-for="beer in fermenting" :key="beer.id" class="card">
          <strong>{{ beer.name }}</strong>
          <div>{{ beer.style }}</div>
          <div v-if="beer.dateBrewed">
            {{ daysElapsed(beer.dateBrewed) }} days fermenting
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: "Display",
  data() {
    return {
      taps: [],
      fermenting: [],
      conditioning: [],
      API_BASE: "http://192.168.1.109:3000"
    };
  },
  methods: {
    async loadData() {
      try {
        const [taps, fermenting, conditioning] = await Promise.all([
          fetch(`${this.API_BASE}/taps`).then(r => r.json()),
          fetch(`${this.API_BASE}/beers/fermenting`).then(r => r.json()),
          fetch(`${this.API_BASE}/beers/conditioning`).then(r => r.json())
        ]);

        this.taps = taps;
        this.fermenting = fermenting;
        this.conditioning = conditioning;

      } catch (err) {
        console.error("Failed to load data:", err);
      }
    },

    splitHops(hops) {
      if (!hops) return []
      return hops.split(/[\n,]+/).map(h => h.trim());
    },

    daysElapsed(dateStr) {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    },

getOpacityStyle(tap) {
  // Not on tap or no beer
  if (!tap.beerName) return {}

  // Must have keg date to calculate conditioning
  if (!tap.dateKegged) return {}

  const days = this.daysElapsed(tap.dateKegged)

  // Check if this beer is in conditioning list
  const isConditioning = this.conditioning.some(b => b.id === tap.beer_id)

  if (!isConditioning) return {}

  // Opacity logic
  const opacity = Math.min(0.3 + (days * 0.1), 1)

  return {
    opacity: opacity
  }
}



  },
  computed: {
  hasExtras() {
    return this.fermenting.length > 0 || this.conditioning.length > 0
  }
},
  mounted() {
    this.loadData();
    setInterval(this.loadData, 5000);
  }
};
</script>

<style scoped>
/* BASE (no fermenting/conditioning) */
.taplist-display {
  display: flex;
  flex-direction: column;
  height: 100vh;

  font-family: courier;
  background: #f5f5f5;
  color: #111;
  padding: 40px;
  box-sizing: border-box;
}

/* TAP LIST */
.tap-list {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* NO EXTRAS → spread taps fully */
.taplist-display:not(.with-extras) .tap-list {
  justify-content: space-evenly;
}

/* WITH EXTRAS → compact taps */
.taplist-display.with-extras .tap-list {
  justify-content: flex-start;
}

/* Rows slightly smaller when extras exist */
.taplist-display.with-extras .tap-row {
  min-height: 20%;
}

/* GRID layout */
.tap-row {
  display: grid;
  grid-template-columns:
    6%
    18%
    10%
    5%
    8%
    14%
    12%
    26%;
  border-bottom: 1px solid #ccc;
  padding: 15px;
  align-items: center;
  min-height: 20%;
}

/* Tap number */
.tap-no {
  font-weight: bold;
  font-size: 1.3em;
  text-align: center;
}

/* Keg Number */
.keg-number {
  font-size: 0.7em;
  margin-top: 4px;
  opacity: 0.7;
}


/* Name */
.name {
  font-size: 1.6em;
  font-weight: bold;
  transition: opacity 0.5s ease;

}

/* Style */
.style {
  text-align: right;
  padding-right: 5px;
  font-size: 1.2em;
}

/* ABV */
.abv {
  font-size: 1.2em;
  text-align: center;
}

/* IBU */
.ibu {
  font-size: 1.2em;
}

/* Hops */
.hops div {
  font-size: 1em;
}

/* Dates */
.dates {
  font-size: 1em;
}

/* Description */
.desc {
  font-size: 1em;
}

/* Finished */
.finished {
  text-decoration: line-through;
  color: #888;
}

/* SECTIONS */
.section {
  margin-top: 20px;
  max-height: 20%;
}

.section h2 {
  font-size: 1.2em;
  margin-bottom: 10px;
}

/* Cards */
.card-row {
  display: flex;
  gap: 10px;
}

.card {
  padding: 10px;
  border-radius: 8px;
  min-width: 140px;
}

/* Fermenting (light green) */
.fermenting .card {
  background: #e8f5e9;
}

/* Conditioning (light blue) */
.conditioning .card {
  background: #e3f2fd;
}
</style>
