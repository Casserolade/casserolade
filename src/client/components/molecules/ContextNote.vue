<script setup lang="ts">
import type { Context } from '#src/engine/types.ts';

/** A context: the rule of the day that a game may draw, like an Anomaly in Battlegrounds. */
defineProps<{ context: Context }>();
</script>

<template>
  <article class="context">
    <h3>{{ context.name }}</h3>
    <p>{{ context.desc }}</p>
  </article>
</template>

<style scoped>
.context { height: 100%; padding: var(--space-4); border: 2px solid var(--color-border); border-radius: 12px; background: var(--color-surface); }
h3 { margin: 0 0 var(--space-2); color: var(--color-accent); font-family: var(--font-card-title); font-size: var(--font-size-large); }
p { margin: 0; color: var(--color-text); line-height: 1.4; }
</style>
