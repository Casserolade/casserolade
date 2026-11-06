<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import type { GameIconName } from '#src/client/const/gameIcons.ts';

/**
 * One of the two sides of the home page, alone at the table or online: a framed panel, its title, what comes first
 * (`before`, the pseudo online), then its ways to play side by side.
 */
defineProps<{ title: string; icon: GameIconName; highlighted?: boolean }>();
</script>

<template>
  <section class="side" :class="{ highlighted }">
    <h2><GameIcon :name="icon" /> {{ title }}</h2>
    <slot name="before" />
    <div class="choices"><slot /></div>
  </section>
</template>

<style scoped>
.side {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.1rem 1.2rem 1.2rem;
  border-radius: 22px;
  border: 3px solid rgb(255 255 255 / 0.14);
  background: var(--panel-background);
  box-shadow: var(--panel-shadow);
}
.highlighted { border-color: var(--color-frame); box-shadow: 0 0 30px rgb(255 200 60 / 0.25), var(--panel-shadow); }
h2 { display: flex; align-items: center; gap: 0.4em; margin: 0; color: var(--color-title); font: 400 2.1rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; }
.choices { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; }
@media (max-width: 640px) { .choices { grid-template-columns: minmax(0, 1fr); } }
</style>
