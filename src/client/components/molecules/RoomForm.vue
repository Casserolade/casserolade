<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';

const MAX_CODE_LENGTH = 6;

/**
 * A private room, among friends, in two separate gestures: create one, or enter one with the code a friend gave.
 * `inviteCode`: the code of the link that brought the player here; entering is then what the page points at.
 */
const props = defineProps<{ inviteCode: string }>();
const emit = defineEmits<{ create: []; join: [code: string] }>();

const code = ref(props.inviteCode);

function join(): void {
  if (code.value.trim()) emit('join', code.value);
}
</script>

<template>
  <div class="friends-room">
    <p v-if="inviteCode">On vous attend au salon <strong>{{ inviteCode }}</strong>.</p>
    <p v-else>Un salon privé : on n'y entre qu'avec son code.</p>
    <AppButton class="create" @click="emit('create')"><GameIcon name="lock" /> Créer un salon privé</AppButton>
    <p class="or" aria-hidden="true">ou</p>
    <form class="join" @submit.prevent="join">
      <label>Code d'un ami <input v-model="code" :maxlength="MAX_CODE_LENGTH" autocomplete="off" spellcheck="false" /></label>
      <AppButton type="submit" :primary="Boolean(inviteCode)" :disabled="!code.trim()">Rejoindre</AppButton>
    </form>
  </div>
</template>

<style scoped>
.friends-room { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
p { margin: 0; color: #c9cfdc; font-size: 0.92rem; line-height: 1.3; }
p strong { color: var(--color-title); letter-spacing: 0.1em; }
.create { width: 100%; }
/* « ou », between two hairlines. */
.or { display: flex; align-items: center; gap: 0.6rem; color: var(--color-text-muted); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.or::before, .or::after { content: ''; flex: 1; height: 1px; background: rgb(255 255 255 / 0.16); }
.join { display: flex; align-items: flex-end; gap: 0.6rem; }
.join label { flex: 1; min-width: 0; font-size: 0.92rem; }
.join input { width: 100%; min-width: 0; text-transform: uppercase; letter-spacing: 0.2em; }
</style>
