<script setup lang="ts">
import { computed } from 'vue';
import { CONTEXTS } from '#src/data/heroes.ts';

/**
 * The rule of the day, beside the camps of the game: its name, and what it changes. Nothing without one.
 * `compact`, in the table's rail: the name only, the rule on hover or keyboard focus.
 */
const props = withDefaults(defineProps<{ contextId: string; compact?: boolean }>(), { compact: false });
const context = computed(() => CONTEXTS.find((c) => c.id === props.contextId && c.id !== CONTEXTS[0].id) ?? null);
</script>

<template>
  <aside v-if="context" class="context" :class="{ compact }" aria-label="Contexte de la partie" :tabindex="compact ? 0 : undefined">
    <span class="label">Contexte</span>
    <strong class="name">{{ context.name }}</strong>
    <span class="desc">{{ context.desc }}</span>
  </aside>
</template>

<style scoped>
.context { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; max-width: 34rem; padding: 0.5rem 1rem; border: 2px solid var(--color-accent); border-radius: 14px; background: rgb(12 16 32 / 0.85); text-align: center; }
.label { color: #c9cfdc; font-weight: 700; font-size: 0.85rem; }
.name { color: var(--color-accent); font: 400 1.4rem / 1.1 var(--font-number); letter-spacing: 0.5px; }
.desc { color: var(--color-text); font-size: 0.95rem; line-height: 1.3; }
.compact { position: relative; gap: calc(var(--s, 1px) * 2); max-width: none; padding: calc(var(--s, 1px) * 8) calc(var(--s, 1px) * 12); border-width: calc(var(--s, 1px) * 3); border-radius: calc(var(--s, 1px) * 18); cursor: help; }
.compact .label { font-size: calc(var(--s, 1px) * 16); }
/* A long name (« Chaîne d'info en continu ») takes two short lines, never more: the budget sits just below. */
.compact .name { font-size: calc(var(--s, 1px) * 21); line-height: 1; text-wrap: balance; }
.compact .desc {
  position: absolute;
  right: calc(100% + var(--s, 1px) * 12);
  top: 0;
  width: calc(var(--s, 1px) * 340);
  padding: calc(var(--s, 1px) * 12) calc(var(--s, 1px) * 16);
  border: calc(var(--s, 1px) * 2) solid var(--color-accent);
  border-radius: calc(var(--s, 1px) * 14);
  background: rgb(12 14 24 / 0.95);
  font-size: calc(var(--s, 1px) * 22);
  text-align: left;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
.compact:hover .desc, .compact:focus-visible .desc { opacity: 1; }
.compact:focus-visible { outline: calc(var(--s, 1px) * 3) solid var(--color-accent); outline-offset: calc(var(--s, 1px) * 3); }
</style>
