<script setup lang="ts">
import { computed } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import BotLevelSelect from '#src/client/components/atoms/BotLevelSelect.vue';
import ContextSelect from '#src/client/components/atoms/ContextSelect.vue';
import { RANDOM_CONTEXT } from '#src/data/heroes.ts';
import type { OptionsSalon } from '#src/protocol/messages.ts';

const props = defineProps<{ options: OptionsSalon; isHost: boolean; humanCount: number }>();
const emit = defineEmits<{ update: [options: OptionsSalon] }>();

const level = computed<BotLevel>({
  get: () => props.options.niveauBots,
  set: (niveauBots) => emit('update', { ...props.options, niveauBots }),
});
const contexte = computed<string>({
  get: () => props.options.contexte ?? RANDOM_CONTEXT,
  set: (value) => emit('update', { ...props.options, contexte: value }),
});
const useTimer = computed<boolean>({
  get: () => props.options.minuteur,
  set: (minuteur) => emit('update', { ...props.options, minuteur }),
});
</script>

<template>
  <div class="stack">
    <BotLevelSelect v-model="level" :disabled="!isHost" />
    <ContextSelect v-model="contexte" :disabled="!isHost" />
    <label class="check"><input v-model="useTimer" type="checkbox" :disabled="!isHost" /> Avec minuteur</label>
    <p v-if="humanCount === 1" class="muted small">Seul à table, vous jouerez sans minuteur.</p>
  </div>
</template>

<style scoped>
.check { flex-direction: row; align-items: center; gap: 0.5rem; cursor: pointer; }
.check input { width: 1.3rem; height: 1.3rem; accent-color: var(--color-accent); }
</style>
