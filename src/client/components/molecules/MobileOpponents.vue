<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { seatLabel } from '#src/client/tools/seatNames.ts';
import type { SeatName } from '#src/client/tools/seatNames.ts';
import type { PlayerView } from '#src/engine/game.ts';

/** How long a touched face keeps its name: nothing to close, it goes away by itself. */
const NAME_MS = 2500;

/**
 * The other candidates, in a strip under the bar: the healthiest first, the eliminated last, with their place. A touch
 * on a face names it (the hero, and online the pseudo), for a moment.
 */
const props = withDefaults(defineProps<{ table: PlayerView['table']; seat: number; names?: Map<number, SeatName> }>(), { names: () => new Map() });

const rows = computed(() => props.table.filter((row) => row.seat !== props.seat).sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp));
const named = ref<number | null>(null);
let nameTimer = 0;

function nameOf(seat: number): string {
  return seatLabel(props.names.get(seat));
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
    <li v-for="row in rows" :key="row.seat" class="opponent" :class="{ out: !row.alive }">
      <button type="button" class="face-button" :aria-label="`${nameOf(row.seat)} : ${row.alive ? `${row.hp} sondages, échelon ${row.tier}` : `${row.place}e, éliminé`}`" @click="show(row.seat)">
        <HeadPortrait v-if="row.heroId" class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
        <span v-else class="face empty" />
        <span v-if="row.alive" class="hp"><GameIcon name="heart" />{{ row.hp }}</span>
        <span v-else class="hp place">{{ row.place }}<sup>{{ ordinalSuffix(row.place) }}</sup></span>
      </button>
      <span v-if="named === row.seat" class="name" role="status">{{ nameOf(row.seat) }}</span>
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
.place { background: #3a3f4c; }
/* The touched face's name, under it, kept inside the screen by the strip's own edges. */
.name { position: absolute; z-index: 40; top: calc(100% + 4px); left: 50%; translate: -50% 0; width: max-content; max-width: 70vw; padding: 3px 10px; border-radius: 12px; border: 2px solid #111; background: #fff7d6; color: var(--color-ink); font: 800 0.8rem / 1.2 var(--font-card); box-shadow: 3px 4px 0 rgb(0 0 0 / 0.35); pointer-events: none; }
.opponent:first-child .name { left: 0; translate: 0 0; }
.opponent:last-child .name { left: auto; right: 0; translate: 0 0; }
</style>
