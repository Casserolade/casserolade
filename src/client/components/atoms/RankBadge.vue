<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { nextRankOf } from '#src/client/tools/nextRankOf.ts';
import { rankOf } from '#src/client/tools/rankOf.ts';

/**
 * A player's rank in the rooms: the place its rating seats it at, from the Salle des fêtes to the Élysée.
 * `detailed`: the rating itself follows the rank. The floor of the next rank is said at the hover.
 */
const props = withDefaults(defineProps<{ mmr: number; detailed?: boolean }>(), { detailed: false });

const rank = computed(() => rankOf(props.mmr));
const hint = computed(() => {
  const next = nextRankOf(props.mmr);
  return `Rang en salon : ${rank.value.nom}, cote ${props.mmr}.${next ? ` ${next.nom} à ${next.min}.` : ''}`;
});
</script>

<template>
  <span class="rank" :title="hint">
    <GameIcon name="column" />
    <span class="name">{{ rank.nom }}</span>
    <span v-if="detailed" class="rating">{{ mmr }}</span>
  </span>
</template>

<style scoped>
.rank { display: inline-flex; align-items: center; gap: 0.3em; max-width: 100%; padding: 0.08em 0.55em; border-radius: 999px; border: 1px solid var(--color-frame); background: rgb(255 197 61 / 0.1); color: var(--color-title); font-size: 0.8rem; font-weight: 700; line-height: 1.35; white-space: nowrap; }
.name { overflow: hidden; text-overflow: ellipsis; }
.rating { color: var(--color-text); font-weight: 400; }
</style>
