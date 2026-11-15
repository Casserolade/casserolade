<script setup lang="ts">
import type { VisitorShape } from '#src/client/const/studioVisitors.ts';

/**
 * What passes on a set's ticker now and then (studioVisitors.ts): a small flat drawing, outlined like a cut-out, that
 * comes from the right of its track and moves as its show does. Its parent gives the track its place and its width;
 * sized by --s.
 */
defineProps<{ grid: [number, number]; width: number; shapes: VisitorShape[]; move: 'cross' | 'peek' | 'patrol'; rumbles: boolean; seconds: number }>();
</script>

<template>
  <span class="track" aria-hidden="true">
    <span class="visitor" :class="move" :style="{ width: `calc(var(--s) * ${width})`, animationDuration: `${seconds}s` }">
      <svg class="drawing" :class="{ rumbles }" :viewBox="`0 0 ${grid[0]} ${grid[1]}`">
        <path v-for="shape in shapes" :key="shape.d" :d="shape.d" :fill="shape.fill" />
      </svg>
    </span>
  </span>
</template>

<style scoped>
/* The track clips what has not come in yet; the visitor waits just past its right edge. */
.track { display: block; position: relative; overflow: hidden; container-type: inline-size; pointer-events: none; }
.visitor { display: block; margin-left: 100%; animation: linear infinite; }
.drawing { display: block; width: 100%; overflow: visible; }
.drawing path { stroke: var(--color-ink); stroke-width: 3; stroke-linejoin: round; paint-order: stroke fill; }
.rumbles { animation: visitor-rumble 0.32s steps(2, jump-none) infinite; }
.cross { animation-name: visitor-cross; }
.peek { animation-name: visitor-peek; animation-timing-function: ease-in-out; }
.patrol { animation-name: visitor-patrol; animation-timing-function: ease-in-out; }
@keyframes visitor-cross {
  0% { transform: translateX(0); }
  42%, 100% { transform: translateX(calc(-100cqw - 100%)); }
}
/* It comes in by its own length, wavers while it listens, and backs out. */
@keyframes visitor-peek {
  0%, 4% { transform: translateX(0) rotate(0deg); }
  10% { transform: translateX(-100%) rotate(0deg); }
  15% { transform: translateX(-96%) rotate(-2deg); }
  20% { transform: translateX(-100%) rotate(1.5deg); }
  25% { transform: translateX(-97%) rotate(-1deg); }
  30% { transform: translateX(-100%) rotate(0deg); }
  36%, 100% { transform: translateX(0) rotate(0deg); }
}
@keyframes visitor-patrol {
  0% { transform: translateX(0); }
  10% { transform: translateX(-36cqw); }
  16% { transform: translateX(-26cqw); }
  26% { transform: translateX(-64cqw); }
  32% { transform: translateX(-52cqw); }
  44%, 100% { transform: translateX(calc(-100cqw - 100%)); }
}
@keyframes visitor-rumble {
  from { transform: translateY(0); }
  to { transform: translateY(calc(var(--s) * -2)); }
}
</style>
