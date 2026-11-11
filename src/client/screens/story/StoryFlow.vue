<script setup lang="ts">
import { computed, defineAsyncComponent, ref, shallowRef, useTemplateRef, watch } from 'vue';
import StoryFeed from '#src/client/components/organisms/StoryFeed.vue';
import StoryQuest from '#src/client/components/molecules/StoryQuest.vue';
import CinemaShelf from '#src/client/components/organisms/CinemaShelf.vue';
import { cinemaCheat } from '#src/client/stores/cinemaCheat.ts';
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
import { cinematiqueApres, cinematiqueDe, idCompteur } from '#src/histoire/carrieres.ts';
import type { Scene } from '#src/data/histoire/cinematique.ts';
import type { Campagne } from '#src/histoire/campagne.ts';
import { generateSeed } from '#src/server/generateSeed.ts';

/** The cutscenes and their animation library load only when a career plays one. */
const CutscenePlayer = defineAsyncComponent(() => import('#src/client/components/organisms/CutscenePlayer.vue'));

const emit = defineEmits<{ leave: [] }>();

const campaign = ref<Campagne | null>(loadCampaign());
const run = shallowRef<StoryRun | null>(null);
const store = shallowRef<GameStore | null>(null);
const chapter = computed(() => (campaign.value ? chapitreCourant(campaign.value) : null));
const currentLine = computed(() => run.value?.currentLine.value ?? null);
const bilan = computed(() => run.value?.bilan.value ?? null);
/** The quest of a career's chapter (sponsorships, an ultimatum), as the player sees it. */
const quest = computed(() => store.value?.view.value?.quete ?? null);
/** The chapter as the site counter knows it: a career's carries its hero's name. */
const countedChapter = computed(() => (campaign.value && chapter.value ? idCompteur(campaign.value.carriere ? campaign.value.heroId : null, chapter.value.id) : ''));
/** The election night comes once the game screens are done: after the combat, and after the elimination. */
const resultShown = computed(() => Boolean(bilan.value && (!store.value || store.value.screen.value === 'end')));

/** A chapter played to the end counts as a game; won, it counts as the chapter too. */
watch(bilan, (result) => {
  if (!result || !store.value || !chapter.value) return;
  const ranking = store.value.ranking.value;
  if (ranking) {
    achievements.recordGame(ranking, store.value.view.value, result.reussi ? { chapitre: chapter.value.id } : {});
    counter.gameEnded({ mode: 'carriere', chapitre: countedChapter.value }, ranking, store.value.view.value, result.reussi);
  }
  clearLocalGame();
});

/** The cutscene playing over everything, and what comes after it. Each one plays once in a campaign. */
const cutscene = shallowRef<Scene | null>(null);
let afterCutscene: (() => void) | null = null;
/** Whether the cutscene on screen belongs to the campaign (not one watched again in the cinematheque). */
let campaignScene = false;

function playCampaignScene(scene: Scene, then: () => void): void {
  afterCutscene = then;
  campaignScene = true;
  cutscene.value = scene;
}

function showCutscene(scene: Scene | null, then: () => void): void {
  const current = campaign.value;
  if (!scene || !current || current.vues?.includes(scene.id)) {
    then();
    return;
  }
  playCampaignScene(scene, then);
}

/**
 * Entering a career (a new one, or one taken up again) always opens on its scene, even one already seen: the chapter's
 * own, or the career's introduction when the chapter has none. Retries of the same election then play nothing again.
 */
let entrySceneDue = true;

function showEntryScene(heroId: string, chapterId: string, then: () => void): void {
  entrySceneDue = false;
  const scene = cinematiqueDe(heroId, 'avant_chapitre', chapterId) ?? cinematiqueDe(heroId, 'intro');
  if (!scene) {
    then();
    return;
  }
  playCampaignScene(scene, then);
}

/** A cutscene counts as seen once it is on screen: one that could not be built plays again next time. */
function markSeen(): void {
  const current = campaign.value;
  const scene = cutscene.value;
  if (!campaignScene || !current || !scene || current.vues?.includes(scene.id)) return;
  setCampaign({ ...current, vues: [...(current.vues ?? []), scene.id] });
}

/** The cinematheque (cinema cheat): its list, and a cutscene watched again, outside the campaign, not counted as seen. */
const shelf = useTemplateRef<InstanceType<typeof CinemaShelf>>('shelf');

function openCinema(): void {
  shelf.value?.open();
}

function watchAgain(scene: Scene): void {
  afterCutscene = null;
  campaignScene = false;
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
  // A new career's introduction is its entry scene.
  entrySceneDue = false;
  showCutscene(cinematiqueDe(heroId, 'intro'), () => undefined);
}

/** A chapter of a career opens with its scene: always on entering the career, otherwise the first time it is played. */
function play(): void {
  if (!campaign.value || !chapter.value) return;
  if (campaign.value.carriere && entrySceneDue) {
    showEntryScene(campaign.value.heroId, chapter.value.id, startChapter);
    return;
  }
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
  counter.gameStarted({ mode: 'carriere', chapitre: countedChapter.value });
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
  <CutscenePlayer v-if="cutscene" :key="cutscene.id" :cinematique="cutscene" @ready="markSeen" @end="endCutscene" />
  <CinemaShelf v-if="cinemaCheat.enabled.value" ref="shelf" @play="watchAgain" />
  <StoryHeroScreen v-if="!campaign" :cinema="cinemaCheat.enabled.value" @choose="chooseHero" @cinema="openCinema" @leave="leave" />
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
      <template #recruit-line><StoryFeed v-if="currentLine" :line="currentLine" :hero-id="campaign.heroId" :boss-id="run.bossId" /></template>
      <template #recruit-quest><StoryQuest v-if="quest" :quest="quest" /></template>
    </GameScreens>
  </template>
  <StoryChapterScreen v-else-if="chapter" :chapter="chapter" :campaign="campaign" :cinema="cinemaCheat.enabled.value" @play="play" @abandon="abandon" @cinema="openCinema" @leave="leave" />
  <StoryEndScreen v-else :campaign="campaign" @restart="abandon" @leave="leave" />
</template>
