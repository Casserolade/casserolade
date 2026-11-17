<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';

const MAX_PSEUDO_LENGTH = 24;

/**
 * The pseudo, once for everything online, kept from one visit to the next. Empty, the field calls for it: it asks
 * to choose one, in the game's gold, and says what it is for. `asking`: an online gesture was just held back for
 * want of a pseudo; Enter, or the button that shows then, goes on (`confirm`), with a pseudo or without.
 * Once a pseudo is chosen, the line under the field is the screen's (default slot). `focus()` puts the cursor in it.
 */
const props = withDefaults(defineProps<{ asking?: boolean }>(), { asking: false });
const emit = defineEmits<{ confirm: [] }>();
const pseudo = defineModel<string>({ required: true });

const field = useTemplateRef<HTMLInputElement>('field');
const missing = computed(() => pseudo.value.trim() === '');

defineExpose({ focus: () => field.value?.focus() });
</script>

<template>
  <form class="pseudo-field" :class="{ missing, asking: props.asking }" @submit.prevent="emit('confirm')">
    <label for="pseudo-field">{{ missing ? 'Choisissez votre pseudo' : 'Votre pseudo' }}</label>
    <div class="line">
      <input id="pseudo-field" ref="field" v-model="pseudo" :maxlength="MAX_PSEUDO_LENGTH" placeholder="Ex. : Marianne_31" autocomplete="nickname" aria-describedby="pseudo-field-hint" />
      <AppButton v-if="props.asking" type="submit">Continuer</AppButton>
    </div>
    <p id="pseudo-field-hint" class="hint" role="status">
      <template v-if="props.asking && missing">Sans pseudo, vous serez « Sans étiquette ».</template>
      <template v-else-if="missing">C'est le nom que les autres joueurs verront.</template>
      <slot v-else />
    </p>
  </form>
</template>

<style scoped>
.pseudo-field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; width: 100%; }
label { font-size: 0.92rem; text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
.line { display: flex; align-items: center; gap: 0.5rem; }
/* Pointed at, the field scrolls into view: clear of whatever a screen pins to its top corner. */
input { flex: 1; width: 100%; min-width: 0; scroll-margin-top: 6rem; }
/* A menu's button, a size under the game's. */
.line :deep(.app-button) { flex: none; padding: 0.36em 0.9em; border-width: 2px; font-size: 1.05rem; color: var(--color-title); text-shadow: none; }
.hint { min-height: 1.2em; margin: 0; color: var(--color-text-muted); font-size: 0.82rem; line-height: 1.2; text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
/* No pseudo yet: the field calls for one, in the game's gold, and breathes. */
.missing label { color: var(--color-title); font-size: 1rem; }
.missing input { border-color: var(--color-frame); animation: call 1.8s ease-in-out infinite; }
/* A gesture was held back: the field insists, and its line says what happens without a pseudo. */
.asking input { border-color: var(--color-accent); }
.asking.missing input { animation-duration: 0.9s; }
.asking .hint { color: var(--color-title); font-weight: 700; }
@keyframes call { 50% { box-shadow: 0 0 0 4px rgb(255 197 61 / 0.28), 0 0 16px rgb(255 197 61 / 0.35); } }
@media (prefers-reduced-motion: reduce) { .missing input { animation: none; box-shadow: 0 0 0 3px rgb(255 197 61 / 0.28); } }
</style>
