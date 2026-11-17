<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import { NOM_SALON_LONGUEUR } from '#src/protocol/publicRooms.ts';

/**
 * Opens a public room, from the foot of the list it will join: its name, and the button. Left empty, the room takes
 * the suggested name, shown in the field. `primary`: no room is open, this is what the page points at.
 */
withDefaults(defineProps<{ suggestedName: string; primary?: boolean }>(), { primary: false });
const emit = defineEmits<{ open: [name: string] }>();

const name = ref('');
</script>

<template>
  <form class="open-room" @submit.prevent="emit('open', name)">
    <label class="yours">Votre salon <input v-model="name" :maxlength="NOM_SALON_LONGUEUR" :placeholder="suggestedName" autocomplete="off" /></label>
    <AppButton :primary="primary" type="submit" title="Tout le monde peut entrer. Vous lancez quand vous voulez : les bots prennent les places vides.">Ouvrir au public</AppButton>
  </form>
</template>

<style scoped>
/* One line: its name, the field that takes what is left, the button. */
.open-room { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.6rem; }
.yours { flex: 1 1 12rem; flex-direction: row; align-items: center; gap: 0.6rem; min-width: 0; font-size: 0.92rem; white-space: nowrap; }
.yours input { flex: 1; min-width: 0; }
</style>
