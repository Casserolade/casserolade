<script setup lang="ts">
import { computed } from 'vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import { glossaryFor } from '#src/client/tools/glossaryFor.ts';
import { shownCardLines } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import { wornCasseroleLines } from '#src/client/tools/wornCasseroleLines.ts';

const POINT_HINT = 'Pointez une casserole sous le médaillon pour voir son effet.';

/**
 * Beside a card: what each of its keywords means, one entry a line or two. A casserole pointed on the board says
 * first what it does now; a casserole also tells its joke. A politician of the board with casseroles says they can be
 * pointed at.
 */
const props = defineProps<{ card: ShownCard }>();

/** A minion that still carries casseroles the people remember: the scandal is explained too. */
const remembered = computed(() => props.card.kind === 'minion' && (props.card.face.casseroles?.length ?? 0) > (props.card.face.oublie ?? 0));
const worn = computed(() => (props.card.kind === 'casserole' && props.card.worn ? wornCasseroleLines(props.card.casserole, props.card.worn) : []));
const entries = computed(() => glossaryFor([...worn.value, ...shownCardLines(props.card), ...(remembered.value ? ['**Scandale**'] : [])]));
const joke = computed(() => (props.card.kind === 'casserole' ? props.card.casserole : null));
const pointable = computed(() => props.card.kind === 'minion' && Boolean(props.card.onBoard) && (props.card.face.casseroles?.length ?? 0) > 0);
</script>

<template>
  <span v-if="worn.length || entries.length || joke || pointable" class="glossary">
    <span v-if="worn.length" class="entry worn"><RichText v-for="line in worn" :key="line" class="worn-line" :text="line" /></span>
    <span v-for="entry in entries" :key="entry.term" class="entry"><strong>{{ entry.term }}</strong> {{ entry.rule }}</span>
    <span v-if="joke" class="entry joke">{{ joke.blague }}</span>
    <span v-if="joke?.citation" class="entry quote">« {{ joke.citation }} »</span>
    <span v-if="pointable" class="entry hint">{{ POINT_HINT }}</span>
  </span>
</template>

<style scoped>
.glossary {
  display: flex;
  flex-direction: column;
  gap: calc(var(--s) * 7);
  padding: calc(var(--s) * 10) calc(var(--s) * 14);
  border-radius: calc(var(--s) * 14);
  border: calc(var(--s) * 2) solid rgb(255 255 255 / 0.18);
  background: rgb(12 14 24 / 0.94);
  box-shadow: 0 calc(var(--s) * 10) calc(var(--s) * 30) rgb(0 0 0 / 0.6);
  color: #e8eaf0;
  font: 500 calc(var(--s) * 20) / 1.25 var(--font-card);
  text-align: left;
  text-shadow: none;
}
.entry { display: block; }
/* The term starts its entry, on the same line: one line saved per keyword. */
.entry > strong { margin-right: 0.25em; color: var(--color-accent); font: 800 calc(var(--s) * 21) / 1 var(--font-card-title); }
/* What a pointed casserole does now, set apart from the glossary under it. */
.worn { display: flex; flex-direction: column; gap: calc(var(--s) * 4); padding-bottom: calc(var(--s) * 8); border-bottom: calc(var(--s) * 2) solid rgb(255 255 255 / 0.14); color: #fff; font-weight: 600; }
.worn-line { display: block; }
.worn :deep(strong) { color: var(--color-accent); }
.joke { font-style: italic; color: #fff; }
.quote { color: var(--color-accent); }
.hint { color: rgb(232 234 240 / 0.7); font-size: calc(var(--s) * 18); font-style: italic; }
</style>
