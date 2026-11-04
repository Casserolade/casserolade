<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import CardGlossary from '#src/client/components/molecules/CardGlossary.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import { cardInspector } from '#src/client/stores/cardInspector.ts';
import { besideAnchor, stageScale } from '#src/client/tools/stageScale.ts';

const CARD_WIDTH = 360;
const GAP = 14;

/** The full card of what the pointer rests on, beside it, with the keywords explained under it. */
const { inspected } = cardInspector;
const box = useTemplateRef<HTMLElement>('box');
const height = ref(0);
const screen = ref({ width: window.innerWidth, height: window.innerHeight });
let observer: ResizeObserver | null = null;

const place = computed(() => {
  const current = inspected.value;
  if (!current) return null;
  const scale = stageScale(screen.value.width, screen.value.height);
  const width = CARD_WIDTH * scale;
  const shownHeight = height.value || width * (732 / 512);
  const { left, top } = besideAnchor(current.anchor, { width, height: shownHeight }, screen.value, GAP * scale);
  return { left: `${left}px`, top: `${top}px`, width: `${width}px` };
});

function measureScreen(): void {
  screen.value = { width: window.innerWidth, height: window.innerHeight };
}

onMounted(() => {
  window.addEventListener('resize', measureScreen);
  observer = new ResizeObserver(() => (height.value = box.value?.offsetHeight ?? 0));
  if (box.value) observer.observe(box.value);
});
onUnmounted(() => {
  window.removeEventListener('resize', measureScreen);
  observer?.disconnect();
});
</script>

<template>
  <div v-show="inspected && place" ref="box" class="inspector" :style="place ?? {}" aria-hidden="true">
    <template v-if="inspected">
      <ShownCardFace :key="JSON.stringify(inspected.card)" class="card" :card="inspected.card" />
      <CardGlossary :card="inspected.card" />
    </template>
  </div>
</template>

<style scoped>
.inspector { position: fixed; z-index: 60; display: flex; flex-direction: column; gap: calc(var(--s) * 8); pointer-events: none; animation: inspect-in 0.12s ease-out; }
.card { filter: drop-shadow(0 calc(var(--s) * 14) calc(var(--s) * 22) rgb(0 0 0 / 0.7)); }
@keyframes inspect-in { from { opacity: 0; transform: scale(0.94); } }
</style>
