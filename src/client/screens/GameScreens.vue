<script setup lang="ts">
import { computed, inject, onUnmounted, ref, watch } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import AchievementBanner from '#src/client/components/molecules/AchievementBanner.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import EliminatedScreen from '#src/client/screens/EliminatedScreen.vue';
import EndScreen from '#src/client/screens/EndScreen.vue';
import QueueScreen from '#src/client/screens/QueueScreen.vue';
import WaitingRoomScreen from '#src/client/screens/WaitingRoomScreen.vue';
import { SCREEN_SET } from '#src/client/const/screenSet.ts';
import type { ScreenSet } from '#src/client/const/screenSet.ts';
import type { GameStore } from '#src/client/stores/createGameStore.ts';
import type { Succes } from '#src/data/succes.ts';

/** The computer's screens or the phone's, provided by the page's entry. */
const screens = inject(SCREEN_SET) as ScreenSet;

/** The table is slow to come: past this, the loading screen offers a way home. */
const SLOW_LOADING_MS = 10_000;

const props = withDefaults(defineProps<{
  store: GameStore;
  powerNote?: string | null;
  /** Achievements unlocked by this game, for its end screen. */
  unlocked?: Succes[];
  /** A game in this page: « Rejouer » starts another one (`again`). Rooms restart through the server. */
  canRestart?: boolean;
}>(), { powerNote: null, unlocked: () => [], canRestart: false });
/** `queue`: into the public queue, from its own screen or after a public game. `again`: another local game. */
const emit = defineEmits<{ leave: []; queue: []; again: [] }>();

const room = computed(() => props.store.room.value);
const isPublic = computed(() => Boolean(room.value?.publique));
const isHost = computed(() => room.value !== null && room.value.siege === room.value.hote);
const seat = computed(() => room.value?.siege ?? props.store.view.value?.seat ?? 0);
const canReplay = computed(() => (room.value ? isHost.value && !isPublic.value : props.canRestart));
const replayHint = computed(() => (room.value && !isHost.value && !isPublic.value ? 'L\'hôte peut relancer une partie.' : null));
/** Playing: the door to leave is in the corner. Out of the game, the screens have their own way back. */
const inGame = computed(() => ['hero', 'recruit', 'combat'].includes(props.store.screen.value));
const combatView = computed(() => props.store.combatView.value ?? props.store.view.value);
/** The chat follows the table through the game, and stays for the « gg » at the end. Never in solo. */
const showChat = computed(() => props.store.canChat.value && ['hero', 'recruit', 'combat', 'eliminated', 'end'].includes(props.store.screen.value));

const slowLoading = ref(false);
let loadingTimer = 0;
watch(() => props.store.screen.value === 'loading', (loading) => {
  window.clearTimeout(loadingTimer);
  slowLoading.value = false;
  if (loading) loadingTimer = window.setTimeout(() => (slowLoading.value = true), SLOW_LOADING_MS);
}, { immediate: true });
onUnmounted(() => window.clearTimeout(loadingTimer));

function again(): void {
  if (room.value) props.store.launchRoom();
  else emit('again');
}
</script>

