<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { TWITCH_URL } from '#src/protocol/twitch.ts';

/** The quiet link to the game's Twitch channel, under the online side, while it is live: its riddle first. */
</script>

<template>
  <a class="twitch-link" :href="TWITCH_URL" target="_blank" rel="noopener">
    <GameIcon name="twitch" :outline="false" class="mark" />
    <span class="words">
      <em class="riddle">Homme ou machine, nul n'imagine, quel est son secret, nul ne le sait. Mais quand on lui pose des questions, il y répond…</em>
      <span>Un étrange streamer joue en ce moment sur Twitch. <span class="go">Voir la chaîne</span></span>
    </span>
  </a>
</template>

<style scoped>
.twitch-link { display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem 0.8rem; border-radius: 14px; border: 2px solid rgb(145 70 255 / 0.45); background: rgb(145 70 255 / 0.12); color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.3; text-decoration: none; transition: background 0.15s, border-color 0.15s; }
.twitch-link:hover, .twitch-link:focus-visible { border-color: var(--color-twitch); background: rgb(145 70 255 / 0.24); color: var(--color-text); }
.words { display: flex; flex-direction: column; gap: 0.15rem; }
.riddle { color: #c9a8ff; font-style: italic; }
.mark { flex: none; width: 1.7rem; height: 1.7rem; color: var(--color-twitch); }
.go { color: #c9a8ff; font-weight: 700; text-decoration: underline; white-space: nowrap; }
</style>
