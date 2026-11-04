<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import LeaveGameButton from '#src/client/components/atoms/LeaveGameButton.vue';
import AchievementBanner from '#src/client/components/molecules/AchievementBanner.vue';
import CombatScreen from '#src/client/screens/CombatScreen.vue';
import ChatPanel from '#src/client/components/organisms/ChatPanel.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import EliminatedScreen from '#src/client/screens/EliminatedScreen.vue';
import EndScreen from '#src/client/screens/EndScreen.vue';
import HeroScreen from '#src/client/screens/HeroScreen.vue';
import QueueScreen from '#src/client/screens/QueueScreen.vue';
import RecruitScreen from '#src/client/screens/RecruitScreen.vue';
import WaitingRoomScreen from '#src/client/screens/WaitingRoomScreen.vue';
import type { GameStore } from '#src/client/stores/createGameStore.ts';
import type { Succes } from '#src/data/succes.ts';

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
  <CombatScreen
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
  <HeroScreen v-else-if="store.screen.value === 'hero' && store.view.value" :view="store.view.value" :deadline="store.deadline.value" @choose="(i) => store.act({ t: 'hero', i })" />
  <RecruitScreen v-else-if="store.screen.value === 'recruit' && store.view.value" :view="store.view.value" :store="store" :power-note="powerNote">
    <template #side-top><slot name="recruit-side" /></template>
  </RecruitScreen>
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
  <div v-if="inGame" class="corner">
    <LeaveGameButton class="leave" @leave="$emit('leave')" />
  </div>
  <div v-if="showChat" class="corner chat-layer">
    <ChatPanel floating :messages="store.chat.value" :seat="seat" @send="(text) => store.sendChat(text)" />
  </div>
  <p v-if="store.connection.value === 'reconnecting'" class="reconnecting" role="status">Connexion perdue : reconnexion en cours…</p>
  <p v-if="store.notice.value" class="notice" role="status">{{ store.notice.value }}</p>
</template>

<style scoped>
.loading { margin-top: 40dvh; color: #ffe27a; font: 400 2.2rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; animation: loading 1.2s ease-in-out infinite; }
.slow { color: #c9cfdc; font-size: 1.2rem; }
@keyframes loading { 50% { opacity: 0.5; } }
/* The table's own frame, over every game screen: the door sits under the sound, in the top right corner. */
.corner { position: fixed; z-index: 60; left: 50%; top: 50%; width: calc(var(--s) * 1920); height: calc(var(--s) * 1080); translate: -50% -50%; pointer-events: none; }
.chat-layer { z-index: 61; }
.leave { position: absolute; right: calc(var(--s) * 26); top: calc(var(--s) * 100); --leave-size: calc(var(--s) * 64); }
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
