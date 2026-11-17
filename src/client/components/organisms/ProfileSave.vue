<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import { downloadProfileSave, openProfileSave, restoreProfileSave } from '#src/client/services/profileSave.ts';

/**
 * The player's profile, saved as a file and put back from one: with no account, it is how a rank, achievements and
 * a career follow their player to another browser. The rank cannot be edited in the file: the server holds it, and
 * the file only carries the key that finds it. A save chosen replaces this browser's profile, once confirmed.
 */
const emit = defineEmits<{ restored: [] }>();

const picker = useTemplateRef<HTMLInputElement>('picker');
/** The save the player chose, read and waiting for its confirmation. */
const chosen = shallowRef<Record<string, string> | null>(null);
const notice = ref('');

function save(): void {
  downloadProfileSave();
  notice.value = 'Sauvegarde téléchargée. Gardez ce fichier pour vous : qui l\'a joue sous votre rang.';
}

async function choose(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // The same file may be chosen again later.
  input.value = '';
  if (!file) return;
  chosen.value = await openProfileSave(file);
  notice.value = chosen.value ? '' : 'Ce fichier n\'est pas une sauvegarde de Casserolade.';
}

function restore(): void {
  if (!chosen.value) return;
  const done = restoreProfileSave(chosen.value);
  chosen.value = null;
  if (done) emit('restored');
  else notice.value = 'Le navigateur refuse d\'enregistrer la sauvegarde.';
}
</script>

<template>
  <div class="profile-save">
    <template v-if="chosen">
      <p class="ask" role="status">Cette sauvegarde remplace le profil de ce navigateur : rang, succès et carrière.</p>
      <AppButton primary @click="restore">Remplacer</AppButton>
      <AppButton @click="chosen = null">Annuler</AppButton>
    </template>
    <template v-else>
      <AppButton @click="save">Sauvegarder mon profil</AppButton>
      <AppButton @click="picker?.click()">Restaurer une sauvegarde</AppButton>
      <input ref="picker" class="picker" type="file" accept=".json,application/json" aria-label="Fichier de sauvegarde" tabindex="-1" @change="choose" />
      <p class="notice" role="status">{{ notice || 'Sans compte : un fichier emporte votre profil vers un autre navigateur.' }}</p>
    </template>
  </div>
</template>

<style scoped>
.profile-save { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.4rem 0.8rem; }
.profile-save :deep(.app-button) { padding: 0.32em 0.9em; border-width: 2px; font-size: 0.98rem; }
/* The browser's own file button stays out of sight: the game's button opens it. */
.picker { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.notice, .ask { margin: 0; color: var(--color-text-muted); font-size: 0.88rem; text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
.ask { color: var(--color-text); font-weight: 700; }
</style>
