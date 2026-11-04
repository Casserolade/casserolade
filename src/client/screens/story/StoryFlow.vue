<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import StoryFeed from '#src/client/components/organisms/StoryFeed.vue';
import GameScreens from '#src/client/screens/GameScreens.vue';
import StoryChapterScreen from '#src/client/screens/story/StoryChapterScreen.vue';
import StoryEndScreen from '#src/client/screens/story/StoryEndScreen.vue';
import StoryHeroScreen from '#src/client/screens/story/StoryHeroScreen.vue';
import StoryResultScreen from '#src/client/screens/story/StoryResultScreen.vue';
import { loadCampaign, saveCampaign } from '#src/client/services/campaignStorage.ts';
import { clearLocalGame, markLocalGame } from '#src/client/services/interruptedGame.ts';
import { achievements } from '#src/client/stores/achievements.ts';
import { createGameStore } from '#src/client/stores/createGameStore.ts';
import type { GameStore } from '#src/client/stores/createGameStore.ts';
import { StoryRun } from '#src/client/stores/createStoryRun.ts';
import { apresChapitre, chapitreCourant, nouvelleCampagne } from '#src/histoire/campagne.ts';
import type { Campagne } from '#src/histoire/campagne.ts';
import { generateSeed } from '#src/server/generateSeed.ts';

const emit = defineEmits<{ leave: [] }>();

const campaign = ref<Campagne | null>(loadCampaign());
const run = shallowRef<StoryRun | null>(null);
const store = shallowRef<GameStore | null>(null);
const chapter = computed(() => (campaign.value ? chapitreCourant(campaign.value) : null));
const currentLine = computed(() => run.value?.currentLine.value ?? null);
const bilan = computed(() => run.value?.bilan.value ?? null);
/** The election night comes once the game screens are done: after the combat, and after the elimination. */
const resultShown = computed(() => Boolean(bilan.value && (!store.value || store.value.screen.value === 'end')));

/** A chapter played to the end counts as a game; won, it counts as the chapter too. */
watch(bilan, (result) => {
  if (!result || !store.value || !chapter.value) return;
  const ranking = store.value.ranking.value;
  if (ranking) achievements.recordGame(ranking, store.value.view.value, result.reussi ? { chapitre: chapter.value.id } : {});
  clearLocalGame();
});

function setCampaign(next: Campagne | null): void {
  campaign.value = next;
  saveCampaign(next);
}

function chooseHero(heroId: string): void {
  setCampaign(nouvelleCampagne(heroId, generateSeed()));
}

function play(): void {
  if (!campaign.value || !chapter.value) return;
  stopRun();
  achievements.startGame();
  run.value = new StoryRun(chapter.value, campaign.value.heroId, campaign.value.bossId, achievements.heroChoices.value);
  store.value = createGameStore(run.value);
  markLocalGame({ kind: 'carriere' });
}

function stopRun(): void {
  store.value?.leave();
  store.value = null;
  run.value = null;
  clearLocalGame();
}

function finishChapter(): void {
  if (!campaign.value || !chapter.value || !bilan.value) return;
  setCampaign(apresChapitre(campaign.value, chapter.value, bilan.value));
  stopRun();
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
      <template #recruit-side><StoryFeed v-if="currentLine" :line="currentLine" :hero-id="campaign.heroId" :boss-id="run.bossId" /></template>
    </GameScreens>
  </template>
  <StoryChapterScreen v-else-if="chapter" :chapter="chapter" :campaign="campaign" @play="play" @abandon="abandon" @leave="leave" />
  <StoryEndScreen v-else :campaign="campaign" @restart="abandon" @leave="leave" />
</template>
