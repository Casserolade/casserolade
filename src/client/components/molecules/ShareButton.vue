<script setup lang="ts">
import { computed, ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { SHARE_MESSAGES } from '#src/client/const/shareMessages.ts';
import type { ShareOutcome } from '#src/client/services/shareGame.ts';

/** « Partager le jeu », and what came of it under the button. The parent gives the way to share. */
const props = defineProps<{ share: () => Promise<ShareOutcome> }>();

const outcome = ref<ShareOutcome | null>(null);
const sharing = ref(false);
const message = computed(() => (outcome.value ? SHARE_MESSAGES[outcome.value] : ''));

async function press(): Promise<void> {
  sharing.value = true;
  outcome.value = await props.share();
  sharing.value = false;
}
</script>

<template>
  <span class="share">
    <AppButton primary :disabled="sharing" @click="press"><GameIcon name="megaphone" /> Partager le jeu</AppButton>
    <span class="message" role="status">{{ message }}</span>
  </span>
</template>

<style scoped>
.share { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); }
.message { min-height: 1.3em; color: var(--color-title); font-weight: 700; }
.message:empty { display: none; }
</style>
