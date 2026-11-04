<script setup lang="ts">
import { computed } from 'vue';
import { CAMP_LABELS } from '#src/client/const/campLabels.ts';
import type { Camp } from '#src/engine/types.ts';

/**
 * The camps of this game, as in Battlegrounds where the tribes are shown from the start.
 * The Société civile is always there, so it is not listed.
 */
const props = withDefaults(defineProps<{ camps: readonly Camp[]; vertical?: boolean }>(), { vertical: false });
const shown = computed(() => props.camps.filter((camp) => camp !== 'civile'));
</script>

<template>
  <div class="camp-chips" :class="{ vertical }" role="list" aria-label="Camps de la partie">
    <span class="label">Camps de la partie</span>
    <span v-for="camp in shown" :key="camp" class="chip" role="listitem" :style="{ '--chip': `var(--camp-${camp})` }">{{ CAMP_LABELS[camp] }}</span>
  </div>
</template>

<style scoped>
.camp-chips { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.45rem; }
.label { color: #c9cfdc; font-weight: 700; font-size: 0.95rem; margin-right: 0.2rem; }
.chip {
  padding: 0.18rem 0.75rem;
  border-radius: 999px;
  border: 3px solid var(--color-ink);
  background: var(--chip);
  color: #fff;
  font-weight: 800;
  font-size: 0.95rem;
  text-shadow: 0 1px 0 rgb(0 0 0 / 0.5);
  box-shadow: 0 3px 0 rgb(0 0 0 / 0.35);
}
.vertical { flex-direction: column; gap: calc(var(--s, 1px) * 10); }
.vertical .label { margin: 0; font-size: calc(var(--s, 1px) * 20); }
.vertical .chip { width: 100%; text-align: center; font-size: calc(var(--s, 1px) * 22); padding: calc(var(--s, 1px) * 4) calc(var(--s, 1px) * 12); border-width: calc(var(--s, 1px) * 4); }
</style>
