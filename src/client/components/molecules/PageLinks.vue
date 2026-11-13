<script setup lang="ts">
import { CHANGELOG_URL, CODE_URL } from '#src/client/const/codeLinks.ts';
import { DISCORD_URL } from '#src/protocol/discord.ts';
import { KOFI_URL } from '#src/client/const/supportLink.ts';

/** The foot of a page of the site outside the game: where else to go. The page itself is not listed. */
defineProps<{ current: 'bestiaire' | 'mises-a-jour' }>();
</script>

<template>
  <nav class="links" aria-label="Le site">
    <a href="/">Jouer</a>
    <a v-if="current !== 'bestiaire'" href="/bestiaire">Le bestiaire</a>
    <a v-if="current !== 'mises-a-jour'" :href="CHANGELOG_URL">Mises à jour</a>
    <a href="/a-propos">À propos</a>
    <a :href="DISCORD_URL">Le Discord</a>
    <a :href="CODE_URL">Le code sur GitHub</a>
    <a :href="KOFI_URL">Soutenir sur Ko-fi</a>
  </nav>
</template>

<style scoped>
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3) var(--space-5); }
.links a { color: var(--color-accent); font-weight: 700; }
</style>
