<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { pollsLabel } from '#src/client/tools/pollsLabel.ts';
import { splitPolls } from '#src/client/tools/splitPolls.ts';

/**
 * A player's polls in a list, side by side: the heart and the polls every hero shares, then the shield and what
 * is left of its electoral base, its armor. The shield goes away with the base. Sized by the parent's font, laid
 * out by the parent (a row unless it says otherwise). `pills`: each count in its own pill, where the background
 * is busy, under a face.
 */
const props = withDefaults(defineProps<{ hp: number; startHp: number; look?: 'bare' | 'pills' }>(), { look: 'bare' });

const split = computed(() => splitPolls(props.hp, props.startHp));
const label = computed(() => pollsLabel(props.hp, props.startHp));
</script>

<template>
  <span class="polls-count" :class="look" :aria-label="label" :title="label">
    <span class="count health"><GameIcon name="heart" />{{ split.polls }}</span>
    <span v-if="split.electoralBase > 0" class="count base"><GameIcon name="shield" />{{ split.electoralBase }}</span>
  </span>
</template>

<style scoped>
.polls-count { display: inline-flex; align-items: center; gap: 0.3em; white-space: nowrap; }
.count { display: inline-flex; align-items: center; gap: 0.1em; }
.count .game-icon { font-size: 0.78em; }
.bare .health .game-icon { color: var(--color-polls-icon); }
.bare .base .game-icon { color: var(--color-electoral-base-icon); }
.pills .count { padding: 0 0.3em; border-radius: 999px; color: #fff; }
.pills .health { background: var(--color-polls); }
.pills .base { background: var(--color-electoral-base); }
</style>
