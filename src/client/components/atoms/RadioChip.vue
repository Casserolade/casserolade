<script setup lang="ts">
/**
 * One choice among several, drawn as a chip. A real radio button sits inside: the keyboard and screen readers
 * work, and the chosen chip is filled, not only coloured. `color` and `textColor` are CSS values (tokens).
 */
withDefaults(defineProps<{ name: string; checked: boolean; color?: string; textColor?: string }>(), {
  color: 'var(--color-accent)',
  textColor: 'var(--color-accent-text)',
});
const emit = defineEmits<{ select: [] }>();
</script>

<template>
  <label class="chip" :style="{ '--chip': color, '--chip-text': textColor }">
    <input type="radio" :name="name" :checked="checked" @change="emit('select')" />
    <slot />
  </label>
</template>

<style scoped>
.chip {
  position: relative;
  display: inline-block;
  padding: 0.25em 0.85em;
  border: 2px solid var(--chip);
  border-radius: 999px;
  color: var(--color-text);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.chip:hover { background: color-mix(in srgb, var(--chip) 25%, transparent); }
.chip:has(input:checked) { background: var(--chip); color: var(--chip-text); }
.chip:has(input:focus-visible) { outline: 3px solid var(--color-accent); outline-offset: 2px; }
input { position: absolute; opacity: 0; pointer-events: none; }
</style>
