<script setup lang="ts">
import { computed } from 'vue';
import type { Quest } from '#src/engine/state.ts';

/** A career chapter's quest beside the table (sponsorships, an ultimatum): where it stands, in words and as a bar. */
const props = defineProps<{ quest: Quest }>();

const filled = computed(() => `${Math.round((100 * Math.min(props.quest.valeur, props.quest.cible)) / Math.max(1, props.quest.cible))}%`);
const state = computed(() => {
  if (props.quest.etat === 'reussie') return 'Réussi';
  if (props.quest.etat === 'ratee') return 'Raté';
  return null;
});
</script>

<template>
  <p class="quest" :class="quest.etat" aria-live="polite">
    <span class="label">{{ quest.libelle }}</span>
    <strong v-if="!quest.decisive" class="count">{{ quest.valeur }} / {{ quest.cible }}</strong>
    <span v-if="!quest.decisive" class="bar" aria-hidden="true"><span class="fill" :style="{ width: filled }" /></span>
    <span v-if="state" class="state">{{ state }}</span>
  </p>
</template>

<style scoped>
.quest {
  display: flex;
  flex-direction: column;
  gap: calc(var(--s) * 6);
  width: 100%;
  margin: 0;
  padding: calc(var(--s) * 10) calc(var(--s) * 14);
  border-radius: calc(var(--s) * 14);
  border: calc(var(--s) * 4) solid var(--color-ink);
  background: #fffbe8;
  color: var(--color-ink);
  box-shadow: calc(var(--s) * 4) calc(var(--s) * 6) 0 rgb(0 0 0 / 0.35);
  rotate: -1deg;
}
.label { font: 400 calc(var(--s) * 24) / 1 var(--font-number); letter-spacing: calc(var(--s) * 1); color: #c8102e; }
.count { font: 400 calc(var(--s) * 40) / 1 var(--font-number); }
.bar { display: block; height: calc(var(--s) * 12); border-radius: 999px; border: calc(var(--s) * 3) solid var(--color-ink); background: #e8dfc0; overflow: hidden; }
.fill { display: block; height: 100%; background: #e2a400; transition: width 0.4s ease-out; }
.state { font: 700 calc(var(--s) * 20) / 1 var(--font-card); text-transform: uppercase; letter-spacing: 0.06em; }
.reussie .fill { background: #2f9e44; }
.reussie .state { color: #2f7a36; }
.ratee .state { color: #c8102e; }
</style>
