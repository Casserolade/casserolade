<script setup lang="ts">
import { TABLE_SIZES } from '#src/client/const/tableSizes.ts';

const size = defineModel<number>({ required: true });
defineProps<{ disabled?: boolean }>();
</script>

<template>
  <label>
    Joueurs à la table
    <select v-model.number="size" :disabled="disabled">
      <option v-for="count in TABLE_SIZES" :key="count" :value="count">{{ count }}</option>
    </select>
  </label>
</template>
