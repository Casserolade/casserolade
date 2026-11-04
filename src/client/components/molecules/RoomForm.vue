<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';

const MAX_CODE_LENGTH = 6;

/** A private room: create one, or join one with its code. The pseudo is typed once, on the home screen. */
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
  <form class="stack" @submit.prevent="submit">
    <label>Code du salon, si on vous en a donné un <input v-model="code" :maxlength="MAX_CODE_LENGTH" autocomplete="off" spellcheck="false" /></label>
    <AppButton primary type="submit">{{ code.trim() ? 'Rejoindre le salon' : 'Créer un salon' }}</AppButton>
  </form>
</template>

<style scoped>
input { text-transform: uppercase; letter-spacing: 0.2em; width: 9em; }
</style>
