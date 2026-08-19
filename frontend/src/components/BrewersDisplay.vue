<template>
  <div class="brewers-display">

    <div
      v-for="tap in taps"
      :key="tap.id"
      class="brewer-card"
    >

      <!-- HEADER -->
      <div class="card-header">

        <div class="beer-identity">

          <div class="tap-number">
            #{{ tap.id }}
          </div>

          <div>

            <div
              class="beer-name"
              :class="{ finished: tap.finished }"
            >
              {{ tap.beerName || 'EMPTY' }}
            </div>

            <div class="beer-style">
              {{ tap.style || 'No beer assigned' }}
            </div>

          </div>

        </div>

        <div
          v-if="tap.kegNumber"
          class="keg-number"
        >
          KEG {{ tap.kegNumber }}
        </div>

      </div>


      <!-- EMPTY TAP -->
      <div
        v-if="!tap.beerName"
        class="empty-tap"
      >
        No beer assigned to this tap
      </div>


      <!-- BEER INFORMATION -->
      <template v-else>

        <!-- HEADLINE STATS -->
        <div class="headline-stats">

          <div class="stat">
            <div class="stat-value">
              {{ calculateABV(tap) }}
            </div>

            <div class="stat-label">
              ABV
            </div>
          </div>


          <div class="stat">
            <div class="stat-value">
              {{ tap.ibu || '—' }}
            </div>

            <div class="stat-label">
              IBU
            </div>
          </div>


          <div class="stat">
            <div class="stat-value">
              {{ calculateBUGU(tap) }}
            </div>

            <div class="stat-label">
              BU/GU
            </div>
          </div>


          <div class="stat">
            <div class="stat-value">
              {{ kegAge(tap) }}
            </div>

            <div class="stat-label">
              DAYS IN KEG
            </div>
          </div>

        </div>


        <!-- GRAVITY / TEMPERATURE -->
        <div class="brew-data">

          <!-- GRAVITY -->
          <div class="data-group">

            <div class="data-item">

              <span>
                OG
              </span>

              <strong>
                {{ tap.og ? Number(tap.og).toFixed(3) : '—' }}
              </strong>

            </div>


            <div class="data-item">

              <span>
                FG
              </span>

              <strong>
                {{ tap.fg ? Number(tap.fg).toFixed(3) : '—' }}
              </strong>

            </div>

          </div>


          <!-- TEMPERATURE -->
          <div class="data-group">

            <div class="data-item">

              <span>
                MASH
              </span>

              <strong>
                {{ tap.mash_temp ? tap.mash_temp + '°C' : '—' }}
              </strong>

            </div>


            <div class="data-item">

              <span>
                FERMENT
              </span>

              <strong>
                {{ tap.fermentation_temp
                  ? tap.fermentation_temp + '°C'
                  : '—'
                }}
              </strong>

            </div>

          </div>        
            <!-- TEMPERATURE -->
          <div class="data-group">

            <div class="data-item" v-if="tap.dateBrewed">

              <span>
                BREWED
              </span>

              <strong>
                {{ daysElapsed(tap.dateBrewed) }} days ago
              </strong>


            </div>


            <div class="data-item" v-if="tap.dateKegged">
            
              <span>
                KEGGED
              </span>

              <strong>
                {{ daysElapsed(tap.dateKegged) }} days ago
              </strong>

            </div>

          </div>

          

        </div>


        <!-- BREWING DETAILS + DESCRIPTION -->
        <div class="details-description-row">

        <!-- BREWING DETAILS -->
        <div class="brewing-details">

            <div
            v-if="tap.yeast"
            class="brewing-detail"
            >
            <span>YEAST</span>

            <strong>
                {{ tap.yeast }}
            </strong>
            </div>


            <div
            v-if="tap.boil_hops"
            class="brewing-detail"
            >
            <span>BOIL</span>

            <strong>
                {{ tap.boil_hops }}
            </strong>
            </div>


            <div
            v-if="tap.whirlpool_hops"
            class="brewing-detail"
            >
            <span>WHIRLPOOL</span>

            <strong>
                {{ tap.whirlpool_hops }}
            </strong>
            </div>


            <div
            v-if="tap.cold_side_hops"
            class="brewing-detail"
            >
            <span>COLD SIDE</span>

            <strong>
                {{ tap.cold_side_hops }}
            </strong>
            </div>

        </div>


        <!-- DESCRIPTION -->
        <div
        v-if="tap.description"
        class="description"
        >
        <div class="description-label">
            DESCRIPTION
        </div>

        <div class="description-text">
            {{ tap.description }}
        </div>
        </div>

        </div>


        <!-- TASTING NOTES -->
        <div
          v-if="tastingNotes[tap.beer_id]?.length"
          class="tasting-notes"
        >

          <div class="tasting-title">
            TASTING NOTES
          </div>


          <!-- Show most recent two notes -->
          <div
            v-for="note in tastingNotes[tap.beer_id]?.slice(0, 2)"
            :key="note.id"
            class="tasting-note"
          >

            <div class="tasting-note-meta">

              {{ note.note_date }}

              <span
                v-if="daysAtTasting(tap, note.note_date) !== null"
              >
                · {{ daysAtTasting(tap, note.note_date) }} DAYS IN KEG
              </span>

            </div>


            <div class="tasting-note-text">
              {{ note.note }}
            </div>

          </div>

        </div>

      </template>

    </div>

  </div>
