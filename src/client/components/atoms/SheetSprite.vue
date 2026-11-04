<script setup lang="ts">
/** An effect from a sprite sheet, drawn at the place its parent gives it. Plays by itself, in CSS. */
defineProps<{ sprite: Record<string, string> }>();
</script>

<template>
  <span class="sheet" :style="sprite" aria-hidden="true" />
</template>

<style scoped>
.sheet {
  --frame-width: calc(var(--u) * var(--sheet-width));
  --frame-height: calc(var(--u) * var(--sheet-height));
  position: absolute;
  display: block;
  width: var(--frame-width);
  height: var(--frame-height);
  pointer-events: none;
  background-image: var(--sheet-image);
  background-repeat: no-repeat;
  background-size: calc(var(--frame-width) * var(--sheet-cols)) calc(var(--frame-height) * var(--sheet-rows));
  animation:
    sheet-column var(--sheet-row-seconds) steps(var(--sheet-cols), jump-none) var(--sheet-row-repeat) forwards,
    sheet-row var(--sheet-total-seconds) steps(var(--sheet-rows), jump-none) var(--sheet-repeat) forwards;
}
@keyframes sheet-column {
  from { background-position-x: 0; }
  to { background-position-x: calc(var(--frame-width) * (var(--sheet-cols) - 1) * -1); }
}
@keyframes sheet-row {
  from { background-position-y: 0; }
  to { background-position-y: calc(var(--frame-height) * (var(--sheet-rows) - 1) * -1); }
}
</style>
