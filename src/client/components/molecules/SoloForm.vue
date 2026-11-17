<script setup lang="ts">
import { ref } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import BotLevelSelect from '#src/client/components/atoms/BotLevelSelect.vue';
import ContextSelect from '#src/client/components/atoms/ContextSelect.vue';
import { RANDOM_CONTEXT } from '#src/data/heroes.ts';

/** A quick game against bots: their level and the day's rule, side by side, and the button that launches, across. */
const emit = defineEmits<{ start: [settings: { botLevel: BotLevel; contexte: string }] }>();

const botLevel = ref<BotLevel>('facile');
const contexte = ref<string>(RANDOM_CONTEXT);

function submit(): void {
  emit('start', { botLevel: botLevel.value, contexte: contexte.value });
}
</script>

<template>
  <form class="solo-form" @submit.prevent="submit">
    <BotLevelSelect v-model="botLevel" />
    <ContextSelect v-model="contexte" />
    <AppButton class="launch" type="submit">Lancer la partie</AppButton>
  </form>
</template>

<style scoped>
.solo-form { display: grid; grid-template-columns: auto minmax(0, 1fr); align-content: start; gap: 0.5rem 0.7rem; height: 100%; }
.solo-form :deep(select) { width: 100%; min-width: 0; }
/* Given more height than it needs, the form keeps its button at the bottom. */
.launch { grid-column: 1 / -1; align-self: end; }
</style>
