<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { facelessGhostNext, nextOpponentSeat } from '#src/client/tools/nextOpponentSeat.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { seatLabel } from '#src/client/tools/seatNames.ts';
import type { SeatName } from '#src/client/tools/seatNames.ts';
import type { PlayerView } from '#src/engine/game.ts';

/** How long a touched face keeps its name: nothing to close, it goes away by itself. */
const NAME_MS = 2500;

/**
 * The other candidates, in a strip under the bar: the healthiest first, the eliminated last, with their place. A touch
 * on a face names it (the hero, and online the pseudo), for a moment. During recruitment, the next opponent wears a red
 * ring and a sword, as on the desktop table; a ghost without a face yet has a place of its own, at the end.
 */
const props = withDefaults(defineProps<{ table: PlayerView['table']; seat: number; names?: Map<number, SeatName>; next?: PlayerView['nextOpponent'] }>(), {
  names: () => new Map(),
  next: null,
});

const rows = computed(() => props.table.filter((row) => row.seat !== props.seat).sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp));
const nextSeat = computed(() => nextOpponentSeat(props.table, props.next));
const facelessGhost = computed(() => facelessGhostNext(props.table, props.next));
/** The faceless ghost's place in `named`: no seat stands for it. */
const GHOST = -1;
const named = ref<number | null>(null);
let nameTimer = 0;

function nameOf(seat: number): string {
  if (seat === GHOST) return 'Un fantôme, votre prochain adversaire';
  const name = seatLabel(props.names.get(seat));
  if (seat !== nextSeat.value) return name;
  return props.table.find((row) => row.seat === seat)?.alive ? `${name}, votre prochain adversaire` : `Le fantôme de ${name}, votre prochain adversaire`;
}

function show(seat: number): void {
  window.clearTimeout(nameTimer);
  named.value = named.value === seat ? null : seat;
  nameTimer = window.setTimeout(() => (named.value = null), NAME_MS);
}
onUnmounted(() => window.clearTimeout(nameTimer));
</script>

<template>
  <ol class="opponents" aria-label="Les autres candidats">
    <li v-for="row in rows" :key="row.seat" class="opponent" :class="{ out: !row.alive, next: row.seat === nextSeat }">
      <GameIcon v-if="row.seat === nextSeat" class="next-mark" name="sword" />
      <button type="button" class="face-button" :aria-label="`${nameOf(row.seat)} : ${row.alive ? `${row.hp} sondages, échelon ${row.tier}` : `${row.place}e, éliminé`}`" @click="show(row.seat)">
        <HeadPortrait v-if="row.heroId" class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
        <span v-else class="face empty" />
        <span v-if="row.alive" class="hp"><GameIcon name="heart" />{{ row.hp }}</span>
        <span v-else class="hp place">{{ row.place }}<sup>{{ ordinalSuffix(row.place) }}</sup></span>
      </button>
      <span v-if="named === row.seat" class="name" role="status">{{ nameOf(row.seat) }}</span>
    </li>
    <li v-if="facelessGhost" class="opponent next">
      <GameIcon class="next-mark" name="sword" />
      <button type="button" class="face-button" :aria-label="nameOf(GHOST)" @click="show(GHOST)">
        <span class="face empty ghost">?</span>
      </button>
      <span v-if="named === GHOST" class="name" role="status">{{ nameOf(GHOST) }}</span>
    </li>
  </ol>
</template>

<style scoped>
.opponents { display: flex; justify-content: space-between; gap: 2px; margin: 0; padding: 0 0.3rem; list-style: none; }
.opponent { position: relative; min-width: 0; }
.face-button { display: flex; flex-direction: column; align-items: center; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.face { --portrait-size: 34px; border: 2px solid #9aa3b4; border-radius: 50%; background: #1b2240; }
.empty { display: block; width: 34px; height: 34px; }
.hp { display: inline-flex; align-items: center; gap: 1px; margin-top: -6px; padding: 0 0.3em; border-radius: 999px; background: #a8132a; color: #fff; font: 400 0.8rem / 1.2 var(--font-number); }
.out { opacity: 0.45; filter: grayscale(1); }
/* The next opponent: a red ring and a sword over the face; a ghost's seat stays grey, its mark does not. */
.next .face { border-color: #ff5d50; box-shadow: 0 0 8px rgb(255 93 80 / 0.8); }
.out.next { opacity: 1; filter: none; }
.out.next .face-button { opacity: 0.6; filter: grayscale(1); }
.next-mark { position: absolute; z-index: 2; top: -5px; right: -3px; color: #ff5d50; font-size: 15px; pointer-events: none; }
.ghost { display: flex; align-items: center; justify-content: center; color: #c9cfdc; font: 800 1rem / 1 var(--font-card); }
.place { background: #3a3f4c; }
/* The touched face's name, under it, kept inside the screen by the strip's own edges. */
.name { position: absolute; z-index: 40; top: calc(100% + 4px); left: 50%; translate: -50% 0; width: max-content; max-width: 70vw; padding: 3px 10px; border-radius: 12px; border: 2px solid #111; background: #fff7d6; color: var(--color-ink); font: 800 0.8rem / 1.2 var(--font-card); box-shadow: 3px 4px 0 rgb(0 0 0 / 0.35); pointer-events: none; }
.opponent:first-child .name { left: 0; translate: 0 0; }
.opponent:last-child .name { left: auto; right: 0; translate: 0 0; }
</style>
