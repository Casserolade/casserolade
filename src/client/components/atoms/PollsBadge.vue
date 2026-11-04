<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { splitPolls } from '#src/client/tools/splitPolls.ts';

/** The polls of a hero, hanging from the corner of its portrait. */
const props = defineProps<{ hp: number; startHp: number }>();

const split = computed(() => splitPolls(props.hp, props.startHp));
const label = computed(() => `${split.value.polls} sondages, ${split.value.electoralBase} de socle électoral`);
</script>

<template>
  <span class="polls" :aria-label="label" :title="label">
    <span class="count health"><GameIcon name="heart" /> {{ split.polls }}</span>
    <span v-if="split.electoralBase > 0" class="count base"><GameIcon name="shield" /> {{ split.electoralBase }}</span>
  </span>
</template>

<style scoped>
.polls { position: absolute; right: -16%; top: 6%; display: flex; flex-direction: column; gap: calc(var(--s) * 3); align-items: flex-end; }
.count { padding: 0 calc(var(--s) * 10); border-radius: 999px; border: calc(var(--s) * 3) solid #e8ecf2; color: #fff; font: 400 calc(var(--s) * 32) / 1.2 var(--font-number); letter-spacing: calc(var(--s) * 1); white-space: nowrap; box-shadow: 0 calc(var(--s) * 4) calc(var(--s) * 8) rgb(0 0 0 / 0.5); text-shadow: 0 calc(var(--s) * 2) 0 rgb(0 0 0 / 0.6); }
.health { background: #a8132a; }
.base { background: #24406e; }
</style>
