<script setup lang="ts">
const COLORS = ['#ff4a5a', '#ffd84a', '#3fa0ff', '#7dff9e', '#ff6ad5', '#ffffff'];
const PIECES = 46;

/** A number between 0 and 1 that looks random and stays the same from one render to the next. */
function scatter(seed: number): number {
  const value = Math.sin(seed * 91.7) * 43758.5453;
  return value - Math.floor(value);
}

/** Confetti bursting from a point and falling: the celebration of a victory. Pure CSS, gone in two seconds. */
const pieces = Array.from({ length: PIECES }, (_, index) => {
  const angle = scatter(index + 1) * Math.PI * 2;
  const reach = 120 + scatter(index + 7) * 260;
  return {
    '--x': `${Math.cos(angle) * reach}`,
    '--y': `${Math.sin(angle) * reach * 0.7 - 120}`,
    '--fall': `${220 + scatter(index + 3) * 240}`,
    '--spin': `${(scatter(index + 5) - 0.5) * 1440}deg`,
    '--delay': `${scatter(index + 11) * 0.15}s`,
    '--w': `${8 + scatter(index + 13) * 10}`,
    background: COLORS[index % COLORS.length],
  };
});
</script>

<template>
  <span class="confetti" aria-hidden="true">
    <i v-for="(style, index) in pieces" :key="index" :style="style" />
  </span>
</template>

<style scoped>
.confetti { position: absolute; width: 0; height: 0; pointer-events: none; }
i {
  position: absolute;
  width: calc(var(--s) * var(--w));
  height: calc(var(--s) * var(--w) * 0.45);
  border-radius: calc(var(--s) * 2);
  animation: confetti 2.2s cubic-bezier(0.15, 0.7, 0.4, 1) var(--delay) both;
}
@keyframes confetti {
  0% { transform: translate(0, 0) rotate(0) scale(0.3); opacity: 1; }
  35% { transform: translate(calc(var(--s) * var(--x)), calc(var(--s) * var(--y))) rotate(calc(var(--spin) * 0.4)) scale(1); opacity: 1; }
  100% { transform: translate(calc(var(--s) * var(--x) * 1.15), calc(var(--s) * (var(--y) + var(--fall)))) rotate(var(--spin)) scale(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) { i { animation-duration: 0.01s; } }
</style>
