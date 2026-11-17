<script setup lang="ts">
import { computed } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import BotLevelSelect from '#src/client/components/atoms/BotLevelSelect.vue';
import ContextSelect from '#src/client/components/atoms/ContextSelect.vue';
import TableSizeSelect from '#src/client/components/atoms/TableSizeSelect.vue';
import { botsAtTable } from '#src/client/tools/botsAtTable.ts';
import { botsAtTableLabel } from '#src/client/tools/botsAtTableLabel.ts';
import { RANDOM_CONTEXT } from '#src/data/heroes.ts';
import type { OptionsSalon } from '#src/protocol/messages.ts';

/**
 * The settings of a room's games, which its host chooses and the others read: the table, its bots, the day's rule,
 * the timer. Among strangers, in a public room, the timer is always on.
 */
const props = defineProps<{ options: OptionsSalon; isHost: boolean; humanCount: number }>();
const emit = defineEmits<{ update: [options: OptionsSalon] }>();

const isPublic = computed(() => props.options.nomPublic !== undefined);
const level = computed<BotLevel>({
  get: () => props.options.niveauBots,
  set: (niveauBots) => emit('update', { ...props.options, niveauBots }),
});
const contexte = computed<string>({
  get: () => props.options.contexte ?? RANDOM_CONTEXT,
  set: (value) => emit('update', { ...props.options, contexte: value }),
});
const tableSize = computed<number>({
  get: () => props.options.table ?? 8,
  set: (table) => emit('update', { ...props.options, table }),
});
const bots = computed(() => botsAtTable(tableSize.value, props.humanCount));
const botsLabel = computed(() => botsAtTableLabel(bots.value));
const useTimer = computed<boolean>({
  get: () => props.options.minuteur,
  set: (minuteur) => emit('update', { ...props.options, minuteur }),
});
</script>

<template>
  <div class="settings">
    <div class="pair">
      <TableSizeSelect v-model="tableSize" :disabled="!isHost" />
      <BotLevelSelect v-if="bots > 0" v-model="level" :disabled="!isHost" />
    </div>
    <p class="muted small">{{ botsLabel }}</p>
    <ContextSelect v-model="contexte" :disabled="!isHost" />
    <label class="check"><input v-model="useTimer" type="checkbox" :disabled="!isHost || isPublic" /> Avec minuteur</label>
    <p v-if="isPublic" class="muted small">Entre inconnus, toujours avec minuteur.</p>
    <p v-else-if="humanCount === 1" class="muted small">Seul à table, vous jouerez sans minuteur.</p>
  </div>
</template>

<style scoped>
.settings { display: flex; flex-direction: column; align-items: flex-start; gap: 0.45rem; width: 100%; }
/* The table's size and its bots' level, side by side. */
.pair { display: flex; flex-wrap: wrap; gap: 0.45rem 1rem; }
.check { flex-direction: row; align-items: center; gap: 0.5rem; cursor: pointer; }
.check input { width: 1.15rem; height: 1.15rem; accent-color: var(--color-accent); }
</style>
