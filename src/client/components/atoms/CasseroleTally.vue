<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { casseroleTallyLabel } from '#src/client/tools/casseroleTallyLabel.ts';

/**
 * The casseroles laid this game, hanging from the hero's portrait. With a palier, how far it is ("4/6"); once reached,
 * the count alone, lit, with a star. Sized by its parent's font size.
 */
const props = withDefaults(defineProps<{ count: number; goal?: number | null }>(), { goal: null });

const reached = computed(() => props.goal !== null && props.count >= props.goal);
const shown = computed(() => (props.goal === null || reached.value ? String(props.count) : `${props.count}/${props.goal}`));
const label = computed(() => casseroleTallyLabel(props.count, props.goal));
</script>

<template>
  <span class="tally" :class="{ reached }" :title="label" :aria-label="label">
    <GameIcon name="saucepan" />{{ shown }}<GameIcon v-if="reached" class="star" name="star" />
  </span>
</template>

<style scoped>
.tally { display: inline-flex; align-items: center; gap: 0.12em; padding: 0 0.4em; border-radius: 999px; border: 0.1em solid #e8ecf2; background: #3b2a1a; color: #fff; font: 400 1em / 1.2 var(--font-number); letter-spacing: 0.03em; white-space: nowrap; box-shadow: 0 0.12em 0.25em rgb(0 0 0 / 0.5); text-shadow: 0 0.06em 0 rgb(0 0 0 / 0.6); }
.reached { border-color: var(--color-title); background: linear-gradient(#a8740e, #6b4306); }
.star { color: var(--color-title); font-size: 0.8em; }
</style>
