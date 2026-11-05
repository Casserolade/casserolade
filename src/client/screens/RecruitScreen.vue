<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import BudgetMeter from '#src/client/components/atoms/BudgetMeter.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import ReadyButton from '#src/client/components/atoms/ReadyButton.vue';
import RecruitRope from '#src/client/components/atoms/RecruitRope.vue';
import CampChips from '#src/client/components/molecules/CampChips.vue';
import ContextBadge from '#src/client/components/molecules/ContextBadge.vue';
import DropLine from '#src/client/components/molecules/DropLine.vue';
import EndOfTurnBanner from '#src/client/components/molecules/EndOfTurnBanner.vue';
import HeroCorner from '#src/client/components/molecules/HeroCorner.vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import BoardRow from '#src/client/components/organisms/BoardRow.vue';
import CarriedItem from '#src/client/components/organisms/CarriedItem.vue';
import CardInspector from '#src/client/components/organisms/CardInspector.vue';
import DiscoverOverlay from '#src/client/components/organisms/DiscoverOverlay.vue';
import FxLayer from '#src/client/components/organisms/FxLayer.vue';
import GameTable from '#src/client/components/organisms/GameTable.vue';
import HandFan from '#src/client/components/organisms/HandFan.vue';
import HostDesk from '#src/client/components/organisms/HostDesk.vue';
import ScoreBoard from '#src/client/components/organisms/ScoreBoard.vue';
import ShopRow from '#src/client/components/organisms/ShopRow.vue';
import TargetArrow from '#src/client/components/organisms/TargetArrow.vue';
import { preloadCombat } from '#src/client/pixi/preloadCombat.ts';
import { playSound } from '#src/client/services/soundEffects.ts';
import { cardInspector } from '#src/client/stores/cardInspector.ts';
import type { GameStore } from '#src/client/stores/createGameStore.ts';
import { useCountdown } from '#src/client/stores/useCountdown.ts';
import { useTableGestures } from '#src/client/stores/useTableGestures.ts';
import { dropGuideFor } from '#src/client/tools/dropGuideFor.ts';
import { minionFace } from '#src/client/tools/shownCard.ts';
import type { PlayerView } from '#src/engine/game.ts';

const TRIPLE_MS = 1700;

const props = withDefaults(defineProps<{ view: PlayerView; store: GameStore; powerNote?: string | null }>(), { powerNote: null });

const secondsLeft = useCountdown(props.store.deadline);
const gestures = useTableGestures({ view: () => props.view, act: (action) => props.store.act(action) });
const owned = computed(() => [...props.view.board, ...props.view.hand]);
/** While something is carried: the counter line says what a drop across it does. */
const dropGuide = computed(() => dropGuideFor(gestures.dragging.value, props.view));
const aimHint = computed(() => {
  const aim = gestures.targeting.value;
  if (!aim) return null;
  return aim.kind === 'cast' ? 'Sur qui ?' : 'Quel allié ?';
});

// What changed may be the card under the pointer: it comes up again on the next hover, up to date.
watch(() => props.view, () => cardInspector.hide());

/** The combat's stage loads its pictures while the player recruits: the combat opens on a full table. */
let preloadTimer = 0;
const PRELOAD_AFTER_MS = 1500;
onMounted(() => {
  preloadTimer = window.setTimeout(() => preloadCombat(), PRELOAD_AFTER_MS);
});
onUnmounted(() => window.clearTimeout(preloadTimer));

/**
 * A triple is the event of a round: a burst of gold over the hand, then it goes away by itself.
 * Only a real triple: a minion made golden by a spell or an Annonce, or found golden, is not one.
 */
const tripleCount = computed(() => props.view.stats.triples);
const triples = ref(0);
const showTriple = ref(false);
let tripleTimer = 0;
watch(tripleCount, (count, before) => {
  if (count <= before) return;
  triples.value++;
  showTriple.value = true;
  playSound('triple');
  window.clearTimeout(tripleTimer);
  tripleTimer = window.setTimeout(() => (showTriple.value = false), TRIPLE_MS);
});
</script>

