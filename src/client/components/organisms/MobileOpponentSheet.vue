<script setup lang="ts">
import MobileSheet from '#src/client/components/molecules/MobileSheet.vue';
import OpponentSheet from '#src/client/components/molecules/OpponentSheet.vue';
import type { OpponentAbout } from '#src/client/tools/opponentAbout.ts';

/**
 * A player of the table, opened by a touch on its face on a phone: what the computer shows on hover (its power, its
 * board at the last combat against it, its last combats), at a reading size. A touch outside closes it.
 */
defineProps<{ about: OpponentAbout }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <MobileSheet label="Le candidat" @close="$emit('close')">
    <div class="scroll"><OpponentSheet class="about" :about="about" /></div>
  </MobileSheet>
</template>

<style scoped>
.scroll { --s: 0.86px; padding: 0.6rem 0.6rem calc(0.8rem + env(safe-area-inset-bottom)); overflow-y: auto; overscroll-behavior: contain; }
/* The sheet is the box: what it holds takes its width, without a frame of its own. */
.about { width: 100%; border: none; background: none; box-shadow: none; }
</style>
