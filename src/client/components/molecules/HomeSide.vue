<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import type { GameIconName } from '#src/client/const/gameIcons.ts';

/**
 * A panel of the home page, a way to play or a group of them: framed, its title and what goes beside it (`aside`:
 * online, who is here; a button, a word), then what it holds, in one or two columns.
 */
withDefaults(defineProps<{ title: string; icon: GameIconName; highlighted?: boolean; columns?: 1 | 2 }>(), { highlighted: false, columns: 2 });
</script>

<template>
  <section class="side" :class="{ highlighted }" :style="{ '--columns': columns }">
    <header class="head">
      <h2><GameIcon :name="icon" /> {{ title }}</h2>
      <slot name="aside" />
    </header>
    <div class="choices"><slot /></div>
  </section>
</template>

<style scoped>
.side {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.55rem;
  min-width: 0;
  padding: 0.7rem 0.9rem 0.9rem;
  border-radius: 16px;
  border: 2px solid rgb(255 255 255 / 0.14);
  background: var(--panel-background);
  box-shadow: var(--panel-shadow);
}
.highlighted { border-color: var(--color-frame); box-shadow: 0 0 22px rgb(255 200 60 / 0.2), var(--panel-shadow); }
/* The title, then what goes beside it, from the left; what must sit at the far end pushes itself there. */
.head { display: flex; flex-wrap: wrap; align-items: center; align-content: flex-start; gap: 0.3rem 1rem; min-height: 2.3rem; }
h2 { display: flex; align-items: center; gap: 0.4em; margin: 0; color: var(--color-title); font: 400 1.55rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; }
.choices { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); gap: 0.55rem; min-height: 0; }
@media (max-width: 640px) { .choices { grid-template-columns: minmax(0, 1fr); } }
</style>
