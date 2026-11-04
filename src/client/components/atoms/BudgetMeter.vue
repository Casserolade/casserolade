<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';

const FLOAT_MS = 900;

/**
 * The budget of the round: a big coin and its number, a row of coins up to the maximum. Every change floats up.
 * What is already won for the next round shows under it: a gain that comes later is not a lost coin.
 */
const props = withDefaults(defineProps<{ budget: number; max: number; later?: number }>(), { later: 0 });

const coins = computed(() => Array.from({ length: Math.max(props.max, props.budget) }, (_, index) => index < props.budget));
const changes = ref<{ id: number; delta: number }[]>([]);
let nextId = 1;

watch(() => props.budget, (budget, before) => {
  const delta = budget - before;
  if (delta === 0) return;
  const id = nextId++;
  changes.value = [...changes.value, { id, delta }];
  window.setTimeout(() => (changes.value = changes.value.filter((change) => change.id !== id)), FLOAT_MS);
});
</script>

<template>
  <div class="budget" :aria-label="`Budget : ${budget} sur ${max}${later ? `, et ${later} à la prochaine manche` : ''}`">
    <span class="big-coin"><GameIcon name="coin" /></span>
    <span class="amount">{{ budget }}<span class="max">/{{ max }}</span></span>
    <span class="coins" aria-hidden="true">
      <span v-for="(isFull, index) in coins" :key="index" class="coin" :class="{ full: isFull }" />
    </span>
    <span v-if="later > 0" class="later" aria-hidden="true">+{{ later }} à la prochaine manche</span>
    <span v-for="change in changes" :key="change.id" class="change" :class="{ gain: change.delta > 0 }" aria-hidden="true">{{ change.delta > 0 ? '+' : '' }}{{ change.delta }}</span>
  </div>
</template>

<style scoped>
.budget {
  position: relative;
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: calc(var(--s) * 10);
  padding: calc(var(--s) * 8) calc(var(--s) * 22) calc(var(--s) * 10) calc(var(--s) * 12);
  border-radius: calc(var(--s) * 50);
  border: calc(var(--s) * 4) solid #d8b450;
  background: linear-gradient(#1c2240, #0d1124);
  box-shadow: 0 calc(var(--s) * 8) calc(var(--s) * 18) rgb(0 0 0 / 0.6);
}
.big-coin { grid-row: span 2; color: #f5c02a; font-size: calc(var(--s) * 74); --icon-edge: #5a3a06; filter: drop-shadow(0 0 calc(var(--s) * 10) rgb(255 200 40 / 0.6)); }
.amount { color: #ffe27a; font: 400 calc(var(--s) * 58) / 1 var(--font-number); letter-spacing: calc(var(--s) * 1); -webkit-text-stroke: calc(var(--s) * 5) var(--color-ink); paint-order: stroke fill; }
.max { color: #9aa3b8; font-size: calc(var(--s) * 32); -webkit-text-stroke: 0; }
.coins { display: flex; gap: calc(var(--s) * 3); }
.coin { width: calc(var(--s) * 15); height: calc(var(--s) * 15); border-radius: 50%; border: calc(var(--s) * 1.5) solid #5a4a24; background: #2a2518; }
.full { border-color: #7a5a12; background: radial-gradient(circle at 40% 30%, #ffe28a, #d39a1c); }
.change {
  position: absolute;
  left: calc(var(--s) * 70);
  top: calc(var(--s) * -10);
  color: #ff7b7b;
  font: 400 calc(var(--s) * 46) / 1 var(--font-number);
  -webkit-text-stroke: calc(var(--s) * 5) var(--color-ink);
  paint-order: stroke fill;
  pointer-events: none;
  animation: float-up 0.9s ease-out forwards;
}
.gain { color: #7dff9e; }
.later {
  position: absolute;
  right: calc(var(--s) * 18);
  bottom: calc(var(--s) * -30);
  padding: calc(var(--s) * 3) calc(var(--s) * 12);
  border-radius: calc(var(--s) * 16);
  border: calc(var(--s) * 3) solid #1a1206;
  background: #2f8a35;
  color: #fff;
  font: 700 calc(var(--s) * 20) / 1 var(--font-card);
  white-space: nowrap;
}
@keyframes float-up { from { transform: translateY(0) scale(1.3); opacity: 1; } to { transform: translateY(calc(var(--s) * -70)); opacity: 0; } }
</style>
