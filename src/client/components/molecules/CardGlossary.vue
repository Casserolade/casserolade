<script setup lang="ts">
import { computed } from 'vue';
import { glossaryFor } from '#src/client/tools/glossaryFor.ts';
import { shownCardLines } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';

/** Under a card: what each of its keywords means. For a casserole, the joke it makes. */
const props = defineProps<{ card: ShownCard }>();

/** A minion that still carries casseroles the people remember: the scandal is explained too. */
const remembered = computed(() => props.card.kind === 'minion' && (props.card.face.casseroles?.length ?? 0) > (props.card.face.oublie ?? 0));
const entries = computed(() => glossaryFor([...shownCardLines(props.card), ...(remembered.value ? ['**Scandale**'] : [])]));
const joke = computed(() => (props.card.kind === 'casserole' ? props.card.casserole : null));
</script>

<template>
  <span v-if="entries.length || joke" class="glossary">
    <span v-for="entry in entries" :key="entry.term" class="entry"><strong>{{ entry.term }}</strong> {{ entry.rule }}</span>
    <span v-if="joke" class="entry joke">{{ joke.blague }}</span>
    <span v-if="joke?.citation" class="entry quote">« {{ joke.citation }} »</span>
  </span>
</template>

<style scoped>
.glossary {
  display: flex;
  flex-direction: column;
  gap: calc(var(--s) * 6);
  padding: calc(var(--s) * 10) calc(var(--s) * 14);
  border-radius: calc(var(--s) * 14);
  border: calc(var(--s) * 2) solid rgb(255 255 255 / 0.18);
  background: rgb(12 14 24 / 0.94);
  box-shadow: 0 calc(var(--s) * 10) calc(var(--s) * 30) rgb(0 0 0 / 0.6);
  color: #e8eaf0;
  font: 500 calc(var(--s) * 23) / 1.22 var(--font-card);
  text-align: left;
  text-shadow: none;
}
.entry { display: block; }
strong { display: block; color: var(--color-accent); font: 800 calc(var(--s) * 24) / 1.1 var(--font-card-title); }
.joke { font-style: italic; color: #fff; }
.quote { color: var(--color-accent); }
</style>
