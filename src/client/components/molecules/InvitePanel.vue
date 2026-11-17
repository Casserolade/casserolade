<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';

const COPIED_MS = 2000;

/** The link that brings someone into the room, and the button that copies it. */
const props = defineProps<{ link: string }>();

const copied = ref(false);
/** The browser refused to copy (no permission, or a plain http page): the link is selected, to copy by hand. */
const copyRefused = ref(false);
const linkField = useTemplateRef<HTMLInputElement>('linkField');

function showCopied(): void {
  copied.value = true;
  copyRefused.value = false;
  window.setTimeout(() => (copied.value = false), COPIED_MS);
}

/** The old way, for pages the clipboard API refuses: copy what is selected in the field. */
function copySelection(): boolean {
  const field = linkField.value;
  if (!field) return false;
  field.focus();
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

async function copyLink(): Promise<void> {
  try {
    if (!navigator.clipboard) throw new Error('No clipboard on this page');
    await navigator.clipboard.writeText(props.link);
    showCopied();
  } catch (error) {
    if (copySelection()) {
      showCopied();
      return;
    }
    console.warn('Could not copy the invite link', error);
    copyRefused.value = true;
  }
}
</script>

<template>
  <div class="invite field-row">
    <input ref="linkField" class="link" :value="link" readonly aria-label="Lien d'invitation" @focus="($event.target as HTMLInputElement).select()" />
    <AppButton @click="copyLink">{{ copied ? 'Lien copié' : 'Copier le lien' }}</AppButton>
  </div>
  <p v-if="copyRefused" class="refused" role="status">Le navigateur refuse de copier : le lien est sélectionné ci-dessus, copiez-le à la main.</p>
</template>

<style scoped>
.invite { --field-row-button: 9.5rem; width: 100%; align-items: center; }
.link { color: var(--color-title); font-size: 0.9rem; }
.refused { color: var(--color-title); font-size: 0.9rem; font-weight: 700; }
</style>
