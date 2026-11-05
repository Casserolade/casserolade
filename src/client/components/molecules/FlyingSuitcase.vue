<script setup lang="ts">
import { computed, ref } from 'vue';
import MoneySuitcase from '#src/client/components/atoms/MoneySuitcase.vue';
import { SUITCASE_BURST } from '#src/client/const/suitcaseBurst.ts';
import type { SuitcaseFlight } from '#src/client/tools/suitcaseFlight.ts';

/**
 * The reporter's suitcase of banknotes, in the air: it spins along its arc, drops into the Ko-fi link, and the
 * notes burst out of it and flutter down. `landed` when it hits the link, `done` once the last note is gone.
 */
const props = defineProps<{ flight: SuitcaseFlight }>();
const emit = defineEmits<{ landed: []; done: [] }>();

const landed = ref(false);
const path = computed(() => ({
  left: `${props.flight.x}px`,
  top: `${props.flight.y}px`,
  '--dx': `${props.flight.dx}px`,
  '--dy': `${props.flight.dy}px`,
  '--lift': `${-props.flight.lift}px`,
  '--seconds': `${props.flight.seconds}s`,
}));

function land(): void {
  landed.value = true;
  emit('landed');
}
</script>

<template>
  <div class="flight" :style="path" aria-hidden="true">
    <span class="travel" @animationend.self="land">
      <span class="arc"><span class="spin" :class="{ landed }"><MoneySuitcase /></span></span>
      <span v-if="landed" class="burst" @animationend.self="emit('done')">
        <i v-for="(note, index) in SUITCASE_BURST" :key="index" :class="note.note" :style="{ '--bx': `${note.x}px`, '--by': `${note.y}px`, '--spin': `${note.spin}deg`, '--delay': `${note.delay}s` }" />
      </span>
    </span>
  </div>
</template>

<style scoped>
/* Over the page and the reporter, never in the way of the mouse. */
.flight { position: fixed; z-index: 45; width: 0; height: 0; pointer-events: none; }
/* The arc in three moves: straight to the link, up and down over that line, and spinning all along. */
.travel { position: absolute; animation: travel var(--seconds) linear forwards; }
.arc { position: absolute; animation: arc var(--seconds) forwards; }
.spin { position: absolute; width: 56px; margin: -21px 0 0 -28px; animation: spin var(--seconds) linear forwards; }
@keyframes travel { to { translate: var(--dx) var(--dy); } }
@keyframes arc {
  0% { translate: 0 0; animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1); }
  50% { translate: 0 var(--lift); animation-timing-function: cubic-bezier(0.32, 0, 0.67, 0); }
  100% { translate: 0 0; }
}
@keyframes spin { to { rotate: 1.25turn; } }
/* In the link it goes, swallowed whole. */
.spin.landed { animation: swallowed 0.22s ease-in forwards; }
@keyframes swallowed { from { rotate: 1.25turn; } to { rotate: 1.25turn; scale: 0.2; opacity: 0; } }

/* The notes: out of the link, up and away, then fluttering down as they fade. The burst lasts as long as the last one. */
.burst { position: absolute; animation: linger 1.5s step-end forwards; }
@keyframes linger { to { visibility: hidden; } }
.burst i { position: absolute; width: 36px; height: 19px; margin: -9px 0 0 -18px; border-radius: 2px; box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.35), 0 1px 2px rgb(0 0 0 / 0.5); opacity: 0; animation: note 1.3s var(--delay) ease-out forwards; }
.burst i::after { content: '€'; position: absolute; inset: 0; color: rgb(0 0 0 / 0.45); font: 700 13px / 19px sans-serif; text-align: center; }
.cent { background: linear-gradient(#8fd17c, #4f8f45); }
.cinq-cents { background: linear-gradient(#bc95e4, #6b45a0); }
.cinquante { background: linear-gradient(#f6b874, #c0702c); }
@keyframes note {
  0% { translate: 0 0; rotate: 0deg; scale: 0.4; opacity: 1; }
  30% { translate: var(--bx) var(--by); scale: 1; opacity: 1; }
  100% { translate: calc(var(--bx) * 1.35) calc(var(--by) + 110px); rotate: var(--spin); scale: 1; opacity: 0; }
}
</style>
