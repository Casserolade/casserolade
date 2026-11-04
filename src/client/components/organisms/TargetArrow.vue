<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { centerOf } from '#src/client/stores/tableFx.ts';
import type { TableGestures } from '#src/client/stores/useTableGestures.ts';

/** While the player aims at an ally: an arrow from the card that asks to the pointer. */
const props = defineProps<{ gestures: TableGestures }>();

/** The board slides while the placed minion settles: the start of the arrow is read again on every frame. */
const frame = ref(0);
let request = 0;
function tick(): void {
  frame.value++;
  request = requestAnimationFrame(tick);
}
watch(() => props.gestures.targeting.value !== null, (aiming) => {
  cancelAnimationFrame(request);
  if (aiming) request = requestAnimationFrame(tick);
}, { immediate: true });
onUnmounted(() => cancelAnimationFrame(request));

const origin = computed(() => {
  const aim = props.gestures.targeting.value;
  if (!aim) return null;
  void frame.value;
  if (aim.kind === 'cast') return aim.origin;
  if (aim.onto !== undefined) return centerOf(document.querySelector(`[data-board-uid="${aim.onto}"]`));
  return centerOf(document.querySelector('[data-incoming]'));
});

const path = computed(() => {
  const from = origin.value;
  if (!from) return null;
  const to = props.gestures.pointer.value;
  const lift = Math.min(260, Math.hypot(to.x - from.x, to.y - from.y) * 0.45);
  const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
  const angle = Math.atan2(to.y - control.y, to.x - control.x) * (180 / Math.PI);
  return { d: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`, head: `translate(${to.x} ${to.y}) rotate(${angle})`, from };
});
</script>

<template>
  <svg v-if="path" class="arrow" aria-hidden="true">
    <circle class="socket" :cx="path.from.x" :cy="path.from.y" r="14" />
    <path class="shadow" :d="path.d" />
    <path class="line" :d="path.d" />
    <g :transform="path.head"><path class="head" d="M 14 0 L -22 -20 L -12 0 L -22 20 Z" /></g>
  </svg>
</template>

<style scoped>
.arrow { position: fixed; inset: 0; z-index: 45; width: 100vw; height: 100dvh; pointer-events: none; overflow: visible; }
.shadow { fill: none; stroke: rgb(0 0 0 / 0.5); stroke-width: 20; stroke-linecap: round; }
.line { fill: none; stroke: #ffe066; stroke-width: 11; stroke-linecap: round; stroke-dasharray: 22 14; animation: march 0.5s linear infinite; filter: drop-shadow(0 0 6px rgb(255 210 60 / 0.9)); }
.head { fill: #ffe066; stroke: #1a1206; stroke-width: 4; stroke-linejoin: round; }
.socket { fill: #ffe066; stroke: #1a1206; stroke-width: 4; }
@keyframes march { to { stroke-dashoffset: -36; } }
</style>
