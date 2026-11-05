<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { KOFI_URL } from '#src/client/const/supportLink.ts';

/**
 * The Ko-fi link of the home page, where the reporter throws its suitcases of banknotes (useSuitcaseThrow.ts):
 * it jolts and shines at each one caught. `caught` counts them; its parity restarts the jolt.
 */
defineProps<{ caught: number }>();
</script>

<template>
  <AppButton
    :href="KOFI_URL"
    target="_blank"
    class="tip-link"
    :class="{ 'caught-odd': caught % 2 === 1, 'caught-even': caught > 0 && caught % 2 === 0 }"
    title="Soutenir Casserolade sur Ko-fi"
    data-suitcase-target
  >
    <GameIcon name="suitcase" /> Financer la campagne <span class="via">sur Ko-fi</span>
  </AppButton>
</template>

<style scoped>
.tip-link { background: linear-gradient(#3f8a4a, #1b4a24); }
.via { font-size: 0.7em; opacity: 0.85; }
/* Two identical jolts, one per parity: switching class restarts the animation at each suitcase caught. */
.caught-odd { animation: caught-odd 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
.caught-even { animation: caught-even 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes caught-odd { 20% { scale: 1.18; rotate: -5deg; box-shadow: 0 0 34px rgb(255 216 74 / 0.9), 0 5px 12px rgb(0 0 0 / 0.5); } 45% { rotate: 4deg; } 70% { rotate: -2deg; } }
@keyframes caught-even { 20% { scale: 1.18; rotate: -5deg; box-shadow: 0 0 34px rgb(255 216 74 / 0.9), 0 5px 12px rgb(0 0 0 / 0.5); } 45% { rotate: 4deg; } 70% { rotate: -2deg; } }
</style>
