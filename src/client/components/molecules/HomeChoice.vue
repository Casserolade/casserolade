<script setup lang="ts">
/**
 * One way to play, on the home page: its name (and a word beside it, `aside`), a sentence or two, and what starts
 * it, at the bottom.
 */
defineProps<{ title: string }>();
</script>

<template>
  <article class="choice">
    <header class="head">
      <h3>{{ title }}</h3>
      <span v-if="$slots.aside" class="aside"><slot name="aside" /></span>
    </header>
    <slot />
  </article>
</template>

<style scoped>
/* A container: what it holds (a field and its button) lays itself out by the card's width. */
.choice {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  min-width: 0;
  padding: 0.6rem 0.75rem 0.7rem;
  border-radius: 12px;
  border: 1px solid rgb(255 255 255 / 0.12);
  background: rgb(255 255 255 / 0.04);
}
/* What starts it sits at the bottom, whatever the text above it. */
.choice > :last-child { margin-top: auto; }
.choice :deep(form) { width: 100%; }
.head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.2rem 1rem; width: 100%; }
h3 { margin: 0; color: #fff; font: 400 1.2rem / 1.05 var(--font-number); letter-spacing: 0.5px; }
.aside { color: var(--color-title); font-size: 0.9rem; font-weight: 700; }
.choice :deep(p) { margin: 0; color: #c9cfdc; font-size: 0.92rem; line-height: 1.25; }
.choice :deep(p strong) { color: var(--color-title); letter-spacing: 0.1em; }
.choice :deep(.app-button) { white-space: nowrap; }
</style>
