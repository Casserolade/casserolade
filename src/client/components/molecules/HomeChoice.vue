<script setup lang="ts">
/** One way to play, on the home page: its name, a sentence or two, and what starts it, at the bottom. */
defineProps<{ title: string }>();
</script>

<template>
  <article class="choice">
    <h3>{{ title }}</h3>
    <slot />
  </article>
</template>

<style scoped>
.choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.9rem 1rem 1rem;
  border-radius: 16px;
  border: 2px solid rgb(255 255 255 / 0.1);
  background: rgb(255 255 255 / 0.04);
}
/* What starts it sits at the bottom, whatever the text above it. */
.choice > :last-child { margin-top: auto; }
.choice :deep(form) { width: 100%; }
h3 { margin: 0; color: #fff; font: 400 1.55rem / 1.05 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; }
.choice :deep(p) { margin: 0; color: #c9cfdc; font-size: 1.02rem; line-height: 1.3; }
.choice :deep(p strong) { color: var(--color-title); letter-spacing: 0.1em; }
.choice :deep(.app-button) { white-space: nowrap; font-size: 1.35rem; }
</style>
