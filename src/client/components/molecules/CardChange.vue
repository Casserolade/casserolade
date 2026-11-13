<script setup lang="ts">
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import type { ShownCard } from '#src/client/tools/shownCard.ts';

/** A card of the update notes: as it was and as it is, side by side; or new; or gone. And why, in a line. */
defineProps<{ before?: ShownCard; after?: ShownCard; why?: string }>();
</script>

<template>
  <figure class="change">
    <div class="pair" :class="{ alone: !before || !after }">
      <div v-if="before" class="side" :class="{ gone: !after }">
        <span class="label">{{ after ? 'Avant' : 'Retiré' }}</span>
        <ShownCardFace :card="before" />
      </div>
      <span v-if="before && after" class="arrow" aria-hidden="true">›</span>
      <div v-if="after" class="side now">
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
.side.gone { max-width: calc(50% - var(--space-4)); }
.side.gone :deep(.shown-card) { filter: grayscale(1); opacity: 0.6; }
.label { color: var(--color-text-muted); font: 800 var(--font-size-small) / 1 var(--font-card-title); text-transform: uppercase; letter-spacing: 1px; }
.now .label { color: var(--color-accent); }
.arrow { color: var(--color-accent); font: 400 2.4rem / 1 var(--font-number); }
figcaption { color: var(--color-text-muted); font-size: var(--font-size-small); line-height: 1.35; }
</style>
