<script setup lang="ts">
/** A word of the game and its rule; for a keyword of the cards, the link to the politicians who carry it. */
defineProps<{ term: string; rule: string; politicians: number; link: string | null }>();
</script>

<template>
  <article class="keyword">
    <h3>{{ term }}</h3>
    <p>{{ rule }}</p>
    <a v-if="link && politicians > 0" :href="link">Voir {{ politicians > 1 ? `les ${politicians} politiques` : 'le politique' }}</a>
  </article>
</template>

<style scoped>
.keyword { display: flex; flex-direction: column; gap: var(--space-2); height: 100%; box-sizing: border-box; padding: var(--space-3) var(--space-4); border: 2px solid var(--color-border); border-radius: 12px; background: var(--color-surface); }
h3 { margin: 0; color: var(--color-accent); font: 800 var(--font-size-large) / 1.1 var(--font-card-title); }
p { margin: 0; color: var(--color-text); line-height: 1.4; }
a { margin-top: auto; color: var(--color-accent); font-size: var(--font-size-small); font-weight: 700; }
</style>
