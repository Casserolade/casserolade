<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { KOFI_URL } from '#src/client/const/supportLink.ts';

/**
 * The Ko-fi link of the home page: a quiet link among those of the footer, which takes their look from the line it
 * sits in. The reporter throws its suitcases of banknotes at it (useSuitcaseThrow.ts): it jolts and shines at each
 * one caught. `caught` counts them; its parity restarts the jolt.
 */
defineProps<{ caught: number }>();
</script>

<template>
  <a
    :href="KOFI_URL"
    target="_blank"
    rel="noopener"
    class="tip-link"
    :class="{ 'caught-odd': caught % 2 === 1, 'caught-even': caught > 0 && caught % 2 === 0 }"
    title="Soutenir Casserolade sur Ko-fi"
    data-suitcase-target
  >
    <GameIcon name="suitcase" /> Financer la campagne
  </a>
</template>

<style scoped>
/* A block of its own, so that it can jolt. */
.tip-link { display: inline-flex; align-items: center; gap: 0.35em; }
/* Two identical jolts, one per parity: switching class restarts the animation at each suitcase caught. */
.caught-odd { animation: caught-odd 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
.caught-even { animation: caught-even 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes caught-odd { 20% { scale: 1.25; rotate: -5deg; color: var(--color-title); text-shadow: 0 0 14px rgb(255 216 74 / 0.9); } 45% { rotate: 4deg; } 70% { rotate: -2deg; } }
@keyframes caught-even { 20% { scale: 1.25; rotate: -5deg; color: var(--color-title); text-shadow: 0 0 14px rgb(255 216 74 / 0.9); } 45% { rotate: 4deg; } 70% { rotate: -2deg; } }
</style>
