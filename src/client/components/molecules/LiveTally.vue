<script setup lang="ts">
import type { LiveTallyItem } from '#src/client/tools/liveTallyItems.ts';

/** The home page's « en direct », like a TV set's: the games in progress and the players online. */
defineProps<{ items: LiveTallyItem[] }>();
</script>

<template>
  <p v-if="items.length" class="live-tally">
    <span class="on-air"><span class="dot" aria-hidden="true" /> En direct</span>
    <span v-for="item in items" :key="item.label" class="item"><strong>{{ item.value }}</strong> {{ item.label }}</span>
  </p>
</template>

<style scoped>
.live-tally { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.9rem; margin: 0; color: var(--color-text); font-weight: 700; }
.on-air { display: inline-flex; align-items: center; gap: 0.4em; padding: 0.15em 0.6em; border-radius: 6px; background: var(--color-on-air); color: #fff; font: 400 1.05rem / 1.2 var(--font-number); letter-spacing: 1px; text-transform: uppercase; }
.dot { width: 0.55em; height: 0.55em; border-radius: 50%; background: #fff; animation: on-air 1.4s ease-in-out infinite; }
.item strong { color: var(--color-title); font: 400 1.5rem / 1 var(--font-number); letter-spacing: 1px; }
@keyframes on-air { 50% { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
</style>
