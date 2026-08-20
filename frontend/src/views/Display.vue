<script>

import BrewersDisplay from '../components/BrewersDisplay.vue'

export default {
  name: "Display",

  components: {
    BrewersDisplay
  },

  data() {
    return {
      taps: [],
      fermenting: [],
      conditioning: [],
      displayMode: 'normal',
      tastingNotes: {},
      API_BASE: import.meta.env.VITE_API_BASE
    };
  },

  methods: {

    // ======================
    // LOAD DATA
    // ======================

    async loadData() {
      try {

        const [
          taps,
          fermenting,
          conditioning
        ] = await Promise.all([

          fetch(
            `${this.API_BASE}/taps`
          ).then(r => r.json()),

          fetch(
            `${this.API_BASE}/beers/fermenting`
          ).then(r => r.json()),

          fetch(
            `${this.API_BASE}/beers/conditioning`
          ).then(r => r.json())

        ]);

        this.taps = taps;
        this.fermenting = fermenting;
        this.conditioning = conditioning;

        await this.loadTastingNotes();

      } catch (err) {

        console.error(
          "Failed to load data:",
          err
        );

      }
    },


    // ======================
    // TASTING NOTES
    // ======================

    async loadTastingNotes() {

      try {

        const requests = this.taps
          .filter(tap => tap.beer_id)
          .map(async tap => {

            const notes = await fetch(
              `${this.API_BASE}/beers/${tap.beer_id}/tasting-notes`
            ).then(r => r.json())

            return {
              beerId: tap.beer_id,
              notes
            }

          })

        const results =
          await Promise.all(requests)

        const mapped = {}

        results.forEach(result => {

          mapped[result.beerId] =
            result.notes

        })

        this.tastingNotes = mapped

      } catch (err) {

        console.error(
          "Failed to load tasting notes:",
          err
        )

      }

    },


    // ======================
    // HOPS
    // ======================

    getUniqueHops(tap) {

      const allHops = [

        tap.boil_hops,
        tap.whirlpool_hops,
        tap.cold_side_hops

      ]
        .filter(Boolean)
        .flatMap(hops =>

          hops
            .split(/[\n,]+/)
            .map(h => h.trim())
            .filter(Boolean)

        )


      // Deduplicate case-insensitively
      // while preserving the original
      // spelling of the first occurrence.

      const seen = new Set()

      return allHops.filter(hop => {

        const key =
          hop.toLowerCase()

        if (seen.has(key)) {
          return false
        }

        seen.add(key)

        return true

      })

    },


    // ======================
    // DATE CALCULATIONS
    // ======================

    daysElapsed(dateStr) {

      const date =
        new Date(dateStr)

      const now =
        new Date()

      const diff =
        now - date

      return Math.floor(
        diff /
        (1000 * 60 * 60 * 24)
      )

    },


    // ======================
    // CONDITIONING OPACITY
    // ======================

    getOpacityStyle(tap) {

      // Not on tap or no beer
      if (!tap.beerName) {
        return {}
      }

      // Must have keg date
      // to calculate conditioning
      if (!tap.dateKegged) {
        return {}
      }

      const days =
        this.daysElapsed(
          tap.dateKegged
        )

      // Check whether beer is
      // in conditioning list
      const isConditioning =
        this.conditioning.some(
          b => b.id === tap.beer_id
        )

      if (!isConditioning) {
        return {}
      }

      // Opacity logic
      const opacity =
        Math.min(
          0.3 + (days * 0.1),
          1
        )

      return {
        opacity: opacity
      }

    },


    // ======================
    // ABV
    // ======================

    getAbv(beer) {

      const og =
        parseFloat(beer?.og)

      const fg =
        parseFloat(beer?.fg)

      if (
        !isNaN(og) &&
        !isNaN(fg) &&
        og > fg
      ) {

        return (
          (og - fg) * 131.25
        ).toFixed(1)

      }

      if (
        beer?.abv !== null &&
        beer?.abv !== undefined &&
        beer?.abv !== ''
      ) {

        return Number(
          beer.abv
        ).toFixed(1)

      }

      return null

    },


    // ======================
    // DISPLAY MODE
    // ======================

    async loadDisplayMode() {

      try {

        const response =
          await fetch(
            `${this.API_BASE}/settings/display-mode`
          )

        const data =
          await response.json()

        this.displayMode =
          data.displayMode ||
          'normal'

      } catch (err) {

        console.error(
          'Failed to load display mode:',
          err
        )

        // Safely fall back
        // to normal display
        this.displayMode =
          'normal'

      }

    }

  },


  // ======================
  // COMPUTED
  // ======================

  computed: {

    hasExtras() {

      return (
        this.fermenting.length > 0 ||
        this.conditioning.length > 0
      )

    }

  },


  // ======================
  // STARTUP
  // ======================

  mounted() {

    this.loadData()

    this.loadDisplayMode()

    setInterval(
      this.loadData,
      5000
    )

    setInterval(
      this.loadDisplayMode,
      5000
    )

  }

};
</script>


