<script setup lang="ts">
import StudioTicker from '#src/client/components/atoms/StudioTicker.vue';
import { useStudioDressing } from '#src/client/stores/useStudioDressing.ts';

/**
 * The channel's band on the phone: its ticker alone, in the flow of the screen (the computer's table has the whole
 * dressing, StudioDetails). Sized by --s on a parent.
 */
const props = defineProps<{ plateauId: string }>();
const { detail, still, colors, tickerLines } = useStudioDressing(() => props.plateauId);
</script>

<template>
  <StudioTicker v-if="detail?.ticker" :style="colors" :label="detail.ticker.label" :lines="tickerLines" :still="still" />
</template>
