<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import AchievementsScreen from '#src/client/screens/AchievementsScreen.vue';
import FailureScreen from '#src/client/screens/FailureScreen.vue';
import GameScreens from '#src/client/screens/GameScreens.vue';
import HomeScreen from '#src/client/screens/HomeScreen.vue';
import StoryFlow from '#src/client/screens/story/StoryFlow.vue';
import TutorialFlow from '#src/client/screens/tutorial/TutorialFlow.vue';
import { createLocalTransport } from '#src/client/services/createLocalTransport.ts';
import { createWebSocketTransport } from '#src/client/services/createWebSocketTransport.ts';
import { clearLocalGame, interruptedNotice, markLocalGame, takeInterruptedGame } from '#src/client/services/interruptedGame.ts';
import type { LocalGameMark } from '#src/client/services/interruptedGame.ts';
import { playerId, savedPseudo } from '#src/client/services/localProfile.ts';
import { hasSavedSeat } from '#src/client/services/savedSeat.ts';
import { achievements } from '#src/client/stores/achievements.ts';
import { createGameStore } from '#src/client/stores/createGameStore.ts';
import type { GameStore } from '#src/client/stores/createGameStore.ts';
import { pseudoOrDefault } from '#src/client/tools/pseudoOrDefault.ts';
import { readInviteCode } from '#src/client/tools/readInviteCode.ts';
import { SUCCES } from '#src/data/succes.ts';
import type { OptionsSalon } from '#src/protocol/messages.ts';

const PLAYER_NAME = 'Vous';
const HUMAN_SEAT = 0;
const DEFAULT_ROOM_OPTIONS: OptionsSalon = { bots: 0, niveauBots: 'moyen', minuteur: true };
const ROOM_GONE_MESSAGE = 'Votre ancienne partie n\'existe plus.';

/** Away from the home screen without a game store: the career, the tutorial, the achievements board. */
type Elsewhere = 'story' | 'tutorial' | 'achievements';
type SoloSettings = { botLevel: BotLevel };

const params = new URLSearchParams(window.location.search);
const seedParam = params.get('seed');
const inviteCode = readInviteCode(window.location.search);

const store = shallowRef<GameStore | null>(hasSavedSeat() ? createGameStore(createWebSocketTransport()) : null);
/** A game in this page, against bots: it counts for the achievements. Online tables do not. */
const isLocal = ref(false);
const elsewhere = ref<Elsewhere | null>(null);
const homeError = ref<string | null>(null);
/** A local game the last reload cut short: the home screen says so, and offers to start it again. */
const interrupted = ref<LocalGameMark | null>(takeInterruptedGame());
let lastSolo: SoloSettings | null = null;

const achievementCount = computed(() => `${achievements.progress.value.obtenus.length}/${SUCCES.length}`);
/** No game finished and no tutorial yet: the home screen offers the tutorial first. */
const newcomer = computed(() => achievements.progress.value.parties === 0 && achievements.progress.value.obtenus.length === 0);
const resumeNotice = computed(() => (interrupted.value ? interruptedNotice(interrupted.value) : null));
/** Online, holding a seat (a room or a game): leaving it is a choice the failure screen names. */
const holdsSeat = computed(() => Boolean(store.value?.room.value || store.value?.view.value));

watch(() => store.value?.ranking.value, (ranking) => {
  if (!ranking || !store.value || !isLocal.value) return;
  achievements.recordGame(ranking, store.value.view.value);
  clearLocalGame();
});

/** A refused request (unknown code, full room…) or a game that is gone: back home, with what the server said. */
watch(() => store.value?.refused.value ?? (store.value?.roomGone.value ? ROOM_GONE_MESSAGE : null), (message) => {
  if (message) backHomeWithError(message);
});

function startSolo(settings: SoloSettings): void {
  const seed = seedParam ? Number(seedParam) : undefined;
  achievements.startGame();
  isLocal.value = true;
  interrupted.value = null;
  lastSolo = settings;
  markLocalGame({ kind: 'solo', botLevel: settings.botLevel });
  store.value?.leave();
  store.value = createGameStore(createLocalTransport({
    pseudo: PLAYER_NAME,
    ...settings,
    seed,
    // An achievement can add a hero to choose from: in this page only.
    game: { heroChoices: { [HUMAN_SEAT]: achievements.heroChoices.value } },
  }));
}

/** « Rejouer » at the end of a solo game: the same bots, a new game. */
function replaySolo(): void {
  if (lastSolo) startSolo(lastSolo);
}

/** The home screen offers to start again the local game a reload cut short. */
function resume(): void {
  const mark = interrupted.value;
  interrupted.value = null;
  if (!mark) return;
  if (mark.kind === 'solo') startSolo({ botLevel: mark.botLevel ?? 'facile' });
  else elsewhere.value = mark.kind === 'carriere' ? 'story' : 'tutorial';
}

function openOnlineStore(): GameStore {
  homeError.value = null;
  interrupted.value = null;
  isLocal.value = false;
  const online = createGameStore(createWebSocketTransport());
  store.value = online;
  return online;
}

function createRoom(pseudo: string): void {
  openOnlineStore().createRoom(pseudoOrDefault(pseudo), DEFAULT_ROOM_OPTIONS);
}

function joinRoom(code: string, pseudo: string): void {
  openOnlineStore().joinRoom(code, pseudoOrDefault(pseudo));
}

function joinQueue(pseudo: string): void {
  openOnlineStore().joinQueue(pseudoOrDefault(pseudo), playerId());
}

/** Back into the queue after a public game, or after the queue let us go: same connection. */
function rejoinQueue(): void {
  if (store.value) store.value.joinQueue(pseudoOrDefault(savedPseudo()), playerId());
}

function leaveGame(): void {
  store.value?.leave();
  store.value = null;
  isLocal.value = false;
  clearLocalGame();
}

function backHomeWithError(message: string): void {
  leaveGame();
  homeError.value = message;
}
</script>

<template>
  <StoryFlow v-if="elsewhere === 'story'" @leave="elsewhere = null" />
  <TutorialFlow v-else-if="elsewhere === 'tutorial'" @leave="elsewhere = null" @career="elsewhere = 'story'" />
  <AchievementsScreen v-else-if="elsewhere === 'achievements'" @leave="elsewhere = null" />
  <HomeScreen
    v-else-if="!store"
    :invite-code="inviteCode"
    :error="homeError"
    :resume="resumeNotice"
    :title="achievements.title.value"
    :achievements="achievementCount"
    :newcomer="newcomer"
    @solo="startSolo"
    @create="createRoom"
    @join="joinRoom"
    @public="joinQueue"
    @resume="resume"
    @story="elsewhere = 'story'; interrupted = null"
    @tutorial="elsewhere = 'tutorial'; interrupted = null"
    @achievements="elsewhere = 'achievements'"
  />
  <FailureScreen v-else-if="store.connectionLost.value" :holds-seat="holdsSeat" @retry="store.retry()" @leave="leaveGame" />
  <GameScreens
    v-else
    :store="store"
    :unlocked="isLocal ? achievements.fresh.value : []"
    :can-restart="isLocal"
    @leave="leaveGame"
    @again="replaySolo"
    @queue="rejoinQueue"
  />
</template>
