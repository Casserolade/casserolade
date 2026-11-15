<script setup lang="ts">
import { computed } from 'vue';
import { crashCurvePath } from '#src/client/tools/crashCurvePath.ts';

/**
 * The polls a combat costs, as the evening news would show them: their curve drawn across the table, holding, then
 * falling, the deeper the more was lost, with the points lost at the end of the fall. Drawn once, in a second; `still`
 * shows it already drawn (the visual effects are off). Sized by --s.
 */
const props = defineProps<{ lost: number; still?: boolean }>();

const curve = computed(() => crashCurvePath(props.lost));
</script>

<template>
  <figure class="crash" :class="{ still }" aria-hidden="true">
    <svg viewBox="0 0 760 300">
      <path class="grid" d="M40 60H740M40 130H740M40 200H740M40 270H740" />
      <path class="curve" pathLength="100" :d="curve.path" />
      <path class="arrow" d="M0 0 l-36 -14 l0 28 z" :transform="`translate(${curve.end.x + 18} ${curve.end.y + 8}) rotate(${curve.angle})`" />
    </svg>
    <figcaption class="points" :style="{ left: `calc(var(--s) * ${curve.end.x + 26})`, top: `calc(var(--s) * ${curve.end.y - 30})` }">−{{ lost }}</figcaption>
  </figure>
</template>

<style scoped>
.crash { position: relative; width: calc(var(--s) * 760); height: calc(var(--s) * 300); margin: 0; pointer-events: none; }
svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 calc(var(--s) * 6) calc(var(--s) * 10) rgb(0 0 0 / 0.6)); }
.grid { fill: none; stroke: rgb(255 255 255 / 0.16); stroke-width: 2; stroke-dasharray: 6 10; }
.curve {
  fill: none;
  stroke: #ff5a4a;
  stroke-width: 14;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: curve-draw 0.95s cubic-bezier(0.5, 0, 0.9, 0.6) forwards;
}
.arrow { fill: #ff5a4a; stroke: #1a0a0a; stroke-width: 4; stroke-linejoin: round; opacity: 0; animation: arrow-in 0.2s ease-out 0.9s forwards; }
.points {
  position: absolute;
  color: #ff5a4a;
  font: 400 calc(var(--s) * 96) / 1 var(--font-number);
  -webkit-text-stroke: calc(var(--s) * 10) var(--color-ink);
  paint-order: stroke fill;
  white-space: nowrap;
  opacity: 0;
  animation: points-in 0.35s cubic-bezier(0.3, 1.6, 0.5, 1) 0.95s forwards;
}
.still .curve { animation: none; stroke-dashoffset: 0; }
.still .arrow, .still .points { animation: none; opacity: 1; }
@keyframes curve-draw { to { stroke-dashoffset: 0; } }
@keyframes arrow-in { to { opacity: 1; } }
@keyframes points-in { from { opacity: 0; transform: scale(0.3) rotate(-12deg); } to { opacity: 1; transform: scale(1) rotate(-6deg); } }
@media (prefers-reduced-motion: reduce) {
  .curve { animation: none; stroke-dashoffset: 0; }
  .arrow, .points { animation: none; opacity: 1; }
}
</style>
