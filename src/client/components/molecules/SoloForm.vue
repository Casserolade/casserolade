<script setup lang="ts">
import { ref } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import BotLevelSelect from '#src/client/components/atoms/BotLevelSelect.vue';

const emit = defineEmits<{ start: [settings: { botLevel: BotLevel }] }>();
const botLevel = ref<BotLevel>('facile');

function submit(): void {
  emit('start', { botLevel: botLevel.value });
}
</script>

<template>
  <form class="stack" @submit.prevent="submit">
    <BotLevelSelect v-model="botLevel" />
    <AppButton primary type="submit">Lancer la partie</AppButton>
  </form>
</template>
