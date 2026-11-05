<script setup lang="ts">
import { ref } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import BotLevelSelect from '#src/client/components/atoms/BotLevelSelect.vue';
import ContextSelect from '#src/client/components/atoms/ContextSelect.vue';
import { RANDOM_CONTEXT } from '#src/data/heroes.ts';

const emit = defineEmits<{ start: [settings: { botLevel: BotLevel; contexte: string }] }>();
const botLevel = ref<BotLevel>('facile');
const contexte = ref<string>(RANDOM_CONTEXT);

function submit(): void {
  emit('start', { botLevel: botLevel.value, contexte: contexte.value });
}
</script>

<template>
  <form class="stack" @submit.prevent="submit">
    <BotLevelSelect v-model="botLevel" />
    <ContextSelect v-model="contexte" />
    <AppButton primary type="submit">Lancer la partie</AppButton>
  </form>
</template>
