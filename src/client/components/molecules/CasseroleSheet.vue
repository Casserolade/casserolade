<script setup lang="ts">
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import SourceDetails from '#src/client/components/molecules/SourceDetails.vue';
import type { EntrySources } from '#src/client/tools/personSources.ts';
import type { Casserole } from '#src/engine/types.ts';

/** A casserole in the bestiary: its card, whose it is, its joke and quote, and the real fact it laughs at. */
defineProps<{ casserole: Casserole; ownerName: string; sources: EntrySources | null }>();
</script>

<template>
  <article class="sheet">
    <ShownCardFace :card="{ kind: 'casserole', casserole }" />
    <p class="owner"><strong>{{ ownerName }}</strong> · {{ casserole.kind === 'affaire' ? 'Affaire' : 'Ridicule' }}<template v-if="casserole.une">, à la une</template></p>
    <p class="joke">{{ casserole.blague }}</p>
    <p v-if="casserole.citation" class="quote">« {{ casserole.citation }} »</p>
    <p class="fact"><strong>Le fait</strong> {{ casserole.fait }}</p>
    <SourceDetails :sources="sources" />
  </article>
</template>

<style scoped>
.sheet { display: flex; flex-direction: column; gap: var(--space-2); }
p { margin: 0; line-height: 1.35; }
.owner { color: var(--color-text-muted); font-size: var(--font-size-small); }
.owner strong { color: var(--color-text); }
.joke { font-style: italic; }
.quote { color: var(--color-accent); }
.fact { color: var(--color-text-muted); font-size: var(--font-size-small); }
.fact strong { display: block; color: var(--color-accent); font-family: var(--font-card-title); }
</style>
