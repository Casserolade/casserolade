<script setup lang="ts">
import { computed, defineAsyncComponent, ref, shallowRef, watch } from 'vue';
import StoryFeed from '#src/client/components/organisms/StoryFeed.vue';
import StoryQuest from '#src/client/components/molecules/StoryQuest.vue';
import GameScreens from '#src/client/screens/GameScreens.vue';
import StoryChapterScreen from '#src/client/screens/story/StoryChapterScreen.vue';
import StoryEndScreen from '#src/client/screens/story/StoryEndScreen.vue';
import StoryHeroScreen from '#src/client/screens/story/StoryHeroScreen.vue';
import StoryResultScreen from '#src/client/screens/story/StoryResultScreen.vue';
import { loadCampaign, saveCampaign } from '#src/client/services/campaignStorage.ts';
import { counter } from '#src/client/services/counter.ts';
import { clearLocalGame, markLocalGame } from '#src/client/services/interruptedGame.ts';
import { achievements } from '#src/client/stores/achievements.ts';
import { createGameStore } from '#src/client/stores/createGameStore.ts';
import type { GameStore } from '#src/client/stores/createGameStore.ts';
import { StoryRun } from '#src/client/stores/createStoryRun.ts';
import { apresChapitre, chapitreCourant, nouvelleCampagne } from '#src/histoire/campagne.ts';
import { cinematiqueApres, cinematiqueDe } from '#src/histoire/carrieres.ts';
import type { Scene } from '#src/data/histoire/cinematique.ts';
import type { Campagne } from '#src/histoire/campagne.ts';
import { generateSeed } from '#src/server/generateSeed.ts';

/** The cutscenes and their animation library load only when a career plays one. */
const CutscenePlayer = defineAsyncComponent(() => import('#src/client/components/organisms/CutscenePlayer.vue'));
const LiveCutscenePlayer = defineAsyncComponent(() => import('#src/client/components/organisms/LiveCutscenePlayer.vue'));

const emit = defineEmits<{ leave: [] }>();

const campaign = ref<Campagne | null>(loadCampaign());
const run = shallowRef<StoryRun | null>(null);
const store = shallowRef<GameStore | null>(null);
const chapter = computed(() => (campaign.value ? chapitreCourant(campaign.value) : null));
const currentLine = computed(() => run.value?.currentLine.value ?? null);
const bilan = computed(() => run.value?.bilan.value ?? null);
/** The quest of a career's chapter (sponsorships, an ultimatum), as the player sees it. */
const quest = computed(() => store.value?.view.value?.quete ?? null);
/** The election night comes once the game screens are done: after the combat, and after the elimination. */
const resultShown = computed(() => Boolean(bilan.value && (!store.value || store.value.screen.value === 'end')));

/** A chapter played to the end counts as a game; won, it counts as the chapter too. */
watch(bilan, (result) => {
  if (!result || !store.value || !chapter.value) return;
  const ranking = store.value.ranking.value;
  if (ranking) {
    achievements.recordGame(ranking, store.value.view.value, result.reussi ? { chapitre: chapter.value.id } : {});
    counter.gameEnded({ mode: 'carriere', chapitre: chapter.value.id }, ranking, store.value.view.value, result.reussi);
  }
  clearLocalGame();
});

/** The cutscene playing over everything, and what comes after it. Each one plays once in a campaign. */
const cutscene = shallowRef<Scene | null>(null);
/** A HyperFrames page drawn live, or puppets described in data: both play in the page, never as a video. */
const page = computed(() => (cutscene.value && 'page' in cutscene.value ? cutscene.value : null));
const puppets = computed(() => (cutscene.value && !('page' in cutscene.value) ? cutscene.value : null));
let afterCutscene: (() => void) | null = null;

function showCutscene(scene: Scene | null, then: () => void): void {
  const current = campaign.value;
  if (!scene || !current || current.vues?.includes(scene.id)) {
    then();
    return;
  }
  setCampaign({ ...current, vues: [...(current.vues ?? []), scene.id] });
  afterCutscene = then;
  cutscene.value = scene;
}

