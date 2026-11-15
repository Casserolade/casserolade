<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import StudioCard from '#src/client/components/atoms/StudioCard.vue';
import StudioFloaters from '#src/client/components/atoms/StudioFloaters.vue';
import StudioTicker from '#src/client/components/atoms/StudioTicker.vue';
import StudioVisitor from '#src/client/components/atoms/StudioVisitor.vue';
import { STUDIO_VISITORS } from '#src/client/const/studioVisitors.ts';
import { useStudioDressing } from '#src/client/stores/useStudioDressing.ts';
import { studioCardText } from '#src/client/tools/studioCardText.ts';

/** The cards read the time at this pace: a clock ticks once a second, a duel's clock shows its tenths of a turn. */
const TICK_MS = 500;

/**
 * The broadcast dressing of the TV set: the channel's ticker at the foot of the screen, its card in the lower left
 * corner, what floats up from it (studioDetails.ts), and what passes on the ticker now and then (studioVisitors.ts).
 * The ticker draws its lines again each time the set comes on screen: no two visits scroll the same nonsense. With
 * the visual effects off, it stands still: the ticker shows one line, the card its first state, nothing floats or
 * passes.
 */
const props = defineProps<{ plateauId: string }>();

const { detail, still, colors, tickerLines } = useStudioDressing(() => props.plateauId);
const visitor = computed(() => STUDIO_VISITORS[props.plateauId] ?? null);
const elapsed = ref(0);
const cardText = computed(() => (detail.value?.card ? studioCardText(detail.value.card, still.value ? 0 : elapsed.value) : null));
let timer = 0;

onMounted(() => (timer = window.setInterval(() => (elapsed.value += TICK_MS / 1000), TICK_MS)));
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <div v-if="detail" class="details" :style="colors">
    <div v-if="cardText" class="corner">
      <StudioFloaters v-if="detail.floaters && !still" :glyph="detail.floaters.glyph" :count="detail.floaters.count" />
      <StudioCard :text="cardText" />
    </div>
    <StudioVisitor v-if="detail.ticker && visitor && !still" :key="plateauId" class="passage" v-bind="visitor" />
    <StudioTicker v-if="detail.ticker" class="ticker" :label="detail.ticker.label" :lines="tickerLines" :still="still" />
  </div>
</template>

<style scoped>
.details { position: absolute; inset: 0; pointer-events: none; }
/* The lower left corner of the table, between the hero's portrait and the hand. */
.corner { position: absolute; left: calc(50% - var(--s) * 700); bottom: calc(var(--s) * 52); }
/* What passes on the ticker rides its top edge, from the right of the screen to where the ticker starts. */
.passage { position: absolute; left: calc(50% - var(--s) * 742); right: 0; bottom: calc(var(--s) * 36); }
/* The ticker starts past the hero's portrait, which stands in the very corner. */
.ticker { position: absolute; left: calc(50% - var(--s) * 742); right: 0; bottom: 0; border-top-left-radius: calc(var(--s) * 8); overflow: hidden; }
</style>
