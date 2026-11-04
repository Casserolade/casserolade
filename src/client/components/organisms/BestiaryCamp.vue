<script setup lang="ts">
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import type { BestiaryCamp } from '#src/client/tools/bestiaryCamps.ts';

/** A camp of the bestiary: its politicians as their full cards, from the lowest tier up, each with its casseroles. */
defineProps<{ camp: BestiaryCamp }>();
</script>

<template>
  <section :id="camp.camp" class="camp" :style="{ '--camp-color': `var(--camp-${camp.camp})` }">
    <h2>{{ camp.label }} <span class="count">{{ camp.entries.length }} politiques</span></h2>
    <ul class="cards">
      <li v-for="entry in camp.entries" :key="entry.face.cardId" class="entry">
        <ShownCardFace :card="{ kind: 'minion', face: entry.face }" />
        <p v-if="entry.casseroles.length" class="casseroles"><strong>Casseroles</strong> {{ entry.casseroles.join(' · ') }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.camp { scroll-margin-top: var(--space-4); }
h2 {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 4px solid var(--camp-color);
  color: var(--color-text);
  font: 400 2.2rem / 1 var(--font-number);
  letter-spacing: 1px;
}
.count { color: var(--color-text-muted); font: 500 var(--font-size-normal) / 1 var(--font-card); letter-spacing: 0; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr)); gap: var(--space-5) var(--space-4); margin: 0; padding: 0; list-style: none; }
.entry { display: flex; flex-direction: column; gap: var(--space-2); }
.casseroles { color: var(--color-text-muted); font-size: var(--font-size-small); line-height: 1.35; }
.casseroles strong { display: block; color: var(--color-accent); font-family: var(--font-card-title); }
</style>
