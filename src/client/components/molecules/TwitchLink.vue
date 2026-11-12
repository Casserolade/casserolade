<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { TWITCH_URL } from '#src/client/const/twitchChannel.ts';

/** The quiet link to the game's Twitch channel, under the online side: quieter than the Discord, but there. */
</script>

<template>
  <a class="twitch-link" :href="TWITCH_URL" target="_blank" rel="noopener">
    <GameIcon name="twitch" :outline="false" class="mark" />
    <span>Un étrange streamer joue peut-être en ce moment sur Twitch. Il répondra à toutes vos questions sur le jeu. <span class="go">Voir la chaîne</span></span>
  </a>
</template>

<style scoped>
.twitch-link { display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem 0.8rem; border-radius: 14px; border: 2px solid rgb(145 70 255 / 0.45); background: rgb(145 70 255 / 0.12); color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.3; text-decoration: none; transition: background 0.15s, border-color 0.15s; }
.twitch-link:hover, .twitch-link:focus-visible { border-color: var(--color-twitch); background: rgb(145 70 255 / 0.24); color: var(--color-text); }
.mark { flex: none; width: 1.7rem; height: 1.7rem; color: var(--color-twitch); }
.go { color: #c9a8ff; font-weight: 700; text-decoration: underline; white-space: nowrap; }
</style>