</template>


<script>

export default {

  name: 'BrewersDisplay',


  props: {

    taps: {
      type: Array,
      default: () => []
    },


    tastingNotes: {
      type: Object,
      default: () => ({})
    }

  },


  methods: {

    calculateBUGU(tap) {

      if (!tap.ibu || !tap.og) {
        return '—'
      }

      const gu =
        (Number(tap.og) - 1) * 1000

      if (gu <= 0) {
        return '—'
      }

      return (
        Number(tap.ibu) / gu
      ).toFixed(2)

    },


    calculateABV(tap) {

      if (!tap.og || !tap.fg) {

        return tap.abv
          ? Number(tap.abv).toFixed(1) + '%'
          : '—'

      }

      const abv =
        (Number(tap.og) - Number(tap.fg)) * 131.25

      return abv.toFixed(1) + '%'

    },


    daysElapsed(dateStr) {

      const date = new Date(dateStr)

      const now = new Date()

      const diff =
        now - date

      return Math.floor(
        diff / (1000 * 60 * 60 * 24)
      )

    },


    kegAge(tap) {

      if (!tap.dateKegged) {
        return '—'
      }

      return this.daysElapsed(
        tap.dateKegged
      )

    },


    daysAtTasting(tap, noteDate) {

      if (!tap.dateKegged || !noteDate) {
        return null
      }

      const kegged =
        new Date(tap.dateKegged)

      const tasted =
        new Date(noteDate)

      const diff =
        tasted - kegged

      return Math.floor(
        diff / (1000 * 60 * 60 * 24)
      )

    }

  }

}

</script>


<style scoped>

/* =========================
   DISPLAY
========================= */

.brewers-display {

  width: 100vw;

  height: 100vh;

  padding: 25px;

  box-sizing: border-box;

  display: grid;

  grid-template-columns: 1fr 1fr;

  grid-template-rows: 1fr 1fr;

  gap: 18px;

  background: #f5f5f5;

  font-family: Courier, monospace;

  color: #111;

}


/* =========================
   CARD
========================= */

.brewer-card {

  background: white;

  border-radius: 14px;

  padding: 20px;

  box-sizing: border-box;

  border: 1px solid #ddd;

  box-shadow:
    0 3px 10px rgba(0,0,0,0.08);

  display: flex;

  flex-direction: column;

  overflow-y: auto;

}


/* =========================
   HEADER
========================= */

.card-header {

  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  margin-bottom: 15px;

}


.beer-identity {

  display: flex;

  align-items: flex-start;

  gap: 12px;

  min-width: 0;

}


.tap-number {

  font-size: 1.3rem;

  font-weight: bold;

  opacity: 0.55;

  padding-top: 3px;

}