<template>
  <GameTable :plateau-id="view.plateau.id" :class="{ aiming: gestures.targeting.value, 'ending-turn': store.endOfTurn.value }">
    <HostDesk :view="view" :line="store.hostLine.value" :line-count="store.hostLineCount.value" :act="store.act" />
    <ScoreBoard :table="view.table" :seat="view.seat" :seen="view.seen" />
    <ShopRow :view="view" :gestures="gestures" />
    <BoardRow :board="view.board" :owned="owned" :gestures="gestures" :scandal-threshold="view.scandalThreshold" :round="view.round" :end-of-turn="store.endOfTurn.value" />
    <EndOfTurnBanner v-if="store.endOfTurn.value?.banner.value" />

    <div class="hero-spot">
      <HeroCorner :hero-id="view.heroId" :hp="view.hp" :start-hp="view.params.startHp" :power-note="powerNote" />
    </div>
    <HandFan :view="view" :gestures="gestures" />

    <div class="right-rail">
      <ReadyButton :seconds-left="secondsLeft" :done="store.hasEndedRecruitment.value" @ready="store.endRecruitment()" />
      <slot name="side-top" />
      <CampChips class="camps" :camps="view.camps" vertical />
      <ContextBadge :context-id="view.contextId" compact />
    </div>
    <BudgetMeter class="budget" :budget="view.budget" :max="view.maxBudget" :later="view.nextBudget" />
    <RecruitRope :seconds-left="secondsLeft" />
    <DropLine v-if="dropGuide" :guide="dropGuide" />

    <p v-if="aimHint" class="aim-hint" aria-live="polite">{{ aimHint }}</p>
    <div v-if="showTriple" :key="triples" class="triple" aria-live="polite"><span class="rays" /><strong>Triple !</strong></div>

    <template #overlay>
      <TargetArrow :gestures="gestures" />
      <CarriedItem :gestures="gestures" :owner-multiplier="view.params.ownerMultiplier" :scandal-threshold="view.scandalThreshold" :round="view.round" />
      <FxLayer />
      <CardInspector />
      <DiscoverOverlay v-if="view.discover" :key="view.discover.join()" :choices="view.discover" :kind="view.discoverKind" @choose="(i) => store.act({ t: 'discover', i })" />
    </template>
  </GameTable>
</template>

<style scoped>
.hero-spot { position: absolute; left: calc(var(--s) * 52); bottom: calc(var(--s) * 22); }
.right-rail { position: absolute; right: calc(var(--s) * 40); top: calc(var(--s) * 300); width: calc(var(--s) * 220); display: flex; flex-direction: column; align-items: center; gap: calc(var(--s) * 30); }
.right-rail .camps { padding: calc(var(--s) * 12); border-radius: calc(var(--s) * 18); background: rgb(12 16 32 / 0.8); }
.budget { position: absolute; right: calc(var(--s) * 30); bottom: calc(var(--s) * 26); }
.aim-hint {
  position: absolute;
  left: 50%;
  top: calc(var(--s) * 742);
  translate: -50% 0;
  color: #ffe066;
  font: 400 calc(var(--s) * 44) / 1 var(--font-number);
  letter-spacing: calc(var(--s) * 1);
  -webkit-text-stroke: calc(var(--s) * 6) var(--color-ink);
  paint-order: stroke fill;
  pointer-events: none;
  animation: hint-bob 0.9s ease-in-out infinite;
}
.aiming :deep(.shop-zone), .aiming :deep(.hand-zone) { filter: brightness(0.55) saturate(0.6); transition: filter 0.2s; }
/* The end of turn plays on the board only: the shop and the hand step back, nothing there can be touched. */
.ending-turn :deep(.shop-zone), .ending-turn :deep(.hand-zone) { filter: brightness(0.4) saturate(0.4); pointer-events: none; transition: filter 0.3s; }
.triple { position: absolute; left: 50%; top: calc(var(--s) * 600); width: 0; height: 0; z-index: 30; pointer-events: none; }
.triple .rays {
  position: absolute;
  left: calc(var(--s) * -400);
  top: calc(var(--s) * -400);
  width: calc(var(--s) * 800);
  height: calc(var(--s) * 800);
  background: repeating-conic-gradient(from 0deg, rgb(255 215 60 / 0.75) 0 7deg, transparent 7deg 20deg);
  mask: radial-gradient(circle, #000 10%, transparent 65%);
  animation: rays 1.7s ease-out forwards;
}
.triple strong {
  position: absolute;
  left: 0;
  top: 0;
  translate: -50% -50%;
  white-space: nowrap;
  color: #ffd84a;
  font: 400 calc(var(--s) * 150) / 1 var(--font-number);
  letter-spacing: calc(var(--s) * 4);
  -webkit-text-stroke: calc(var(--s) * 14) var(--color-ink);
  paint-order: stroke fill;
  animation: triple-word 1.7s ease-out forwards;
}
@keyframes hint-bob { 50% { transform: translateY(calc(var(--s) * -6)); } }
@keyframes rays { 0% { transform: scale(0.2) rotate(0); opacity: 0; } 15% { opacity: 1; } 100% { transform: scale(1.3) rotate(60deg); opacity: 0; } }
@keyframes triple-word {
  0% { transform: scale(0.2) rotate(-12deg); opacity: 0; }
  18% { transform: scale(1.25) rotate(4deg); opacity: 1; }
  30% { transform: scale(1) rotate(0); }
  80% { opacity: 1; }
  100% { transform: scale(1.08); opacity: 0; }
}
</style>
