<script setup lang="ts">
import type { BotLevel } from '#src/bots/bots.ts';

const level = defineModel<BotLevel>({ required: true });
defineProps<{ disabled?: boolean }>();
</script>

<template>
  <label>
    Niveau des bots
    <select v-model="level" :disabled="disabled">
      <option value="facile">Facile</option>
      <option value="moyen">Moyen</option>
      <option value="difficile">Difficile</option>
    </select>
  </label>
</template>