<template>

  <div
    v-if="displayMode === 'normal'"
    class="taplist-display"
    :class="{
      'with-extras': hasExtras
    }"
  >

    <!-- ======================
         TAP LIST
    ====================== -->

    <div class="tap-list">

      <div
        v-for="tap in taps"
        :key="tap.id"
        class="tap-row"
      >

        <!-- TAP NUMBER -->

        <div class="tap-no">

          {{ '#' + tap.id }}

          <div
            class="keg-number"
            v-if="tap.kegNumber"
          >
            Keg {{ tap.kegNumber }}
          </div>

        </div>


        <!-- Beer Image -->
        <div class="beer-image">

          <img
            v-if="tap.image"
            :src="`${API_BASE}/uploads/${tap.image}`"
            :alt="tap.beerName || 'Beer'"
          />

        </div>


        <!-- Name -->
        <div 
          class="name" 
          :class="{ finished: tap.finished }"
          :style="getOpacityStyle(tap)"
        >
          {{ tap.beerName || 'Empty' }}
        </div>

        <!-- STYLE -->

        <div class="style">

          {{ tap.style }}

        </div>


        <!-- ABV -->

        <div class="abv">

          {{
            getAbv(tap)
              ? '| ' + getAbv(tap) + '%'
              : ''
          }}

        </div>


        <!-- IBU -->

        <div class="ibu">

          <span v-if="tap.ibu">
            | IBU {{ tap.ibu }}
          </span>

        </div>


        <!-- HOPS -->

        <div class="hops">

          <div
            v-for="(hop, i) in getUniqueHops(tap)"
            :key="i"
          >

            {{ hop }}

          </div>

        </div>


        <!-- DATES -->

        <div class="dates">

          <div v-if="tap.dateBrewed">

            Brewed:
            {{ daysElapsed(
              tap.dateBrewed
            ) }}d

          </div>

          <div v-if="tap.dateKegged">

            Kegged:
            {{ daysElapsed(
              tap.dateKegged
            ) }}d

          </div>

        </div>


        <!-- DESCRIPTION -->

        <div class="desc">

          {{ tap.description }}

        </div>

      </div>

    </div>


 <!-- BREWING STAGES -->
<div
  v-if="conditioning.length || fermenting.length"
  class="brewing-stages"
>

  <!-- CONDITIONING -->
  <div
    v-if="conditioning.length"
    class="section conditioning"
  >
    <h2>Conditioning</h2>

    <div class="card-row">

      <div
        v-for="beer in conditioning"
        :key="beer.id"
        class="card"
      >
        <strong>{{ beer.name }}</strong>

        <div>
          {{ beer.style }}
        </div>

        <div v-if="beer.kegNumber">
          Keg {{ beer.kegNumber }}
        </div>

        <div v-if="beer.dateKegged">
          {{ daysElapsed(beer.dateKegged) }} days conditioning
        </div>

      </div>

    </div>
  </div>


  <!-- FERMENTING -->
  <div
    v-if="fermenting.length"
    class="section fermenting"
  >
    <h2>Fermenting</h2>

    <div class="card-row">

      <div
        v-for="beer in fermenting"
        :key="beer.id"
        class="card"
      >
        <strong>{{ beer.name }}</strong>

        <div>
          {{ beer.style }}
        </div>

        <div v-if="beer.dateBrewed">
          {{ daysElapsed(beer.dateBrewed) }} days fermenting
        </div>

      </div>

    </div>
  </div>

