<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import ReadyButton from '#src/client/components/atoms/ReadyButton.vue';
import EndOfTurnBanner from '#src/client/components/molecules/EndOfTurnBanner.vue';
import MobileOpponents from '#src/client/components/molecules/MobileOpponents.vue';
import MobileTopBar from '#src/client/components/molecules/MobileTopBar.vue';
import BoardRow from '#src/client/components/organisms/BoardRow.vue';
import CarriedItem from '#src/client/components/organisms/CarriedItem.vue';
import FxLayer from '#src/client/components/organisms/FxLayer.vue';
import HostDesk from '#src/client/components/organisms/HostDesk.vue';
import MobileCardSheet from '#src/client/components/organisms/MobileCardSheet.vue';
import MobileDiscover from '#src/client/components/organisms/MobileDiscover.vue';
import MobileHand from '#src/client/components/organisms/MobileHand.vue';
import MobileHeroSheet from '#src/client/components/organisms/MobileHeroSheet.vue';
import ShopRow from '#src/client/components/organisms/ShopRow.vue';
import { preloadCombat } from '#src/client/pixi/preloadCombat.ts';
import { playSound } from '#src/client/services/soundEffects.ts';
import type { GameStore } from '#src/client/stores/createGameStore.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import type { Point } from '#src/client/stores/tableFx.ts';
import { useCountdown } from '#src/client/stores/useCountdown.ts';
import { useTableGestures } from '#src/client/stores/useTableGestures.ts';
import type { GestureItem, Zone } from '#src/client/stores/useTableGestures.ts';
import { cardSheetFor } from '#src/client/tools/cardSheetFor.ts';
import type { CardSheet } from '#src/client/tools/cardSheetFor.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { refreshedItem } from '#src/client/tools/refreshedItem.ts';
import type { SheetAction } from '#src/client/tools/sheetAction.ts';
import { zoneAroundBand } from '#src/client/tools/zoneAroundBand.ts';
import type { PlayerView } from '#src/engine/game.ts';

const TRIPLE_MS = 1700;
const PRELOAD_AFTER_MS = 1500;

/**
 * The recruitment on a phone held upright (6 November 2026): the bar and the other candidates on top, the host's desk
 * and the shop, your board, your hand, and « Prêt ! ». A touch opens a card, to read it and play it; a drag buys, lays
 * down, moves or sends back, as on a computer. The same game: every action goes through the store.
 */
const props = withDefaults(defineProps<{ view: PlayerView; store: GameStore; powerNote?: string | null }>(), { powerNote: null });

const secondsLeft = useCountdown(props.store.deadline);
const sheet = shallowRef<CardSheet | null>(null);
const heroOpen = ref(false);
const gestures = useTableGestures({ view: () => props.view, act: (action) => props.store.act(action), zoneAt: zoneOnPhone, onTap: openSheet });
const owned = computed(() => [...props.view.board, ...props.view.hand]);
const decor = computed(() => cssImage(gameArt.manifest.value.plateaux[props.view.plateau.id]?.decor));
const aimHint = computed(() => {
  const aim = gestures.targeting.value;
  if (!aim) return null;
  return aim.kind === 'cast' ? 'Sur qui ? Touchez un politique.' : 'Quel allié ? Touchez-le.';
});

/** The zone under a finger: around the board's band, the shop above it and the hand below it. */
function zoneOnPhone(point: Point): Zone | null {
  const band = document.querySelector('.mobile-recruit .board-band')?.getBoundingClientRect();
  return band ? zoneAroundBand(point.y, band) : null;
}

function openSheet(item: GestureItem): void {
  sheet.value = cardSheetFor(item, props.view);
}

/** The card's button: sent back with its coins, or played as a click plays it on a computer. */
function chooseAction(id: SheetAction['id'], source: Element | null): void {
  const opened = sheet.value;
  sheet.value = null;
  if (!opened) return;
  if (id === 'sell' && (opened.item.from === 'board' || opened.item.from === 'hand')) gestures.sendBack(opened.item.minion, source);
  else gestures.actOn(opened.item, source);
}

/** A new state of the game: the card opened follows what it shows, or closes when it is gone or a choice comes up. */
watch(() => props.view, (view) => {
  const opened = sheet.value;
  if (!opened) return;
  const item = view.discover ? null : refreshedItem(opened.item, view);
  sheet.value = item ? cardSheetFor(item, view) : null;
});

let preloadTimer = 0;
onMounted(() => {
  preloadTimer = window.setTimeout(() => preloadCombat(), PRELOAD_AFTER_MS);
});
onUnmounted(() => window.clearTimeout(preloadTimer));

/** A real triple: a burst of gold, then it goes away by itself. */
const triples = ref(0);
const showTriple = ref(false);
let tripleTimer = 0;
watch(() => props.view.stats.triples, (count, before) => {
  if (count <= before) return;
  triples.value++;
  showTriple.value = true;
  playSound('triple');
  window.clearTimeout(tripleTimer);
  tripleTimer = window.setTimeout(() => (showTriple.value = false), TRIPLE_MS);
});
onUnmounted(() => window.clearTimeout(tripleTimer));
</script>

