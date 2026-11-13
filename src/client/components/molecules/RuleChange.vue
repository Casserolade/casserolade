<script setup lang="ts">
/** A rule of the update notes: what it said, what it says now; or a new rule. */
defineProps<{ term: string; before?: string; after: string }>();
</script>

<template>
  <article class="rule">
    <h4>{{ term }}<span v-if="!before" class="new">Nouveau</span></h4>
    <p v-if="before" class="before"><strong>Avant</strong> {{ before }}</p>
    <p class="after"><strong>{{ before ? 'Maintenant' : 'Règle' }}</strong> {{ after }}</p>
  </article>
</template>

<style scoped>
.rule { display: flex; flex-direction: column; gap: var(--space-2); height: 100%; box-sizing: border-box; padding: var(--space-3) var(--space-4); border: 2px solid var(--color-border); border-radius: 12px; background: var(--color-surface); }
h4 { display: flex; align-items: baseline; gap: var(--space-2); margin: 0; color: var(--color-accent); font: 800 var(--font-size-large) / 1.1 var(--font-card-title); }
.new { padding: 0.1em 0.5em; border-radius: 999px; background: var(--color-accent); color: var(--color-ink); font-size: var(--font-size-small); }
p { margin: 0; line-height: 1.4; }
strong { display: block; font: 800 var(--font-size-small) / 1.2 var(--font-card-title); text-transform: uppercase; letter-spacing: 1px; }
.before { color: var(--color-text-muted); }
.after { color: var(--color-text); }
.after strong { color: var(--color-accent); }
</style>
