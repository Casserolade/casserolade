<script setup lang="ts">
/** « Fin de tour », stamped over the table while the end-of-turn effects play: light behind, nothing to close. */
</script>

<template>
  <div class="end-of-turn" role="status" aria-live="polite">
    <span class="rays" aria-hidden="true" />
    <strong>Fin de tour</strong>
  </div>
</template>

<style scoped>
.end-of-turn {
  position: absolute;
  left: 50%;
  top: calc(var(--s) * 300);
  z-index: 20;
  translate: -50% -50%;
  pointer-events: none;
  animation: stamp 0.45s cubic-bezier(0.25, 1.6, 0.45, 1);
}
.rays {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--s) * 900);
  height: calc(var(--s) * 260);
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(255 236 160 / 0.55), rgb(255 200 80 / 0.18) 45%, transparent 70%);
  filter: blur(calc(var(--s) * 6));
  animation: glow 1.2s ease-in-out infinite alternate;
}
strong {
  position: relative;
  display: block;
  color: #fff3c4;
  font: 400 calc(var(--s) * 96) / 1 var(--font-number);
  letter-spacing: calc(var(--s) * 4);
  text-transform: uppercase;
  -webkit-text-stroke: calc(var(--s) * 8) var(--color-ink);
  paint-order: stroke fill;
  text-shadow: 0 0 calc(var(--s) * 30) rgb(255 220 120 / 0.9);
  rotate: -3deg;
}
@keyframes stamp { from { scale: 2.2; opacity: 0; } to { scale: 1; opacity: 1; } }
@keyframes glow { from { opacity: 0.7; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .end-of-turn, .rays { animation: none; }
}
</style>
