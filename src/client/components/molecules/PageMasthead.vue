<script setup lang="ts">
import { assetUrl } from '#src/client/tools/assetUrl.ts';

/** The top of a page of the site outside the game (the bestiary, the update notes): the logo home, a title, a line. */
defineProps<{ title: string; intro: string }>();
</script>

<template>
  <header class="masthead">
    <a class="logo" href="/"><img :src="assetUrl('logo/casserolade-fr.webp')" alt="Casserolade" width="1400" height="640" /></a>
    <h1>{{ title }}</h1>
    <p class="intro">{{ intro }}</p>
  </header>
</template>

<style scoped>
.masthead { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); text-align: center; }
.logo img { width: min(100%, 26rem); height: auto; filter: drop-shadow(0 14px 24px rgb(0 0 0 / 0.6)); }
h1 { margin: 0; color: var(--color-accent); font: 400 3rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 6px var(--color-ink); paint-order: stroke fill; }
.intro { max-width: 40rem; margin: 0; color: var(--color-text-muted); font-size: 1.1rem; line-height: 1.5; }
</style>
