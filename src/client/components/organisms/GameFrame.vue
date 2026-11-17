<script setup lang="ts">
import LeaveGameButton from '#src/client/components/atoms/LeaveGameButton.vue';
import ChatPanel from '#src/client/components/organisms/ChatPanel.vue';
import type { ModerablePlayer } from '#src/client/tools/moderablePlayers.ts';
import type { MessageChat } from '#src/protocol/messages.ts';

/**
 * The table's own frame on a computer, over every game screen: the door to leave under the sound, in the top right
 * corner, and the chat in the top left one, in table pixels.
 */
/** `muted`: the host cut this player's chat. `people`: for the room's host, the players it may mute or put out. */
defineProps<{ inGame: boolean; showChat: boolean; messages: MessageChat[]; me: string; muted: boolean; people: ModerablePlayer[] }>();
const emit = defineEmits<{ leave: []; send: [text: string]; mute: [pseudo: string, muted: boolean]; kick: [pseudo: string] }>();
</script>

<template>
  <div v-if="inGame" class="corner">
    <LeaveGameButton class="leave" @leave="emit('leave')" />
  </div>
  <div v-if="showChat" class="corner chat-layer">
    <ChatPanel floating :messages="messages" :me="me" :muted="muted" :people="people" @send="(text) => emit('send', text)" @mute="(pseudo, on) => emit('mute', pseudo, on)" @kick="(pseudo) => emit('kick', pseudo)" />
  </div>
</template>

<style scoped>
.corner { position: fixed; z-index: 60; left: 50%; top: 50%; width: calc(var(--s) * 1920); height: calc(var(--s) * 1080); translate: -50% -50%; pointer-events: none; }
.chat-layer { z-index: 61; }
.leave { position: absolute; right: calc(var(--s) * 26); top: calc(var(--s) * 100); --leave-size: calc(var(--s) * 64); }
</style>