function endCutscene(): void {
  const then = afterCutscene;
  afterCutscene = null;
  cutscene.value = null;
  then?.();
}

/** The duel at the end of a career: winning it, or losing it, has its own scene. */
function isFinal(): boolean {
  return Boolean(campaign.value?.carriere && chapter.value?.boss && chapter.value.id !== 'outre_tombe');
}

watch(bilan, (result) => {
  if (!result || result.reussi || !campaign.value || !isFinal()) return;
  showCutscene(cinematiqueDe(campaign.value.heroId, 'defaite'), () => undefined);
});

function setCampaign(next: Campagne | null): void {
  campaign.value = next;
  saveCampaign(next);
}

function chooseHero(heroId: string): void {
  setCampaign(nouvelleCampagne(heroId, generateSeed()));
  showCutscene(cinematiqueDe(heroId, 'intro'), () => undefined);
}

/** A chapter of a career may open with its scene, the first time it is played. */
function play(): void {
  if (!campaign.value || !chapter.value) return;
  const scene = campaign.value.carriere ? cinematiqueDe(campaign.value.heroId, 'avant_chapitre', chapter.value.id) : null;
  showCutscene(scene, startChapter);
}

function startChapter(): void {
  if (!campaign.value || !chapter.value) return;
  stopRun();
  achievements.startGame();
  run.value = new StoryRun(chapter.value, campaign.value.heroId, campaign.value.bossId);
  store.value = createGameStore(run.value);
  markLocalGame({ kind: 'carriere' });
  counter.gameStarted({ mode: 'carriere', chapitre: chapter.value.id });
}

function stopRun(): void {
  store.value?.leave();
  store.value = null;
  run.value = null;
  clearLocalGame();
}

/** A won chapter may close on its scene; the career's last one, on the victory. */
function finishChapter(): void {
  if (!campaign.value || !chapter.value || !bilan.value) return;
  const elected = isFinal() && bilan.value.reussi;
  const closing = bilan.value.reussi && campaign.value.carriere ? cinematiqueApres(campaign.value.heroId, chapter.value.id) : null;
  setCampaign(apresChapitre(campaign.value, chapter.value, bilan.value));
  stopRun();
  if (!campaign.value) return;
  showCutscene(elected ? cinematiqueDe(campaign.value.heroId, 'victoire') : closing, () => undefined);
}

function abandon(): void {
  stopRun();
  setCampaign(null);
}

function leave(): void {
  stopRun();
  emit('leave');
}
</script>

<template>
  <LiveCutscenePlayer v-if="page" :key="page.id" :cinematique="page" @end="endCutscene" />
  <CutscenePlayer v-else-if="puppets" :key="puppets.id" :cinematique="puppets" @end="endCutscene" />
  <StoryHeroScreen v-if="!campaign" @choose="chooseHero" @leave="leave" />
  <StoryResultScreen
    v-else-if="bilan && chapter && resultShown"
    :bilan="bilan"
    :chapter="chapter"
    :hero-id="campaign.heroId"
    :boss-id="run?.bossId ?? null"
    :unlocked="achievements.fresh.value"
    @next="finishChapter"
    @retry="play"
    @leave="leave"
  />
  <template v-else-if="store && run">
    <!-- Leaving the game gives up this election: back to its page, to play it again or go home. -->
    <GameScreens :store="store" @leave="stopRun">
      <template #recruit-side>
        <StoryQuest v-if="quest" :quest="quest" />
        <StoryFeed v-if="currentLine" :line="currentLine" :hero-id="campaign.heroId" :boss-id="run.bossId" />
      </template>
    </GameScreens>
  </template>
  <StoryChapterScreen v-else-if="chapter" :chapter="chapter" :campaign="campaign" @play="play" @abandon="abandon" @leave="leave" />
  <StoryEndScreen v-else :campaign="campaign" @restart="abandon" @leave="leave" />
</template>
