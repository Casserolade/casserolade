<script setup lang="ts">
import { ref } from 'vue';
import { TRAILER_LENGTH, TRAILER_PICTURE, TRAILER_PLAYER_URL } from '#src/client/const/trailer.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';

/**
 * The trailer, under the Discord while no live is on: a small picture first, and YouTube's player only once asked
 * for, in its place.
 */
const playing = ref(false);
</script>

<template>
  <div class="trailer-card">
    <div v-if="playing" class="player">
      <iframe :src="TRAILER_PLAYER_URL" title="La bande-annonce de Casserolade" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" />
    </div>
    <button v-else type="button" class="teaser" @click="playing = true">
      <span class="picture"><img :src="assetUrl(TRAILER_PICTURE)" alt="" width="480" height="270" /><span class="play" aria-hidden="true" /></span>
      <span class="words">
        <span class="kicker">La bande-annonce</span>
        <strong>Ils sont tous là, et ça dégénère.</strong>
        <span class="length">{{ TRAILER_LENGTH }} · sur YouTube</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.teaser { display: flex; align-items: center; gap: 0.9rem; width: 100%; padding: 0.55rem; border-radius: 14px; border: 2px solid rgb(255 255 255 / 0.25); background: rgb(0 0 0 / 0.28); color: var(--color-text); font: inherit; text-align: left; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.teaser:hover, .teaser:focus-visible { border-color: rgb(255 255 255 / 0.6); background: rgb(0 0 0 / 0.42); }
.picture { position: relative; flex: none; width: 9.5rem; aspect-ratio: 16 / 9; border-radius: 9px; overflow: hidden; }
.picture img { display: block; width: 100%; height: 100%; object-fit: cover; }
/* The red button of a video, drawn in CSS. */
.play { position: absolute; left: 50%; top: 50%; width: 2.8rem; height: 2rem; border-radius: 0.6rem; background: #f00; transform: translate(-50%, -50%); box-shadow: 0 3px 10px rgb(0 0 0 / 0.5); transition: transform 0.15s; }
.play::after { content: ''; position: absolute; left: 1.1rem; top: 0.55rem; border-style: solid; border-width: 0.45rem 0 0.45rem 0.8rem; border-color: transparent transparent transparent #fff; }
.teaser:hover .play, .teaser:focus-visible .play { transform: translate(-50%, -50%) scale(1.12); }
.words { display: flex; flex-direction: column; gap: 0.15rem; line-height: 1.25; }
.kicker { color: var(--color-text-muted); font-size: var(--font-size-small); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
strong { font-size: 1.1rem; }
.length { color: var(--color-text-muted); font-size: 0.95rem; }
.player { aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; background: #000; }
.player iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>
