<script setup lang="ts">
import { GAME_ICONS } from '#src/client/const/gameIcons.ts';
import type { GameIconName } from '#src/client/const/gameIcons.ts';

/** A drawn icon, 1em wide, in the current color, with a dark outline so it reads on any background. */
withDefaults(defineProps<{ name: GameIconName; outline?: boolean }>(), { outline: true });
</script>

<template>
  <svg class="game-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path v-if="outline" class="edge" :d="GAME_ICONS[name]" />
    <path :d="GAME_ICONS[name]" fill-rule="evenodd" />
  </svg>
</template>

<style scoped>
.game-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.14em; fill: currentColor; overflow: visible; }
.edge { fill: none; stroke: var(--icon-edge, rgb(10 10 16 / 0.85)); stroke-width: 3.2; stroke-linejoin: round; }
</style>
