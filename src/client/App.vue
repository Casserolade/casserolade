<script setup lang="ts">
import { computed, inject, ref, shallowRef, watch } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import AchievementsScreen from '#src/client/screens/AchievementsScreen.vue';
import FailureScreen from '#src/client/screens/FailureScreen.vue';
import GameScreens from '#src/client/screens/GameScreens.vue';
import StoryFlow from '#src/client/screens/story/StoryFlow.vue';
import TutorialFlow from '#src/client/screens/tutorial/TutorialFlow.vue';
import { SCREEN_SET } from '#src/client/const/screenSet.ts';
import type { ScreenSet } from '#src/client/const/screenSet.ts';
import { AWAY_FROM_HOME } from '#src/client/const/awayFromHome.ts';
import { createLocalTransport } from '#src/client/services/createLocalTransport.ts';
import { forgetCounted, markCounted, wasCounted } from '#src/client/services/countedGame.ts';
import { counter } from '#src/client/services/counter.ts';
import { createWebSocketTransport } from '#src/client/services/createWebSocketTransport.ts';
import { clearLocalGame, interruptedNotice, markLocalGame, takeInterruptedGame } from '#src/client/services/interruptedGame.ts';
import type { LocalGameMark } from '#src/client/services/interruptedGame.ts';
import { playerId, savedPseudo } from '#src/client/services/localProfile.ts';
import { saveRating, savedRating } from '#src/client/services/localRating.ts';
import { hasSavedSeat } from '#src/client/services/savedSeat.ts';
import { achievements } from '#src/client/stores/achievements.ts';
import { cinemaCheat } from '#src/client/stores/cinemaCheat.ts';
import CheatNotice from '#src/client/components/molecules/CheatNotice.vue';
import { createGameStore } from '#src/client/stores/createGameStore.ts';
import type { GameStore } from '#src/client/stores/createGameStore.ts';
import { achievementLevel } from '#src/client/tools/achievementLevel.ts';
import { ownRoomRating } from '#src/client/tools/ownRoomRating.ts';
import { pseudoOrDefault } from '#src/client/tools/pseudoOrDefault.ts';
import { readInviteCode } from '#src/client/tools/readInviteCode.ts';
import { SUCCES } from '#src/data/succes.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { OptionsSalon } from '#src/protocol/messages.ts';
import { RANDOM_CONTEXT } from '#src/data/heroes.ts';

const PLAYER_NAME = 'Vous';
const HUMAN_SEAT = 0;
const DEFAULT_ROOM_OPTIONS: OptionsSalon = { bots: 0, niveauBots: 'moyen', minuteur: true, contexte: RANDOM_CONTEXT };
const ROOM_GONE_MESSAGE = 'Votre ancienne partie n\'existe plus.';

/** Away from the home screen without a game store: the career, the tutorial, the achievements board. */
type Elsewhere = 'story' | 'tutorial' | 'achievements';
type SoloSettings = { botLevel: BotLevel; contexte: string };

/** The computer's screens or the phone's: provided by the page's entry (desktop.ts, mobile.ts). */
const screens = inject(SCREEN_SET) as ScreenSet;

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
/** No game finished and the tutorial never opened: the home screen offers the tutorial first, its button shining. */
const newcomer = computed(() => achievements.progress.value.parties === 0 && !achievements.progress.value.tutoriel);
const resumeNotice = computed(() => (interrupted.value ? interruptedNotice(interrupted.value) : null));
/** Online, holding a seat (a room or a game): leaving it is a choice the failure screen names. */
const holdsSeat = computed(() => Boolean(store.value?.room.value || store.value?.view.value));

/** Each view feeds the achievements: the polls lost on the way and the biggest politician are read from them. */
watch(() => store.value?.view.value, (view) => achievements.observe(view ?? null));

/** A quick game counts for the achievements at its ranking, with the level of its bots. */
watch(() => store.value?.ranking.value, (ranking) => {
  if (!ranking || !store.value || !isLocal.value) return;
  const place = ranking.find((row) => row.seat === HUMAN_SEAT)?.place;
  if (place !== undefined) achievements.recordGame(store.value.view.value, { place, seats: ranking.length, niveau: achievementLevel(lastSolo?.botLevel) });
  if (lastSolo) counter.gameEnded({ mode: 'solo', niveau: lastSolo.botLevel }, ranking, store.value.view.value);
  clearLocalGame();
});

/**
 * An online game counts once the player's place is known: eliminated, or at the end. Once only: the server tells the
 * result again to whoever reloads the page.
 */
