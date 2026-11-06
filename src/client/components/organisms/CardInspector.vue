<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import CardGlossary from '#src/client/components/molecules/CardGlossary.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import { cardInspector } from '#src/client/stores/cardInspector.ts';
import { besideAnchor, stageScale } from '#src/client/tools/stageScale.ts';

const CARD_WIDTH = 400;
const PANEL_WIDTH = 340;
const GAP = 14;
const CARD_RATIO = 732 / 512;

/**
 * The full card of what the pointer rests on, beside it, and its keywords explained beside the card: side by side,
 * the whole of it stays on the screen. The card is the one next to what is pointed at; the panel goes further out.
 */
const { inspected } = cardInspector;
const box = useTemplateRef<HTMLElement>('box');
const measured = ref({ width: 0, height: 0 });
const screen = ref({ width: window.innerWidth, height: window.innerHeight });
let observer: ResizeObserver | null = null;

const place = computed(() => {
  const current = inspected.value;
  if (!current) return null;
  const scale = stageScale(screen.value.width, screen.value.height);
  const estimate = { width: (CARD_WIDTH + GAP + PANEL_WIDTH) * scale, height: CARD_WIDTH * CARD_RATIO * scale };
  const size = { width: measured.value.width || estimate.width, height: measured.value.height || estimate.height };
  const { left, top } = besideAnchor(current.anchor, size, screen.value, GAP * scale);
  return {
    onLeft: left < current.anchor.left,
    style: { left: `${left}px`, top: `${top}px`, '--card-width': `${CARD_WIDTH * scale}px`, '--panel-width': `${PANEL_WIDTH * scale}px`, '--gap': `${GAP * scale}px` },
  };
});

function measureScreen(): void {
  screen.value = { width: window.innerWidth, height: window.innerHeight };
}

function measureBox(): void {
  measured.value = { width: box.value?.offsetWidth ?? 0, height: box.value?.offsetHeight ?? 0 };
}

onMounted(() => {
  window.addEventListener('resize', measureScreen);
  observer = new ResizeObserver(measureBox);
  if (box.value) observer.observe(box.value);
});
onUnmounted(() => {
  window.removeEventListener('resize', measureScreen);
  observer?.disconnect();
});
</script>

<template>
  <div v-show="inspected && place" ref="box" class="inspector" :class="{ 'on-left': place?.onLeft }" :style="place?.style ?? {}" aria-hidden="true">
    <template v-if="inspected">
      <ShownCardFace :key="JSON.stringify(inspected.card)" class="card" :card="inspected.card" />
      <CardGlossary class="panel" :card="inspected.card" />
    </template>
  </div>
</template>

<style scoped>
.inspector { position: fixed; z-index: 60; display: flex; align-items: flex-start; gap: var(--gap); width: max-content; pointer-events: none; animation: inspect-in 0.12s ease-out; }
/* On the left of what is pointed at, the card still stands next to it: the panel goes first. */
.on-left { flex-direction: row-reverse; }
.inspector > .card { flex: none; width: var(--card-width); filter: drop-shadow(0 calc(var(--s) * 14) calc(var(--s) * 22) rgb(0 0 0 / 0.7)); }
.inspector > .panel { flex: none; box-sizing: border-box; width: var(--panel-width); }
@keyframes inspect-in { from { opacity: 0; transform: scale(0.94); } }
</style>
