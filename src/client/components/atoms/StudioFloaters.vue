<script setup lang="ts">
/**
 * Small things floating up from a set's card: the « Zzz » of a sleepy chamber, the laughs of a loud show, the steam of
 * a dinner. Everything in CSS, each one late on the one before. Sized by --s.
 */
defineProps<{ glyph: string; count: number }>();
</script>

<template>
  <span class="floaters" aria-hidden="true">
    <span v-for="index in count" :key="index" class="floater" :class="{ steam: glyph === 'steam' }" :style="{ '--i': index - 1, '--n': count }">
      <template v-if="glyph !== 'steam'">{{ glyph }}</template>
    </span>
  </span>
</template>

<style scoped>
.floaters { position: absolute; inset: 0; pointer-events: none; }
.floater {
  position: absolute;
  left: calc(var(--s) * 8 + var(--i) * var(--s) * 54);
  bottom: 60%;
  color: #ffffff;
  font: 400 calc(var(--s) * 30) / 1 var(--font-number);
  letter-spacing: 0.04em;
  -webkit-text-stroke: calc(var(--s) * 5) #0c0e18;
  paint-order: stroke fill;
  opacity: 0;
  animation: float-up 5.6s ease-out calc(var(--i) * 5.6s / var(--n)) infinite;
}
.steam {
  width: calc(var(--s) * 26);
  height: calc(var(--s) * 46);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(255 255 255 / 0.55), transparent 70%);
  filter: blur(calc(var(--s) * 5));
}
@keyframes float-up {
  0% { opacity: 0; transform: translate(0, 0) scale(0.6) rotate(-6deg); }
  18% { opacity: 0.9; }
  100% { opacity: 0; transform: translate(calc(var(--s) * 22), calc(var(--s) * -150)) scale(1.25) rotate(8deg); }
}
@media (prefers-reduced-motion: reduce) { .floater { animation: none; } }
</style>
