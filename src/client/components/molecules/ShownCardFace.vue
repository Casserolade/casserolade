<script setup lang="ts">
import CardFace from '#src/client/components/molecules/CardFace.vue';
import SpellCard from '#src/client/components/molecules/SpellCard.vue';
import type { ShownCard } from '#src/client/tools/shownCard.ts';

/** Whatever the card is, its full face. Sized by its parent's width (container units). */
defineProps<{ card: ShownCard }>();
</script>

<template>
  <span class="shown-card">
    <CardFace v-if="card.kind === 'minion'" v-bind="card.face" />
    <SpellCard v-else-if="card.kind === 'spell'" :spell="card.spell" :count="card.count" :tier="card.tier" :tract="card.tract" />
    <SpellCard v-else :casserole="card.casserole" :owner-multiplier="card.ownerMultiplier" />
  </span>
</template>

<style scoped>
.shown-card { display: block; width: 100%; container-type: inline-size; }
</style>
