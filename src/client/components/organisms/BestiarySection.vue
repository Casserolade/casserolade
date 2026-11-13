<script setup lang="ts">
import { computed } from 'vue';

/**
 * A section of the bestiary or of the update notes: its title and count, then its items, given as list items, in a
 * grid. `itemWidth` is the narrowest an item gets (a card, or a card before and after); `wide` is the notes' width.
 */
const props = withDefaults(defineProps<{ id: string; title: string; count: string; color?: string; wide?: boolean; level?: 2 | 3; itemWidth?: string }>(), {
  color: 'var(--color-accent)',
  wide: false,
  level: 2,
  itemWidth: undefined,
});

const width = computed(() => props.itemWidth ?? (props.wide ? '15rem' : '11.5rem'));
</script>

<template>
  <section :id="id" class="section" :style="{ '--section-color': color, '--item-width': width }">
    <component :is="`h${level}`" class="title">{{ title }} <span class="count">{{ count }}</span></component>
    <ul class="items"><slot /></ul>
  </section>
</template>

<style scoped>
.section { scroll-margin-top: var(--space-5); }
.title {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin: 0 0 var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 4px solid var(--section-color);
  color: var(--color-text);
  font: 400 2.2rem / 1 var(--font-number);
  letter-spacing: 1px;
}
.count { color: var(--color-text-muted); font: 500 var(--font-size-normal) / 1 var(--font-card); letter-spacing: 0; }
.items { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--item-width)), 1fr)); gap: var(--space-5) var(--space-4); margin: 0; padding: 0; list-style: none; }
.items > :deep(li) { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
