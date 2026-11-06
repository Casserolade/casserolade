<script setup lang="ts">
import LeaveGameButton from '#src/client/components/atoms/LeaveGameButton.vue';
import ChatPanel from '#src/client/components/organisms/ChatPanel.vue';
import type { MessageChat } from '#src/protocol/messages.ts';

/**
 * The frame of the phone's game screens: the door to leave in the top right corner, at the end of the bar, the chat at
 * the bottom left, opening upward, under the thumb, and a word to hold the phone upright when it is held sideways.
 */
defineProps<{ inGame: boolean; showChat: boolean; messages: MessageChat[]; seat: number }>();
const emit = defineEmits<{ leave: []; send: [text: string] }>();
</script>

<template>
  <div v-if="inGame" class="door">
    <LeaveGameButton class="leave" @leave="emit('leave')" />
  </div>
  <p v-if="inGame" class="upright" role="status">Tenez votre téléphone droit : la table se joue en hauteur.</p>
  <div v-if="showChat" class="chat-spot">
    <ChatPanel floating :messages="messages" :seat="seat" @send="(text) => emit('send', text)" />
  </div>
</template>

<style scoped>
.door { position: fixed; z-index: 60; top: calc(env(safe-area-inset-top) + 6px); right: 8px; --leave-size: 38px; }
/* The chat's toggle at the bottom left; its panel opens above it, in the phone's sizes (--s). */
.chat-spot { --s: 0.62px; position: fixed; z-index: 61; left: 8px; bottom: calc(env(safe-area-inset-bottom) + 12px); }
.chat-spot :deep(.chat.floating) { position: relative; left: 0; top: 0; flex-direction: column-reverse; }
.chat-spot :deep(.chat.floating .panel) { width: min(80vw, 22rem); }
/* A phone held sideways: the table is drawn upright. Turning it back is all it takes; nothing to close. */
.upright { display: none; }
@media (orientation: landscape) and (max-height: 500px) {
  .upright { position: fixed; z-index: 95; inset: 0; display: grid; place-items: center; margin: 0; padding: 2rem; background: #0b0e18; color: var(--color-title); font: 400 1.6rem / 1.2 var(--font-number); letter-spacing: 1px; text-align: center; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; }
}
</style>
