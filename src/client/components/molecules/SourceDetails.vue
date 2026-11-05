<script setup lang="ts">
import { computed } from 'vue';
import type { EntrySources } from '#src/client/tools/personSources.ts';
import { isWebLink } from '#src/client/tools/isWebLink.ts';

/** Where a card comes from, folded: its photos, its real voices, its lines, each with its link. Null while loading. */
const props = defineProps<{ sources: EntrySources | null }>();
const count = computed(() => (props.sources ? props.sources.photos.length + props.sources.voices.length + props.sources.lines.length : 0));
</script>

<template>
  <details v-if="sources && count > 0" class="sources">
    <summary>Sources ({{ count }})</summary>
    <ul>
      <li v-for="photo in sources.photos" :key="`photo-${photo.nom}-${photo.source}`">
        <strong>Photo</strong> {{ photo.nom }}<template v-if="photo.auteur">, par {{ photo.auteur }}</template><template v-if="photo.licence">, {{ photo.licence }}</template>.
        <a v-if="isWebLink(photo.source)" :href="photo.source" target="_blank" rel="noreferrer">Source</a>
        <template v-else>{{ photo.source }}</template>
      </li>
      <li v-for="voice in sources.voices" :key="`voice-${voice.nom}`">
        <strong>Voix</strong> « {{ voice.phrase || voice.nom }} »<template v-if="voice.auteur"> : {{ voice.auteur }}</template>.
        <a v-if="isWebLink(voice.source)" :href="voice.source" target="_blank" rel="noreferrer">Source</a>
      </li>
      <li v-for="line in sources.lines" :key="`line-${line.texte}`">
        <strong>Phrase</strong> « {{ line.texte }} »<template v-if="line.date"> ({{ line.date }})</template>.
        <a v-for="(url, index) in line.sources" :key="url" :href="url" target="_blank" rel="noreferrer">Source{{ line.sources.length > 1 ? ` ${index + 1}` : '' }}</a>
      </li>
    </ul>
  </details>
</template>

<style scoped>
.sources { color: var(--color-text-muted); font-size: var(--font-size-small); line-height: 1.35; }
summary { color: var(--color-accent); font-weight: 700; cursor: pointer; }
ul { display: flex; flex-direction: column; gap: var(--space-2); margin: var(--space-2) 0 0; padding: 0; list-style: none; }
strong { color: var(--color-text); }
a { margin-left: var(--space-1); color: var(--color-accent); }
</style>
