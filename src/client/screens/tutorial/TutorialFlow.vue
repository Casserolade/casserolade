<script setup lang="ts">
import { onUnmounted, shallowRef, watch } from 'vue';
import TutorialGuide from '#src/client/components/organisms/TutorialGuide.vue';
import GameScreens from '#src/client/screens/GameScreens.vue';
import TutorialEndScreen from '#src/client/screens/tutorial/TutorialEndScreen.vue';
import { counter } from '#src/client/services/counter.ts';
import { clearLocalGame, markLocalGame } from '#src/client/services/interruptedGame.ts';
import { achievements } from '#src/client/stores/achievements.ts';
import { createGameStore } from '#src/client/stores/createGameStore.ts';
import { TutorialRun } from '#src/client/stores/createTutorialRun.ts';

const emit = defineEmits<{ leave: []; career: [] }>();

const run = shallowRef(new TutorialRun());
const store = shallowRef(createGameStore(run.value));
let stopped = false;
achievements.startGame();
markLocalGame({ kind: 'tutoriel' });
counter.gameStarted({ mode: 'tutoriel' });

// Opened once, even left half way: the home page stops pushing it, its big shining button gives way to a plain one.
achievements.record({ tutoriel: true });
/** The tutorial's own game is a training: it counts neither as a game nor for an achievement. */
watch(() => store.value.ranking.value, (ranking) => {
  if (!ranking) return;
  counter.gameEnded({ mode: 'tutoriel' }, ranking, store.value.view.value, run.value.learned.value);
  clearLocalGame();
});

function restart(): void {
  stop();
  run.value = new TutorialRun();
  store.value = createGameStore(run.value);
  stopped = false;
  achievements.startGame();
  markLocalGame({ kind: 'tutoriel' });
  counter.gameStarted({ mode: 'tutoriel' });
}

function stop(): void {
  if (stopped) return;
  stopped = true;
  store.value.leave();
  clearLocalGame();
}

function toCareer(): void {
  stop();
  emit('career');
}

function leave(): void {
  stop();
  emit('leave');
}

onUnmounted(stop);
</script>

<template>
  <TutorialEndScreen
    v-if="store.screen.value === 'end'"
    :place="run.place.value"
    :learned="run.learned.value"
    :unlocked="achievements.fresh.value"
    @career="toCareer"
    @again="restart"
    @leave="leave"
  />
  <template v-else>
    <GameScreens :store="store" @leave="leave" />
    <TutorialGuide v-if="store.screen.value === 'recruit'" :step="run.step.value" :learned="run.learned.value" :players="store.view.value?.table.length ?? 4" :nudge="store.refusals.value" @career="toCareer" />
  </template>
</template>