<template>
  <div class="mobile-recruit" :class="{ aiming: gestures.targeting.value, 'ending-turn': store.endOfTurn.value }">
    <div class="decor" :style="{ backgroundImage: decor }" aria-hidden="true" />
    <MobileTopBar :hero-id="view.heroId" :hp="view.hp" :start-hp="view.params.startHp" :budget="view.budget" :max-budget="view.maxBudget" @hero="heroOpen = true" />
    <MobileOpponents :table="view.table" :seat="view.seat" />
    <div class="desk-band">
      <HostDesk class="desk-place" :view="view" :line="store.hostLine.value" :line-count="store.hostLineCount.value" :act="store.act" />
    </div>
    <div class="shop-band" :style="{ '--shop-count': Math.max(3, view.shop.length) }">
      <ShopRow class="shop" :view="view" :gestures="gestures" />
    </div>
    <div class="board-band">
      <BoardRow class="board" :board="view.board" :owned="owned" :gestures="gestures" :scandal-threshold="view.scandalThreshold" :round="view.round" :end-of-turn="store.endOfTurn.value" />
    </div>
    <MobileHand class="hand" :view="view" :gestures="gestures" />
    <footer class="bottom">
      <p v-if="aimHint" class="aim-hint" aria-live="polite">{{ aimHint }}</p>
      <p v-else class="hint"><strong>Manche {{ view.round }}</strong> Touchez une carte pour la lire ; glissez-la pour la jouer.</p>
      <ReadyButton class="ready" :seconds-left="secondsLeft" :done="store.hasEndedRecruitment.value" @ready="store.endRecruitment()" />
    </footer>
    <EndOfTurnBanner v-if="store.endOfTurn.value?.banner.value" class="end-banner" />
    <div v-if="showTriple" :key="triples" class="triple" aria-live="polite"><strong>Triple !</strong></div>

    <CarriedItem :gestures="gestures" :scandal-threshold="view.scandalThreshold" :round="view.round" />
    <FxLayer />
    <MobileDiscover v-if="view.discover" :key="view.discover.join()" :choices="view.discover" :kind="view.discoverKind" @choose="(i) => store.act({ t: 'discover', i })" />
    <MobileCardSheet v-if="sheet" :card="sheet.card" :actions="sheet.actions" :casseroles="sheet.casseroles" @choose="chooseAction" @close="sheet = null" />
    <MobileHeroSheet v-if="heroOpen" :hero-id="view.heroId" :power-note="powerNote" @close="heroOpen = false" />
  </div>
</template>

<style scoped>
/*
 * --s is one pixel of the computer's 1920×1080 table: here, the board's seven medallions fill the width of the
 * screen. The bands tighten what was drawn for a wide table.
 */
.mobile-recruit {
  --s: calc((100vw - 40px) / 1050);
  --board-gap: 4px;
  --board-top: 4px;
  --shop-gap: 6px;
  --shop-wrap: wrap;
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: env(safe-area-inset-top) 8px env(safe-area-inset-bottom);
  overflow: hidden;
  background: #0b0e18;
  color: var(--color-text);
  user-select: none;
  -webkit-user-select: none;
}
.decor { position: absolute; inset: -2%; z-index: -1; background: center / cover no-repeat; filter: blur(4px) brightness(0.42) saturate(1.1); }
/* The host's desk, scaled to the width of the screen. */
.desk-band { --s: calc((100vw - 16px) / 800); display: flex; justify-content: center; flex: none; }
.desk-place { position: relative; }
/* The host's lines: under the desk, across the screen, at a reading size (on a computer, beside the desk). */
.desk-place :deep(.talk) { z-index: 40; left: 50%; top: calc(100% + 4px); max-width: calc(100vw - 24px); translate: -50% 0; }
.desk-place :deep(.talk .bubble) { font-size: 0.95rem; }
/* The shop's politicians stand on one line, as big as their number allows; the spell and the casserole may go below. */
.shop-band {
  --s: min(0.5px, calc((100vw - 16px - (var(--shop-count) - 1) * 6px) / (var(--shop-count) * 150)));
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: calc(var(--s) * 240);
}
.shop { position: relative; width: 100%; min-height: calc(var(--s) * 240); padding: calc(var(--s) * 24) 0 calc(var(--s) * 10); align-content: center; }
.board-band { flex: none; }
.board { position: relative; width: 100%; height: calc(var(--s) * 248); }
.hand { flex: none; }
.bottom { --s: 0.42px; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; flex: none; padding: 0 0.2rem 0.3rem 50px; }
.hint, .aim-hint { flex: 1; margin: 0; color: var(--color-text-muted); font-size: 0.85rem; line-height: 1.25; }
.hint strong { display: block; color: #fff; font: 400 1.1rem / 1.1 var(--font-number); letter-spacing: 1px; }
.aim-hint { color: #ffe066; font: 400 1.25rem / 1.1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 3px var(--color-ink); paint-order: stroke fill; }
.ready { flex: none; }
.aiming .shop-band, .aiming .hand { filter: brightness(0.55) saturate(0.6); transition: filter 0.2s; }
/* The end of turn plays on the board only: the shop and the hand step back. */
.ending-turn .shop-band, .ending-turn .hand, .ending-turn .desk-band { filter: brightness(0.4) saturate(0.4); pointer-events: none; transition: filter 0.3s; }
.end-banner { --s: 0.36px; }
.triple { position: fixed; left: 50%; top: 45%; z-index: 30; translate: -50% -50%; pointer-events: none; }
.triple strong { display: block; color: #ffd84a; font: 400 4rem / 1 var(--font-number); letter-spacing: 2px; -webkit-text-stroke: 8px var(--color-ink); paint-order: stroke fill; animation: triple-word 1.7s ease-out forwards; }
@keyframes triple-word {
  0% { transform: scale(0.2) rotate(-12deg); opacity: 0; }
  18% { transform: scale(1.25) rotate(4deg); opacity: 1; }
  30% { transform: scale(1) rotate(0); }
  80% { opacity: 1; }
  100% { transform: scale(1.08); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) { .triple strong { animation: none; } }
</style>
