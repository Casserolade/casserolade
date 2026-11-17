<script setup lang="ts">
import ModerationButtons from '#src/client/components/molecules/ModerationButtons.vue';
import type { ModerablePlayer } from '#src/client/tools/moderablePlayers.ts';

/**
 * In the chat of a game, for the room's host: the other players, each with what mutes its chat or puts it out.
 * Folded until asked for; nothing for anyone else.
 */
defineProps<{ people: ModerablePlayer[] }>();
const emit = defineEmits<{ mute: [pseudo: string, muted: boolean]; kick: [pseudo: string] }>();
</script>

<template>
  <details v-if="people.length" class="people">
    <summary>Modérer le salon</summary>
    <ul>
      <li v-for="player in people" :key="player.pseudo">
        <span class="name">{{ player.pseudo }}</span>
        <ModerationButtons :pseudo="player.pseudo" :muted="player.muted" @mute="(muted) => emit('mute', player.pseudo, muted)" @kick="emit('kick', player.pseudo)" />
      </li>
    </ul>
  </details>
</template>

<style scoped>
.people { --moderation-size: 0.85em; color: var(--color-text); font-size: inherit; }
summary { width: fit-content; color: var(--color-text-muted); font-weight: 700; cursor: pointer; }
summary:hover, .people[open] summary { color: var(--color-text); }
ul { display: flex; flex-direction: column; gap: 0.4em; margin: 0.4em 0 0; padding: 0; list-style: none; }
li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.3em 0.8em; }
.name { min-width: 0; overflow: hidden; font-weight: 700; white-space: nowrap; text-overflow: ellipsis; }
</style>
