<script setup lang="ts">
import LeaveGameButton from '#src/client/components/atoms/LeaveGameButton.vue';
import ChatPanel from '#src/client/components/organisms/ChatPanel.vue';
import SettingsButton from '#src/client/components/organisms/SettingsButton.vue';
import type { ModerablePlayer } from '#src/client/tools/moderablePlayers.ts';
import type { MessageChat } from '#src/protocol/messages.ts';

/**
 * The frame of the phone's game screens: one button in the top right corner, at the end of the bar, which opens the
 * settings (the sounds, the music, the visual effects) with the door to leave at their foot; the chat at the bottom
 * left, opening upward, under the thumb; and a word to hold the phone upright when it is held sideways.
 */
/** `muted`: the host cut this player's chat. `people`: for the room's host, the players it may mute or put out. */
defineProps<{ inGame: boolean; showChat: boolean; messages: MessageChat[]; me: string; muted: boolean; people: ModerablePlayer[] }>();
const emit = defineEmits<{ leave: []; send: [text: string]; mute: [pseudo: string, muted: boolean]; kick: [pseudo: string] }>();
</script>

<template>
  <div v-if="inGame" class="menu">
    <SettingsButton label="Réglages et sortie : sons du jeu, musique, effets visuels, quitter la partie">
      <p class="leave-row">
        <LeaveGameButton @leave="emit('leave')" />
        <span class="leave-name">Quitter la partie</span>
      </p>
    </SettingsButton>
  </div>
  <p v-if="inGame" class="upright" role="status">Tenez votre téléphone droit : la table se joue en hauteur.</p>
  <div v-if="showChat" class="chat-spot">
    <ChatPanel floating :messages="messages" :me="me" :muted="muted" :people="people" @send="(text) => emit('send', text)" @mute="(pseudo, on) => emit('mute', pseudo, on)" @kick="(pseudo) => emit('kick', pseudo)" />
  </div>
</template>

<style scoped>
.menu { position: fixed; z-index: 60; top: calc(env(safe-area-inset-top) + 6px); right: 8px; --size: 38px; }
/* The door, at the foot of the settings: a row like theirs; its question takes the row when it asks. */
.leave-row { --leave-size: 2.6rem; display: flex; align-items: center; gap: 0.8rem; margin: 0; padding-top: 1rem; border-top: 2px solid rgb(255 255 255 / 0.14); }
.leave-name { color: var(--color-title); font: 400 1.35rem / 1.1 var(--font-number); letter-spacing: 0.04em; }
.leave-row:has(.asking) .leave-name { display: none; }
/* The chat's toggle at the bottom left; its panel opens above it, in the phone's sizes (--s). */
.chat-spot { --s: 0.62px; position: fixed; z-index: 61; left: 8px; bottom: calc(env(safe-area-inset-bottom) + 12px); }
.chat-spot :deep(.chat.floating) { position: relative; left: 0; top: 0; flex-direction: column-reverse; }
.chat-spot :deep(.chat.floating .panel) { width: min(80vw, 22rem); }
/* A new line peeks out above the toggle, at a reading size: beside it, it would cover the table's own words. */
.chat-spot :deep(.chat.floating .peek) { left: 0; top: auto; bottom: calc(100% + 8px); max-width: min(78vw, 20rem); padding: 6px 12px; border-radius: 12px; font-size: 0.95rem; }
/* A phone held sideways: the table is drawn upright. Turning it back is all it takes; nothing to close. */
.upright { display: none; }
@media (orientation: landscape) and (max-height: 500px) {
  .upright { position: fixed; z-index: 95; inset: 0; display: grid; place-items: center; margin: 0; padding: 2rem; background: #0b0e18; color: var(--color-title); font: 400 1.6rem / 1.2 var(--font-number); letter-spacing: 1px; text-align: center; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; }
}
</style>