.beer-name {

  font-size: 1.7rem;

  font-weight: bold;

  line-height: 1.1;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;

}


.beer-style {

  font-size: 0.95rem;

  margin-top: 5px;

  opacity: 0.65;

}


.keg-number {

  background: #eeeeee;

  border-radius: 7px;

  padding: 6px 9px;

  font-size: 0.8rem;

  font-weight: bold;

  white-space: nowrap;

}


/* =========================
   EMPTY TAP
========================= */

.empty-tap {

  flex: 1;

  display: flex;

  align-items: center;

  justify-content: center;

  opacity: 0.4;

  font-size: 1rem;

}


/* =========================
   HEADLINE STATS
========================= */

.headline-stats {

  display: grid;

  grid-template-columns:
    repeat(4, 1fr);

  gap: 8px;

  margin-bottom: 15px;

}


.stat {

  background: #f3f3f3;

  border-radius: 8px;

  padding: 9px;

  text-align: center;

}


.stat-value {

  font-size: 1.25rem;

  font-weight: bold;

}


.stat-label {

  font-size: 0.65rem;

  opacity: 0.6;

  margin-top: 3px;

}


/* =========================
   BREW DATA
========================= */

.brew-data {

  display: grid;

  grid-auto-flow: row;

  grid-template-columns: 1fr 1fr 1fr;

  gap: 20px;

  width: 100%;


  margin-bottom: 12px;

}


.data-group {

  display: flex;

  flex-direction: column;

  gap: 5px;

}


.data-item {

  display: flex;

  justify-content: space-between;

  align-items: center;

  border-bottom: 1px solid #ddd;

  padding-bottom: 5px;

  font-size: 0.8rem;

}


.data-item span {

  opacity: 0.55;

  font-size: 0.7rem;

}


.data-item strong {

  font-size: 0.9rem;

}


/* =========================
   BREWING DETAILS
========================= */
.details-description-row {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 20px;

  margin-bottom: 12px;
}


.brewing-details {
  display: flex;

  flex-direction: column;

  gap: 5px;
}


.brewing-detail {
  display: flex;

  gap: 12px;

  font-size: 0.75rem;

  line-height: 1.25;
}


.brewing-detail span {
  flex: 0 0 75px;

  font-size: 0.65rem;

  font-weight: bold;

  opacity: 0.55;
}


.brewing-detail strong {
  font-weight: normal;
}


.description {
  margin: 0;

  font-size: 0.8rem;

  line-height: 1.35;

  white-space: pre-wrap;
}

.description-label {
  font-size: 0.65rem;
  font-weight: bold;
  opacity: 0.55;
  margin-bottom: 5px;
}

.description-text {
  font-size: 0.8rem;
  line-height: 1.35;
  white-space: pre-wrap;
  margin-left:5px;
}


/* =========================
   TASTING NOTES
========================= */

.tasting-notes {

  margin-top: 10px;

  padding-top: 8px;

  border-top: 1px solid #ddd;

}


.tasting-title {

  font-size: 0.7rem;

  font-weight: bold;

  opacity: 0.55;

  margin-bottom: 6px;

}


.tasting-note {

  margin-bottom: 8px;

}


.tasting-note-meta {

  font-size: 0.65rem;

  font-weight: bold;

  opacity: 0.65;

  margin-bottom: 3px;

}


.tasting-note-text {

  font-size: 0.75rem;

  line-height: 1.3;

}


/* =========================
   FINISHED
========================= */

.finished {

  text-decoration: line-through;

  opacity: 0.5;

}


/* =========================
   MOBILE
========================= */

@media (max-width: 800px) {

  .brewers-display {

    height: auto;

    min-height: 100vh;

    grid-template-columns: 1fr;

    grid-template-rows: auto;

    padding: 12px;

    gap: 12px;

  }


  .brewer-card {

    min-height: 400px;

  }


  .beer-name {

    font-size: 1.4rem;

  }


  .headline-stats {

    grid-template-columns:
      repeat(2, 1fr);

  }


  .brew-data {

    grid-template-columns:
      repeat(2, 1fr);

  }

}

</style>