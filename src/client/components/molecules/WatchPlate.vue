<script setup lang="ts">
import OnAirBadge from '#src/client/components/atoms/OnAirBadge.vue';

/**
 * Out of the game, on the table of the survivor followed, where « Prêt ! » stands for a player: whose table this is,
 * the time it has left, and the way back to the list of survivors to follow another one.
 */
defineProps<{ name: string; secondsLeft: number | null }>();
defineEmits<{ change: [] }>();
</script>

<template>
  <div class="watch-plate" role="status">
    <OnAirBadge />
    <span class="who">Vous suivez <strong>{{ name }}</strong></span>
    <span v-if="secondsLeft !== null" class="seconds" aria-label="Temps restant">{{ secondsLeft }} s</span>
    <button type="button" class="change" @click="$emit('change')">Changer</button>
  </div>
</template>

<style scoped>
.watch-plate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--s) * 8);
  width: calc(var(--s) * 220);
  box-sizing: border-box;
  padding: calc(var(--s) * 12) calc(var(--s) * 10);
  border-radius: calc(var(--s) * 18);
  border: calc(var(--s) * 3) solid #111;
  background: #fff7d6;
  color: var(--color-ink);
  box-shadow: calc(var(--s) * 4) calc(var(--s) * 5) 0 rgb(0 0 0 / 0.35);
  text-align: center;
}
.who { font: 700 calc(var(--s) * 22) / 1.15 var(--font-card); overflow-wrap: anywhere; }
.who strong { display: block; font-weight: 800; font-size: calc(var(--s) * 26); }
.seconds { font: 400 calc(var(--s) * 34) / 1 var(--font-number); letter-spacing: calc(var(--s) * 1); }
.change { padding: calc(var(--s) * 6) calc(var(--s) * 18); border-radius: 999px; border: calc(var(--s) * 3) solid #d8b450; background: linear-gradient(#2a3a6a, #121a38); color: #fff; font: 400 calc(var(--s) * 24) / 1 var(--font-number); letter-spacing: calc(var(--s) * 1); cursor: pointer; }
.change:hover { filter: brightness(1.2); }
</style>
