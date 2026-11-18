<script setup lang="ts">
import type { GainList } from '#src/client/tools/gainLines.ts';

/**
 * Where a politician's bonuses come from, beside its card: their total, then one line per source, who gave it and
 * what it gave. Sized by the panel that holds it.
 */
defineProps<{ list: GainList }>();
</script>

<template>
  <span class="gains">
    <span class="line head"><strong class="who">Bonus</strong><b v-if="list.total" class="stats">{{ list.total }}</b></span>
    <span v-for="line in list.lines" :key="line.label" class="line">
      <span class="who">{{ line.label }}</span>
      <b v-if="line.stats" class="stats">{{ line.stats }}</b>
      <span v-if="line.keywords.length" class="words">{{ line.keywords.join(', ') }}</span>
    </span>
  </span>
</template>

<style scoped>
.gains { display: flex; flex-direction: column; gap: calc(var(--s) * 3); color: #fff; }
/* The source on the left, its numbers on the right; the keywords it gave under them, on the right too. */
.line { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; column-gap: calc(var(--s) * 12); }
.who { min-width: 0; overflow-wrap: anywhere; }
.stats { flex: none; margin-left: auto; font-weight: 800; font-variant-numeric: tabular-nums; }
.words { flex: 0 0 100%; color: var(--color-accent); font-size: 0.9em; font-weight: 700; text-align: right; }
.head { padding-bottom: calc(var(--s) * 4); border-bottom: calc(var(--s) * 2) solid rgb(255 255 255 / 0.14); }
.head .who { color: var(--color-accent); font: 800 calc(var(--s) * 21) / 1 var(--font-card-title); text-transform: uppercase; letter-spacing: 0.04em; }
.head .stats { color: var(--color-accent); }
</style>
