<script setup lang="ts">
import RadioChip from '#src/client/components/atoms/RadioChip.vue';
import { BESTIARY_KINDS } from '#src/client/const/bestiaryKinds.ts';
import type { BestiaryKind } from '#src/client/const/bestiaryKinds.ts';
import { CAMP_LABELS } from '#src/client/const/campLabels.ts';
import { countLabel } from '#src/client/tools/countLabel.ts';
import type { BestiaryFilter } from '#src/client/tools/matchesBestiaryFilter.ts';
import type { Camp } from '#src/engine/types.ts';

/** The bestiary's filters: words, kind, camp and tier. Everything shows at once; nothing to submit. */
const props = defineProps<{ modelValue: BestiaryFilter; counts: Record<BestiaryKind, number>; total: number }>();
const emit = defineEmits<{ 'update:modelValue': [filter: BestiaryFilter]; reset: [] }>();

const CAMPS = Object.keys(CAMP_LABELS) as Camp[];
const TIERS = [1, 2, 3, 4, 5, 6];

function change(part: Partial<BestiaryFilter>): void {
  emit('update:modelValue', { ...props.modelValue, ...part });
}
</script>

<template>
  <form class="filters" role="search" aria-label="Filtrer le bestiaire" @submit.prevent @reset.prevent="emit('reset')">
    <input
      class="search"
      type="search"
      :value="modelValue.query"
      placeholder="Chercher un nom, un mot, une affaire…"
      aria-label="Chercher dans le bestiaire"
      @input="change({ query: ($event.target as HTMLInputElement).value })"
    />
    <fieldset>
      <legend>Quoi</legend>
      <RadioChip name="type" :checked="modelValue.kind === null" @select="change({ kind: null })">Tout</RadioChip>
      <RadioChip v-for="k in BESTIARY_KINDS" :key="k.kind" name="type" :checked="modelValue.kind === k.kind" @select="change({ kind: k.kind })">
        {{ k.label }} <span class="number">{{ counts[k.kind] }}</span>
      </RadioChip>
    </fieldset>
    <fieldset>
      <legend>Camp</legend>
      <RadioChip name="camp" :checked="modelValue.camp === null" @select="change({ camp: null })">Tous</RadioChip>
      <RadioChip
        v-for="camp in CAMPS"
        :key="camp"
        name="camp"
        :checked="modelValue.camp === camp"
        :color="`var(--camp-${camp})`"
        text-color="var(--color-text)"
        @select="change({ camp })"
      >{{ CAMP_LABELS[camp] }}</RadioChip>
    </fieldset>
    <fieldset>
      <legend>Échelon</legend>
      <RadioChip name="echelon" :checked="modelValue.tier === null" @select="change({ tier: null })">Tous</RadioChip>
      <RadioChip v-for="tier in TIERS" :key="tier" name="echelon" :checked="modelValue.tier === tier" @select="change({ tier })">{{ tier }}</RadioChip>
    </fieldset>
    <p class="result" aria-live="polite">
      {{ countLabel(total, 'résultat', 'résultats') }}
      <button type="reset" class="clear">Tout effacer</button>
    </p>
  </form>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}
@media (min-width: 900px) {
  .filters { position: sticky; top: var(--space-2); z-index: 5; box-shadow: 0 10px 30px rgb(0 0 0 / 0.45); }
}
.search { width: 100%; box-sizing: border-box; padding: var(--space-2) var(--space-3); border: 2px solid var(--color-border); border-radius: 10px; background: var(--color-background); color: var(--color-text); font: inherit; font-size: var(--font-size-large); }
.search:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 1px; }
fieldset { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0; padding: 0; border: 0; }
legend { float: left; margin-right: var(--space-2); color: var(--color-text-muted); font-weight: 700; }
.number { opacity: 0.75; font-weight: 500; }
.result { display: flex; align-items: center; gap: var(--space-3); margin: 0; color: var(--color-text-muted); }
.clear { padding: 0.2em 0.8em; border: 2px solid var(--color-border); border-radius: 999px; background: none; color: var(--color-text); font: inherit; cursor: pointer; }
.clear:hover, .clear:focus-visible { border-color: var(--color-accent); }
</style>
