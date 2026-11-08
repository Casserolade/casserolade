<script setup lang="ts">
import { computed, ref } from 'vue';
import CutscenePlayer from '#src/client/components/organisms/CutscenePlayer.vue';
import { DEMO_CUTSCENE } from '#src/client/const/demoCutscene.ts';
import type { Cutscene } from '#src/client/cutscenes/createCutscene.ts';
import { WRITTEN_CAREERS } from '#src/client/const/writtenCareers.ts';
import type { Cinematique } from '#src/data/histoire/cinematique.ts';

/**
 * Development only: the cutscenes of every career, to watch before they enter the game. One plays at a time; at its
 * end, or with « Tout jouer », the next one follows.
 */
const careers = computed(() => [...WRITTEN_CAREERS].sort((a, b) => a.difficulte - b.difficulte || a.heros.localeCompare(b.heros)));
const playing = ref<Cinematique | null>(null);
const queue = ref<Cinematique[]>([]);

function play(list: Cinematique[]): void {
  queue.value = list.slice(1);
  playing.value = list[0] ?? null;
}

/** Browser checks drive the timeline from here: seek it, take pictures. */
function expose(cutscene: Cutscene): void {
  (window as unknown as { __cutscene?: Cutscene }).__cutscene = cutscene;
}

function next(): void {
  const [following, ...rest] = queue.value;
  queue.value = rest;
  playing.value = following ?? null;
}
</script>

<template>
  <main class="review">
    <h1>Cinématiques</h1>
    <p><button type="button" @click="play([DEMO_CUTSCENE])">▶ Démonstration de toutes les actions</button></p>
    <p v-if="!careers.length">Aucune carrière écrite pour l'instant.</p>
    <section v-for="career in careers" :key="career.heros" class="career">
      <h2>{{ career.heros }} <small>difficulté {{ career.difficulte }} · boss {{ career.boss }}{{ career.fiction ? ' · fiction' : '' }}</small></h2>
      <p class="pitch">{{ career.accroche }}</p>
      <button type="button" @click="play(career.cinematiques)">▶ Tout jouer</button>
      <ul>
        <li v-for="cutscene in career.cinematiques" :key="cutscene.id">
          <button type="button" @click="play([cutscene])">▶</button>
          {{ cutscene.id }} · {{ cutscene.moment }} · {{ cutscene.style }} · {{ cutscene.duree }} s · {{ cutscene.decor }}
        </li>
      </ul>
    </section>
    <CutscenePlayer v-if="playing" :key="playing.id" :cinematique="playing" @end="next" @ready="expose" />
  </main>
</template>

<style scoped>
.review { max-width: 1100px; margin: 0 auto; padding: 24px; }
.career { margin: 24px 0; padding: 16px 20px; border-radius: 14px; background: var(--color-surface, #1b2440); }
.career h2 small { font-size: 0.6em; opacity: 0.7; }
.pitch { font-style: italic; }
ul { list-style: none; padding: 0; }
li { margin: 6px 0; }
button { cursor: pointer; }
.big { font-size: 1.4rem; padding: 0.4em 1em; }
</style>