function recordOnlineGame(view: PlayerView): void {
  const room = store.value?.room.value;
  if (!room) return;
  const game = `${room.code}:${view.heroId}:${view.place}:${view.round}`;
  if (wasCounted(game)) return;
  markCounted(game);
  achievements.recordGame(view, {
    place: view.place,
    seats: view.table.length,
    humans: room.joueurs.filter((player) => !player.bot).length,
    publicHost: room.estHote && room.options.nomPublic !== undefined,
  });
}
watch(() => (isLocal.value ? null : store.value?.view.value), (view) => {
  if (view && view.place > 0) recordOnlineGame(view);
});
/** A room's game starts: what the last one unlocked leaves the end screen, and the next one will count. */
watch(() => (isLocal.value ? null : store.value?.room.value?.etat), (state, before) => {
  if (state !== 'en_jeu' || before === 'en_jeu') return;
  achievements.startGame();
  forgetCounted();
});

/**
 * The player's rating in the rooms, as the server last showed it on its seat: the home page says the rank it gives.
 * Null before a first game against another human.
 */
const rating = ref(savedRating());
watch(() => ownRoomRating(store.value?.room.value ?? null), (value) => {
  if (value === null) return;
  rating.value = value;
  saveRating(value);
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
  markLocalGame({ kind: 'solo', botLevel: settings.botLevel, contexte: settings.contexte });
  counter.gameStarted({ mode: 'solo', niveau: settings.botLevel });
  store.value?.leave();
  store.value = createGameStore(createLocalTransport({
    pseudo: PLAYER_NAME,
    botLevel: settings.botLevel,
    seed,
    game: { contextId: settings.contexte },
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
  if (mark.kind === 'solo') startSolo({ botLevel: mark.botLevel ?? 'facile', contexte: mark.contexte ?? RANDOM_CONTEXT });
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

/** A private room, among friends: by its link or its code only. */
function createRoom(pseudo: string): void {
  openOnlineStore().createRoom(pseudoOrDefault(pseudo), DEFAULT_ROOM_OPTIONS, playerId());
}

/** A public room: the home pages list it under this name, and anyone walks in. */
function openPublicRoom(name: string, pseudo: string): void {
  openOnlineStore().createRoom(pseudoOrDefault(pseudo), { ...DEFAULT_ROOM_OPTIONS, nomPublic: name }, playerId());
}

function joinRoom(code: string, pseudo: string): void {
  openOnlineStore().joinRoom(code, pseudoOrDefault(pseudo), playerId());
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

/** On a phone, away from the home screen: the back gesture stays in the game, and the game takes the whole screen. */
const awayHooks = inject(AWAY_FROM_HOME, null);
const awayFromHome = computed(() => Boolean(store.value) || elsewhere.value !== null);
watch(awayFromHome, (away) => (away ? awayHooks?.leaveHome() : awayHooks?.backHome()), { immediate: true });

/** The cinema cheat listens from the start, on every screen: it is typed anywhere. */
cinemaCheat.listen();

function backHomeWithError(message: string): void {
  leaveGame();
  homeError.value = message;
}
</script>

<template>
  <StoryFlow v-if="elsewhere === 'story'" @leave="elsewhere = null" />
  <TutorialFlow v-else-if="elsewhere === 'tutorial'" @leave="elsewhere = null" @career="elsewhere = 'story'" />
  <AchievementsScreen v-else-if="elsewhere === 'achievements'" :rating="rating" @leave="elsewhere = null" />
  <component
    :is="screens.home"
    v-else-if="!store"
    :invite-code="inviteCode"
    :error="homeError"
    :resume="resumeNotice"
    :title="achievements.title.value"
    :achievements="achievementCount"
    :newcomer="newcomer"
    :rating="rating"
    @solo="startSolo"
    @open="openPublicRoom"
    @create="createRoom"
    @join="joinRoom"
    @queue="joinQueue"
    @resume="resume"
    @story="elsewhere = 'story'; interrupted = null"
    @tutorial="elsewhere = 'tutorial'; interrupted = null"
    @achievements="elsewhere = 'achievements'"
  />
  <FailureScreen v-else-if="store.connectionLost.value" :holds-seat="holdsSeat" @retry="store.retry()" @leave="leaveGame" />
  <GameScreens
    v-else
    :store="store"
    :unlocked="achievements.fresh.value"
    :can-restart="isLocal"
    @leave="leaveGame"
    @again="replaySolo"
    @queue="rejoinQueue"
  />
  <CheatNotice v-if="cinemaCheat.justToggled.value" :text="cinemaCheat.enabled.value ? 'Cinémathèque ouverte, dans le mode carrière' : 'Cinémathèque refermée'" />
</template>
