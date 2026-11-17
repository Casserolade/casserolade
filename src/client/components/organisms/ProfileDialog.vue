<script setup lang="ts">
import { useTemplateRef } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import RankBadge from '#src/client/components/atoms/RankBadge.vue';
import ProfileSave from '#src/client/components/organisms/ProfileSave.vue';

/**
 * The player's profile, in a window over the home page: the rank in the rooms (`rating`, null before a first game
 * against another human), and what saves the profile to a file or puts one back. A profile put back is read again
 * from the start: the page loads anew. `open()` shows it.
 */
withDefaults(defineProps<{ rating?: number | null }>(), { rating: null });

const dialog = useTemplateRef<HTMLDialogElement>('dialog');

defineExpose({ open: () => dialog.value?.showModal() });

/** A click on the dark around the window closes it. */
function closeOutside(event: MouseEvent): void {
  if (event.target === dialog.value) dialog.value?.close();
}

function reloadPage(): void {
  window.location.reload();
}
</script>

<template>
  <dialog ref="dialog" class="profile" aria-labelledby="profile-title" @click="closeOutside">
    <h2 id="profile-title">Votre profil</h2>
    <p class="rank-line">
      <template v-if="rating !== null">Votre rang en salon <RankBadge class="rank" :mmr="rating" detailed /></template>
      <template v-else>Pas encore de rang : il vient avec votre première partie de salon contre un autre joueur.</template>
    </p>
    <p class="how">Le rang est gardé par le serveur, sous une clé que seul ce navigateur connaît : personne ne peut le modifier. La sauvegarde emporte cette clé, vos succès et votre carrière.</p>
    <ProfileSave class="save" @restored="reloadPage" />
    <form method="dialog" class="actions"><AppButton type="submit">Fermer</AppButton></form>
  </dialog>
</template>

<style scoped>
.profile { width: min(38rem, 94vw); padding: 1.1rem 1.4rem; border: 2px solid var(--color-frame); border-radius: 16px; background: var(--panel-background, #0b1024); color: var(--color-text); box-shadow: 0 20px 60px rgb(0 0 0 / 0.7); }
.profile::backdrop { background: rgb(3 5 12 / 0.78); }
h2 { margin: 0 0 0.6rem; color: var(--color-title); font: 400 1.6rem / 1 var(--font-number); letter-spacing: 1px; }
.rank-line { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; margin: 0 0 0.5rem; font-weight: 700; }
.rank { font-size: 0.95rem; }
.how { margin: 0 0 0.9rem; color: var(--color-text-muted); font-size: 0.92rem; line-height: 1.35; }
.save { justify-content: flex-start; }
.actions { display: flex; justify-content: flex-end; margin-top: 0.9rem; }
.actions :deep(.app-button) { padding: 0.36em 1.1em; border-width: 2px; font-size: 1.05rem; }
</style>
