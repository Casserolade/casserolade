<script setup lang="ts">
/**
 * The set feels a big shock of the combat: a flash of the spotlights, then the lights falter, like a studio whose fuses
 * jumped. `count` changes at each shock (it replays), `strength` from 0.45 to 1.
 */
defineProps<{ count: number; strength: number }>();
</script>

<template>
  <span v-if="count" :key="count" class="flicker" :style="{ '--shock': strength }" aria-hidden="true">
    <span class="flash" />
    <span class="dim" />
  </span>
</template>

<style scoped>
.flicker { position: absolute; inset: 0; pointer-events: none; }
.flash, .dim { position: absolute; inset: 0; opacity: 0; }
.flash {
  background: radial-gradient(ellipse 80% 70% at 50% 35%, rgb(255 246 214 / 0.9), rgb(255 230 170 / 0.25) 55%, transparent 80%);
  mix-blend-mode: screen;
  animation: flash 0.32s ease-out forwards;
}
.dim { background: #020308; animation: falter 0.75s steps(1, end) 0.12s forwards; }
@keyframes flash { 0% { opacity: calc(var(--shock) * 0.9); } 100% { opacity: 0; } }
@keyframes falter {
  0% { opacity: calc(var(--shock) * 0.55); }
  14% { opacity: 0.05; }
  26% { opacity: calc(var(--shock) * 0.4); }
  38% { opacity: 0; }
  52% { opacity: calc(var(--shock) * 0.25); }
  64%, 100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .flash { animation-duration: 0.6s; }
  .dim { animation: none; }
}
</style>
