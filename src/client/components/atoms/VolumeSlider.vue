<script setup lang="ts">
/** A volume, from 0 to 100 by steps of 5: `slide` while it moves, `settle` once it is let go. Sized by its parent. */
defineProps<{ percent: number; label: string }>();
const emit = defineEmits<{ slide: [percent: number]; settle: [] }>();

function slide(event: Event): void {
  emit('slide', Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <input class="volume" type="range" min="0" max="100" step="5" :value="percent" :aria-label="label" @input="slide" @change="emit('settle')" />
</template>

<style scoped>
/* A bare slider: the page's frame for text fields is not for it. */
.volume { margin: 0; padding: 0; border: 0; background: none; accent-color: var(--color-accent); cursor: pointer; }
</style>
