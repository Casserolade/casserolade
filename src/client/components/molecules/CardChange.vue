<script setup lang="ts">
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import type { ShownCard } from '#src/client/tools/shownCard.ts';

/** A card of the update notes: as it was and as it is, side by side, or new; and why, in a line. */
defineProps<{ before?: ShownCard; after: ShownCard; why?: string }>();
</script>

<template>
  <figure class="change">
    <div class="pair" :class="{ alone: !before }">
      <div v-if="before" class="side">
        <span class="label">Avant</span>
        <ShownCardFace :card="before" />
      </div>
      <span v-if="before" class="arrow" aria-hidden="true">›</span>
      <div class="side">
        <span class="label">{{ before ? 'Après' : 'Nouveau' }}</span>
        <ShownCardFace :card="after" />
      </div>
    </div>
    <figcaption v-if="why">{{ why }}</figcaption>
  </figure>
</template>

<style scoped>
.change { display: flex; flex-direction: column; gap: var(--space-2); margin: 0; }
.pair { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--space-2); }
.pair.alone { grid-template-columns: 1fr; }
.side { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.label { color: var(--color-text-muted); font: 800 var(--font-size-small) / 1 var(--font-card-title); text-transform: uppercase; letter-spacing: 1px; }
.side:last-child .label { color: var(--color-accent); }
.arrow { color: var(--color-accent); font: 400 2.4rem / 1 var(--font-number); }
figcaption { color: var(--color-text-muted); font-size: var(--font-size-small); line-height: 1.35; }
</style>
