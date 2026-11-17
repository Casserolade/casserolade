<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import { TRAILER_PLAYER_URL } from '#src/client/const/trailer.ts';

/**
 * The trailer, played in the middle of the page, over everything: YouTube's player in a window of its own, closed by
 * its button, by Escape or by a click on the dark around it. YouTube is only asked for the player while the window
 * is open: closing it stops the film. `open()` shows it.
 */
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const playing = ref(false);

function open(): void {
  playing.value = true;
  dialog.value?.showModal();
}

defineExpose({ open });

/** A click on the dark around the film closes it. */
function closeOutside(event: MouseEvent): void {
  if (event.target === dialog.value) dialog.value?.close();
}
</script>

<template>
  <dialog ref="dialog" class="trailer-player" aria-label="La bande-annonce de Casserolade" @click="closeOutside" @close="playing = false">
    <div class="screen">
      <iframe v-if="playing" :src="TRAILER_PLAYER_URL" title="La bande-annonce de Casserolade" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" />
    </div>
    <form method="dialog" class="actions"><AppButton type="submit">Fermer</AppButton></form>
  </dialog>
</template>

<style scoped>
/* As wide as the screen allows, without ever being taller than it: the film keeps its 16 by 9. */
.trailer-player { width: min(92vw, (100dvh - 7rem) * 16 / 9, 80rem); max-width: none; max-height: none; padding: 0.6rem; border: 2px solid var(--color-frame); border-radius: 14px; background: var(--panel-background, #0b1024); color: var(--color-text); box-shadow: 0 20px 60px rgb(0 0 0 / 0.7); }
.trailer-player::backdrop { background: rgb(3 5 12 / 0.82); }
.screen { aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: #000; }
.screen iframe { display: block; width: 100%; height: 100%; border: 0; }
.actions { display: flex; justify-content: center; margin-top: 0.6rem; }
.actions :deep(.app-button) { padding: 0.36em 1.1em; border-width: 2px; font-size: 1.05rem; }
</style>
