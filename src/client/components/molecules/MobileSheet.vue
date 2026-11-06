<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

/**
 * A sheet rising from the bottom of the phone, over a darkened table: whatever it holds, a touch outside it or Escape
 * closes it. Opened by the player, it never stops the game: the round's time goes on.
 */
defineProps<{ label: string }>();
const emit = defineEmits<{ close: [] }>();

const dialog = useTemplateRef<HTMLDialogElement>('dialog');

/** A touch on the dark around the sheet: the dialog itself is under the finger, not its content. */
function closeOutside(event: MouseEvent): void {
  if (event.target === dialog.value) emit('close');
}

onMounted(() => dialog.value?.showModal());
</script>

<template>
  <dialog ref="dialog" class="sheet" :aria-label="label" @cancel.prevent="emit('close')" @click="closeOutside">
    <div class="content"><slot /></div>
  </dialog>
</template>

<style scoped>
/* Its words at a reading size: the glossary and the cards inside take their size from --s. */
.sheet {
  --s: 0.72px;
  position: fixed;
  inset: auto 0 0;
  width: 100%;
  max-width: 34rem;
  max-height: 92dvh;
  margin: 0 auto;
  padding: 0;
  border: 3px solid var(--color-frame);
  border-bottom: 0;
  border-radius: 24px 24px 0 0;
  background: var(--panel-background), #0b0f20;
  color: var(--color-text);
  box-shadow: 0 -12px 40px rgb(0 0 0 / 0.6);
  animation: sheet-in 0.22s cubic-bezier(0.3, 1.2, 0.5, 1);
}
.sheet::backdrop { background: rgb(3 5 12 / 0.72); }
.content { display: flex; flex-direction: column; max-height: calc(92dvh - 3px); }
@keyframes sheet-in { from { transform: translateY(40%); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .sheet { animation: none; } }
</style>
