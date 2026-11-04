<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';

const HURRY_SECONDS = 15;

/** The end of the turn, where the timer is: the seconds left, and a press ends the recruitment. */
const props = defineProps<{ secondsLeft: number | null; done: boolean }>();
defineEmits<{ ready: [] }>();

const hurry = computed(() => props.secondsLeft !== null && props.secondsLeft <= HURRY_SECONDS && !props.done);
</script>

<template>
  <button type="button" class="ready" :class="{ hurry, done }" :disabled="done" :aria-label="done ? 'En attente des autres joueurs' : 'Terminer le recrutement'" @click="$emit('ready')">
    <span class="dial">
      <GameIcon v-if="secondsLeft === null" class="glass" name="hourglass" />
      <span v-if="secondsLeft !== null" class="seconds">{{ secondsLeft }}</span>
    </span>
    <span class="label">{{ done ? 'En attente' : 'Prêt !' }}</span>
  </button>
</template>

<style scoped>
.ready { position: relative; display: flex; flex-direction: column; align-items: center; gap: calc(var(--s) * 6); padding: 0; background: none; border: none; cursor: pointer; }
.dial {
  position: relative;
  width: calc(var(--s) * 150);
  height: calc(var(--s) * 150);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: calc(var(--s) * 7) solid #d8b450;
  background: radial-gradient(circle at 40% 30%, #3fa45a, #11501f 72%);
  box-shadow: 0 calc(var(--s) * 10) calc(var(--s) * 20) rgb(0 0 0 / 0.6), inset 0 calc(var(--s) * 4) 0 rgb(255 255 255 / 0.25), 0 0 calc(var(--s) * 30) rgb(90 255 120 / 0.35);
  transition: transform 0.1s, filter 0.1s;
}
.glass { color: #fff; font-size: calc(var(--s) * 80); }
.seconds { position: relative; color: #fff; font: 400 calc(var(--s) * 70) / 1 var(--font-number); -webkit-text-stroke: calc(var(--s) * 6) var(--color-ink); paint-order: stroke fill; }
.label { color: #fff; font: 400 calc(var(--s) * 36) / 1 var(--font-number); letter-spacing: calc(var(--s) * 1); -webkit-text-stroke: calc(var(--s) * 5) var(--color-ink); paint-order: stroke fill; }
.ready:hover:not(:disabled) .dial { transform: scale(1.05); filter: brightness(1.15); }
.ready:active:not(:disabled) .dial { transform: scale(0.95); }
.ready:focus-visible .dial { outline: calc(var(--s) * 4) solid var(--color-accent); outline-offset: calc(var(--s) * 4); }
.hurry .dial { background: radial-gradient(circle at 40% 30%, #e0503a, #6a140c 72%); box-shadow: 0 calc(var(--s) * 10) calc(var(--s) * 20) rgb(0 0 0 / 0.6), 0 0 calc(var(--s) * 34) rgb(255 90 60 / 0.6); animation: hurry 1s steps(2, end) infinite; }
.done { cursor: default; }
.done .dial { filter: grayscale(0.8) brightness(0.7); }
@keyframes hurry { 50% { transform: scale(1.07); } }
@media (prefers-reduced-motion: reduce) { .hurry .dial { animation: none; } }
</style>
