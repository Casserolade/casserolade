<script setup lang="ts">
/** A section of the bestiary: its title and count, then its items, given as list items, in a grid. */
withDefaults(defineProps<{ id: string; title: string; count: string; color?: string; wide?: boolean }>(), {
  color: 'var(--color-accent)',
  wide: false,
});
</script>

<template>
  <section :id="id" class="section" :style="{ '--section-color': color }">
    <h2>{{ title }} <span class="count">{{ count }}</span></h2>
    <ul class="items" :class="{ wide }"><slot /></ul>
  </section>
</template>

<style scoped>
.section { scroll-margin-top: var(--space-5); }
h2 {
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
.items { display: grid; grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr)); gap: var(--space-5) var(--space-4); margin: 0; padding: 0; list-style: none; }
.items.wide { grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); }
.items > :deep(li) { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
