<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';

const MAX_CODE_LENGTH = 6;

/**
 * A private room: create one, or join one with its code. The fields the parent adds (the pseudo) come first, in the
 * same form: Enter in any of them sends it.
 */
const props = defineProps<{ inviteCode: string }>();
const emit = defineEmits<{ create: []; join: [code: string] }>();

const code = ref(props.inviteCode);

/** Enter joins when a code is typed, and creates a room otherwise. */
function submit(): void {
  if (code.value.trim()) emit('join', code.value);
  else emit('create');
}
</script>

<template>
  <form class="room-form" @submit.prevent="submit">
    <slot />
    <label>Code du salon, si on vous l'a donné <input v-model="code" :maxlength="MAX_CODE_LENGTH" autocomplete="off" spellcheck="false" /></label>
    <AppButton primary type="submit">{{ code.trim() ? 'Rejoindre le salon' : 'Créer un salon' }}</AppButton>
  </form>
</template>

<style scoped>
/* The fields share the width of the row, the button keeps its size; on a narrow side, they go one under the other. */
.room-form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3) var(--space-4); }
.room-form > label, :slotted(label) { flex: 1 1 12rem; min-width: 0; }
input { text-transform: uppercase; letter-spacing: 0.2em; }
</style>