</div>

  </div>


  <!-- ======================
       BREWERS DISPLAY
  ====================== -->

  <BrewersDisplay
    v-else-if="displayMode === 'brewers'"
    :taps="taps"
    :tasting-notes="tastingNotes"
  />

</template>


<style scoped>

/* ======================
   BASE
====================== */

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


/* ======================
   TAP LIST
====================== */

.tap-list {

  display: flex;

  flex-direction: column;

  flex: 1;

}


/* NO EXTRAS */

.taplist-display:not(.with-extras)
.tap-list {

  justify-content:
    space-evenly;

}


/* WITH EXTRAS */

.taplist-display.with-extras
.tap-list {

  justify-content:
    flex-start;

}


/* ======================
   TAP ROW
====================== */

.taplist-display.with-extras
.tap-row {

  min-height: 20%;

}


.tap-row {

  display: grid;

grid-template-columns:
  6%
  10%
  18%
  10%
  5%
  8%
  14%
  12%
  17%;

  border-bottom:
    1px solid #ccc;

  padding: 15px;

  align-items: center;

  min-height: 20%;

}


/* ======================
   TAP NUMBER
====================== */

.tap-no {
  font-weight: bold;
  font-size: 1.3em;
  text-align: center;

  position: relative;
}

/* ======================
   KEG NUMBER
====================== */

.keg-number {
  position: absolute;

  top: calc(50% + 30px);
  left: 50%;

  transform: translateX(-50%);

  padding: 3px 7px;

  background: #e8e8e8;
  border-radius: 5px;

  font-size: 0.7em;
  font-weight: bold;

  opacity: 0.8;

  white-space: nowrap;
}

/* ======================
   NAME
====================== */

.name {

  font-size: 1.6em;

  font-weight: bold;

  transition:
    opacity 0.5s ease;

}


/* ======================
   STYLE
====================== */

.style {

  text-align: right;

  padding-right: 5px;

  font-size: 1.2em;

}


/* ======================
   ABV
====================== */

.abv {

  font-size: 1.2em;

  text-align: center;

}


/* ======================
   IBU
====================== */

.ibu {

  font-size: 1.2em;

}


/* ======================
   HOPS
====================== */

.hops div {

  font-size: 1em;

}


/* ======================
   DATES
====================== */

.dates {

  font-size: 1em;

}


/* ======================
   DESCRIPTION
====================== */

.desc {

  font-size: 1em;

}


/* ======================
   FINISHED
====================== */

.finished {

  text-decoration:
    line-through;

  color: #888;

}
/* =========================
   BREWING STAGES
========================= */

.brewing-stages {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 30px;

  margin-top: 20px;

  max-height: 20%;
}


/* =========================
   SECTIONS
========================= */

.section {
  min-width: 0;
}

.section h2 {
  font-size: 1.2em;

  margin: 0 0 10px;
}


/* =========================
   CARDS
========================= */

.card-row {
  display: flex;

  gap: 10px;

  overflow-x: auto;
}


.card {
  padding: 10px;

  border-radius: 8px;

  min-width: 140px;
}


/* =========================
   CONDITIONING
========================= */

.conditioning .card {
  background: #e3f2fd;
}


/* =========================
   FERMENTING
========================= */

.fermenting .card {
  background: #e8f5e9;
}

/* ======================
   Images
====================== */

.beer-image {
  width: 160px;
  height: 160px;

  border-radius: 10px;

  overflow: hidden;



  display: flex;

  align-items: center;
  justify-content: center;
}

.beer-image img {
  width: 100%;
  height: 100%;

  object-fit: contain;

  display: block;
}

</style>