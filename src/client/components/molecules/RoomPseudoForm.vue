<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';

const MAX_PSEUDO_LENGTH = 24;

/** In a room, for whoever walked in without a pseudo: choose one now, the table and the chat will show it. */
const emit = defineEmits<{ rename: [pseudo: string] }>();

const draft = ref('');

function submit(): void {
  const pseudo = draft.value.trim();
  if (pseudo) emit('rename', pseudo);
}
</script>

<template>
  <form class="room-pseudo" @submit.prevent="submit">
    <label>Choisissez votre pseudo <input v-model="draft" :maxlength="MAX_PSEUDO_LENGTH" placeholder="Ex. : Marianne_31" autocomplete="nickname" /></label>
    <AppButton primary type="submit" :disabled="!draft.trim()">Valider</AppButton>
  </form>
</template>

<style scoped>
/* A call, in the game's gold: the table shows « Sans étiquette » until it is answered. */
.room-pseudo { display: flex; align-items: flex-end; gap: 0.6rem; width: 100%; padding: 0.5rem 0.6rem; border-radius: 12px; border: 2px solid var(--color-frame); background: rgb(255 197 61 / 0.08); }
label { flex: 1; min-width: 0; color: var(--color-title); }
input { width: 100%; min-width: 0; }
</style>
