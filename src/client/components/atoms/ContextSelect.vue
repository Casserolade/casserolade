<script setup lang="ts">
import { computed } from 'vue';
import { CONTEXT_CHOICES } from '#src/client/const/contextChoices.ts';

/** The context of the game: at random, none, or one in particular, with what it does under the list. */
const contextId = defineModel<string>({ required: true });
defineProps<{ disabled?: boolean }>();
const chosen = computed(() => CONTEXT_CHOICES.find((c) => c.value === contextId.value) ?? CONTEXT_CHOICES[0]);
</script>

<template>
  <label>
    Contexte
    <select v-model="contextId" :disabled="disabled">
      <option v-for="choice in CONTEXT_CHOICES" :key="choice.value" :value="choice.value">{{ choice.label }}</option>
    </select>
    <span class="desc">{{ chosen.desc }}</span>
  </label>
</template>

<style scoped>
.desc { color: var(--color-text-muted); font-size: var(--font-size-small); font-weight: 400; line-height: 1.35; }
</style>