<template>
  <component
    :is="screens.combat"
    v-if="store.screen.value === 'combat' && store.combat.value"
    :key="store.combat.value.round"
    :combat="store.combat.value"
    :view="combatView"
    :line="combatView?.animateur.repliques.coup ?? null"
    @close="store.closeCombat()"
  />
  <EndScreen
    v-else-if="store.screen.value === 'end' && store.ranking.value"
    :ranking="store.ranking.value"
    :seat="seat"
    :can-replay="canReplay"
    :replay-hint="replayHint"
    :public-game="isPublic"
    :mmr="store.mmrChange.value"
    @again="again"
    @queue="$emit('queue')"
    @leave="$emit('leave')"
  >
    <AchievementBanner :unlocked="unlocked" />
  </EndScreen>
  <QueueScreen
    v-else-if="store.screen.value === 'queue'"
    :queue="store.queue.value"
    :seen-at="store.queueSeenAt.value"
    :lost="store.queueLost.value"
    :reason="store.queueLostReason.value"
    @vote="(yes) => store.voteQueue(yes)"
    @retry="$emit('queue')"
    @leave="$emit('leave')"
  />
  <WaitingRoomScreen
    v-else-if="store.screen.value === 'waiting' && room"
    :room="room"
    :messages="store.chat.value"
    @chat="(text) => store.sendChat(text)"
    @launch="store.launchRoom()"
    @leave="$emit('leave')"
    @settings="(options) => store.updateRoomSettings(options)"
  />
  <component :is="screens.hero" v-else-if="store.screen.value === 'hero' && store.view.value" :view="store.view.value" :deadline="store.deadline.value" @choose="(i: number) => store.act({ t: 'hero', i })" />
  <component :is="screens.recruit" v-else-if="store.screen.value === 'recruit' && store.view.value" :view="store.view.value" :store="store" :power-note="powerNote">
    <template #side-top><slot name="recruit-side" /></template>
  </component>
  <EliminatedScreen
    v-else-if="store.screen.value === 'eliminated' && store.view.value"
    :view="store.view.value"
    :ranking-ready="store.ranking.value !== null"
    @ranking="store.showRanking()"
    @leave="$emit('leave')"
  />
  <MenuBackdrop v-else>
    <p class="loading" role="status">Mise en place du plateau…</p>
    <template v-if="slowLoading">
      <p class="slow">Le plateau tarde à venir.</p>
      <AppButton @click="$emit('leave')">Retour à l'accueil</AppButton>
    </template>
  </MenuBackdrop>
  <component :is="screens.frame" :in-game="inGame" :show-chat="showChat" :messages="store.chat.value" :seat="seat" @leave="$emit('leave')" @send="(text: string) => store.sendChat(text)" />
  <p v-if="store.connection.value === 'reconnecting'" class="reconnecting game-reconnecting" role="status">Connexion perdue : reconnexion en cours…</p>
  <p v-if="store.notice.value" class="notice game-notice" role="status">{{ store.notice.value }}</p>
</template>

<style scoped>
.loading { margin-top: 40dvh; color: #ffe27a; font: 400 2.2rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; animation: loading 1.2s ease-in-out infinite; }
.slow { color: #c9cfdc; font-size: 1.2rem; }
@keyframes loading { 50% { opacity: 0.5; } }
.reconnecting {
  position: fixed;
  z-index: 75;
  left: 50%;
  top: calc(var(--s) * 20);
  translate: -50% 0;
  padding: calc(var(--s) * 10) calc(var(--s) * 26);
  border-radius: calc(var(--s) * 30);
  border: calc(var(--s) * 4) solid #111;
  background: #ffe27a;
  color: var(--color-ink);
  font: 700 calc(var(--s) * 26) / 1.2 var(--font-card);
  box-shadow: calc(var(--s) * 5) calc(var(--s) * 6) 0 rgb(0 0 0 / 0.35);
  pointer-events: none;
  animation: reconnecting 1.2s ease-in-out infinite;
}
@keyframes reconnecting { 50% { opacity: 0.75; } }
.notice {
  position: fixed;
  z-index: 70;
  left: 50%;
  bottom: calc(var(--s) * 300);
  translate: -50% 0;
  max-width: calc(var(--s) * 900);
  padding: calc(var(--s) * 10) calc(var(--s) * 26);
  border-radius: calc(var(--s) * 30);
  border: calc(var(--s) * 4) solid #111;
  background: #fff3f0;
  color: #9a1020;
  font: 700 calc(var(--s) * 26) / 1.2 var(--font-card);
  text-align: center;
  box-shadow: calc(var(--s) * 5) calc(var(--s) * 6) 0 rgb(0 0 0 / 0.35);
  pointer-events: none;
  animation: notice-in 0.25s cubic-bezier(0.3, 1.6, 0.5, 1);
}
@keyframes notice-in { from { transform: scale(0.4); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .reconnecting { animation: none; } }
</style>

<style>
/*
 * The phone version (html.mobile, /m/): the notices at a reading size, under the bar, instead of in pixels of the
 * computer's table. Not scoped: Vue's :global() keeps only `html.mobile` of such a selector.
 */
html.mobile .game-notice { top: calc(env(safe-area-inset-top) + 100px); bottom: auto; max-width: calc(100vw - 24px); padding: 8px 16px; border-width: 3px; border-radius: 18px; font-size: 1rem; box-shadow: 4px 5px 0 rgb(0 0 0 / 0.35); }
html.mobile .game-reconnecting { top: calc(env(safe-area-inset-top) + 8px); padding: 6px 14px; border-width: 3px; border-radius: 18px; font-size: 0.95rem; box-shadow: 4px 5px 0 rgb(0 0 0 / 0.35); }
</style>
