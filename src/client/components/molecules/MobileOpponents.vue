<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';

/** The other candidates, in a strip under the bar: the healthiest first, the eliminated last, with their place. */
const props = defineProps<{ table: PlayerView['table']; seat: number }>();

const rows = computed(() => props.table.filter((row) => row.seat !== props.seat).sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp));
</script>

<template>
  <ol class="opponents" aria-label="Les autres candidats">
    <li v-for="row in rows" :key="row.seat" class="opponent" :class="{ out: !row.alive }" :aria-label="`${row.heroId ? HERO_BY_ID[row.heroId]?.name : 'Candidat'} : ${row.alive ? `${row.hp} sondages, échelon ${row.tier}` : `${row.place}e, éliminé`}`">
      <HeadPortrait v-if="row.heroId" class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
      <span v-else class="face empty" />
      <span v-if="row.alive" class="hp"><GameIcon name="heart" />{{ row.hp }}</span>
      <span v-else class="hp place">{{ row.place }}<sup>{{ ordinalSuffix(row.place) }}</sup></span>
    </li>
  </ol>
</template>

<style scoped>
.opponents { display: flex; justify-content: space-between; gap: 2px; margin: 0; padding: 0 0.3rem; list-style: none; }
.opponent { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.face { --portrait-size: 34px; border: 2px solid #9aa3b4; border-radius: 50%; background: #1b2240; }
.empty { display: block; width: 34px; height: 34px; }
.hp { display: inline-flex; align-items: center; gap: 1px; margin-top: -6px; padding: 0 0.3em; border-radius: 999px; background: #a8132a; color: #fff; font: 400 0.8rem / 1.2 var(--font-number); }
.out { opacity: 0.45; filter: grayscale(1); }
.place { background: #3a3f4c; }
</style>
