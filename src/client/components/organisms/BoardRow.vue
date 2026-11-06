<script setup lang="ts">
import { computed } from 'vue';
import SpeechBubble from '#src/client/components/atoms/SpeechBubble.vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import { cardInspector } from '#src/client/stores/cardInspector.ts';
import { tableFx } from '#src/client/stores/tableFx.ts';
import { useBoardQuips } from '#src/client/stores/useBoardQuips.ts';
import type { TableGestures } from '#src/client/stores/useTableGestures.ts';
import { boardResponder } from '#src/client/tools/boardResponder.ts';
import { endOfTurnNoteLabel } from '#src/client/tools/endOfTurnNoteLabel.ts';
import type { EndOfTurnPlayback } from '#src/client/stores/createEndOfTurnPlayback.ts';
import { braceletTargetUid, casseroleOutcome } from '#src/client/tools/casseroleOutcome.ts';
import type { CasseroleOutcome } from '#src/client/tools/casseroleOutcome.ts';
import { pointedCasseroleIndex } from '#src/client/tools/pointedCasseroleIndex.ts';
import { minionFace, scandalLeft } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import { wornCasserole } from '#src/client/tools/wornCasserole.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import { SPELL_BY_ID } from '#src/data/sorts.ts';
import { tripleCopies } from '#src/engine/minion.ts';
import type { HandSpell, Minion } from '#src/engine/types.ts';

/** Your board: up to seven medallions, in attack order. Drag to reorder, drop above the counter line to send back. */
const props = defineProps<{
  board: Minion[];
  /** Board and hand: what counts toward a triple. */
  owned: Minion[];
  gestures: TableGestures;
  scandalThreshold: number;
  round: number;
  /** The end of turn playing on the table: the stats it shows, the politician whose effect plays. */
  endOfTurn?: EndOfTurnPlayback | null;
}>();

/** During the end of turn, the stats it has reached; otherwise those of the view. */
function statsOf(minion: Minion): { atk: number; hp: number; keywords: Minion['keywords'] } {
  return props.endOfTurn?.stats.value.get(minion.uid) ?? minion;
}

/** What the playing end-of-turn effect says next to its politician. */
function endOfTurnNote(uid: number): string | null {
  const playing = props.endOfTurn?.notes.value;
  if (!playing || playing.uid !== uid) return null;
  return endOfTurnNoteLabel(playing.notes, { idle: playing.idle, fromHero: props.endOfTurn?.source.value === null });
}

const preview = computed(() => props.gestures.boardPreview.value);
/** Who would answer a defeat after the next combat: every Vedette celebrates, but one only answers. */
const responder = computed(() => boardResponder(props.board));
/** The politician just laid down, or just caught with a casserole, says a real line of theirs. */
const quip = useBoardQuips(() => props.board);
const receiving = computed(() => props.gestures.dragging.value?.item.from === 'hand');
/** Something carried over the board: the place it would land on is marked. */
const landing = computed(() => props.gestures.dragging.value?.aim.zone === 'board');
/** The landing plays on the medallion, not on its slot: the group must wait for it. */
const LAND_MS = 560;

/** The card of the hand being aimed at the board, carried or waiting for its target. */
const aimedHeld = computed<HandSpell | null>(() => {
  const item = props.gestures.dragging.value?.item;
  if (item?.from === 'hand-spell') return item.held;
  const aim = props.gestures.targeting.value;
  return aim?.kind === 'cast' ? aim.held : null;
});
const aimedCasserole = computed(() => (aimedHeld.value?.casseroleId ? (CASSEROLE_BY_ID[aimedHeld.value.casseroleId] ?? null) : null));
/** The Bracelet électronique: the people forget the longest scandal. That one is shown before the drop. */
const forgotten = computed(() => {
  const spell = aimedHeld.value?.spellId ? SPELL_BY_ID[aimedHeld.value.spellId] : null;
  return spell?.effects.some((effect) => effect.do === 'oublier') ? braceletTargetUid(props.board) : null;
});

/** Before a casserole lands: twice as good on its owner, and whether it sets off a scandal. */
function outcomeOf(minion: Minion): CasseroleOutcome | null {
  const casserole = aimedCasserole.value;
  if (!casserole || !preview.value.valid?.includes(minion.uid)) return null;
  return casseroleOutcome(minion, casserole, props.scandalThreshold);
}

const SCANDAL_TAGS = { starts: 'Scandale !', adds: 'En plein scandale', forgets: 'Oublié !' } as const;

function realIndex(minion: Minion): number {
  return props.board.findIndex((m) => m.uid === minion.uid);
}

function isReal(minion: Minion): boolean {
  return realIndex(minion) >= 0 && minion.uid !== preview.value.ghost;
}

function copiesOf(minion: Minion): number {
  const copies = minion.golden || minion.token ? 0 : tripleCopies(props.owned, minion.cardId).length;
  return copies >= 2 ? copies : 0;
}

function press(event: PointerEvent, minion: Minion): void {
  if (!isReal(minion)) return;
  props.gestures.press(event, { from: 'board', minion, index: realIndex(minion) });
}

/** The card of what the pointer is on: one of the casseroles hanging under the politician, or the politician. */
function inspectedCard(minion: Minion, casseroleIndex: number | null): ShownCard {
  const casserole = casseroleIndex === null ? undefined : CASSEROLE_BY_ID[minion.casseroles[casseroleIndex]];
  if (casserole && casseroleIndex !== null) return { kind: 'casserole', casserole, worn: wornCasserole(minion, casseroleIndex, props.round) };
  const face = minionFace(minion, {
    copies: copiesOf(minion),
    charges: minion.charges,
    scandalThreshold: props.scandalThreshold,
    scandalLeft: scandalLeft(minion, props.round),
  });
  return { kind: 'minion', face, onBoard: true };
}

/** Over the medallion or one of its casseroles: the card comes up beside the slot, the same place for both. */
function inspect(event: PointerEvent, minion: Minion): void {
  if (minion.uid < 0) return;
  cardInspector.show(inspectedCard(minion, pointedCasseroleIndex(event.target)), event.currentTarget as Element);
}
</script>

<template>
  <section class="board-zone" :class="{ receiving, landing, aiming: preview.valid !== null }" aria-label="Votre plateau">
    <TransitionGroup tag="ol" name="board" class="row" :duration="{ enter: LAND_MS, leave: 0 }">
      <li
        v-for="minion in preview.order"
        :key="minion.uid"
        class="slot"
        :data-board-uid="minion.uid"
        :data-incoming="minion.uid === preview.placed ? '' : undefined"
        :class="{
          ghost: minion.uid === preview.ghost,
          placed: minion.uid === preview.placed,
          host: minion.uid === preview.host,
          valid: preview.valid?.includes(minion.uid),
          dim: preview.valid !== null && !preview.valid.includes(minion.uid) && minion.uid !== preview.placed,
          movable: isReal(minion) && !minion.locked,
          freed: minion.uid === forgotten,
          'end-of-turn-source': endOfTurn?.source.value === minion.uid,
        }"
        :tabindex="preview.valid?.includes(minion.uid) ? 0 : undefined"
        :role="preview.valid?.includes(minion.uid) ? 'button' : undefined"
        :aria-label="preview.valid?.includes(minion.uid) ? `Viser ${minion.name}` : undefined"
        @pointerdown="press($event, minion)"
        @click="gestures.clickBoardMinion(minion.uid)"
        @keydown.enter.space.prevent="gestures.clickBoardMinion(minion.uid)"
        @pointerover="inspect($event, minion)"
        @pointerleave="cardInspector.hide()"
      >
        <MedallionToken
          :board-uid="minion.uid"
          :card-id="minion.cardId"
          :name="minion.name"
          :camp="minion.camp"
          :atk="statsOf(minion).atk"
          :hp="statsOf(minion).hp"
          :keywords="statsOf(minion).keywords"
          :effects="minion.effects"
          :casseroles="minion.casseroles"
          :golden="minion.golden"
          :locked="minion.locked"
          :bracelet="minion.bracelet"
          :charges="minion.charges"
          :scandal-threshold="scandalThreshold"
          :oublie="minion.oublie"
          :scandal-left="scandalLeft(minion, round)"
          :answers="responder === minion.uid"
          :jolts="tableFx.jolts.value[minion.uid] ?? 0"
        />
        <span v-if="outcomeOf(minion)?.owner || outcomeOf(minion)?.scandal" class="forecast" aria-hidden="true">
          <b v-if="outcomeOf(minion)?.owner" class="owner-bonus">Bonus</b>
          <b v-if="outcomeOf(minion)?.scandal" class="scandal" :class="outcomeOf(minion)?.scandal">{{ SCANDAL_TAGS[outcomeOf(minion)?.scandal ?? 'starts'] }}</b>
        </span>
        <span v-if="minion.uid === forgotten" class="forecast" aria-hidden="true"><b class="scandal forgets">Oublié !</b></span>
        <span v-if="endOfTurnNote(minion.uid)" :key="endOfTurnNote(minion.uid) ?? ''" class="forecast end-of-turn-note" aria-hidden="true"><b>{{ endOfTurnNote(minion.uid) }}</b></span>
        <span v-if="quip?.uid === minion.uid && !preview.valid" :key="quip.line" class="quip" role="status"><SpeechBubble tail="down">{{ quip.line }}</SpeechBubble></span>
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.board-zone {
  --medal-w: calc(var(--s) * 150);
  position: absolute;
  left: calc(var(--s) * 316);
  top: calc(var(--s) * 452);
  width: calc(var(--s) * 1288);
  height: calc(var(--s) * 300);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  border-radius: calc(var(--s) * 36);
  transition: background-color 0.15s, box-shadow 0.15s;
}
.receiving { background: rgb(255 255 255 / 0.04); box-shadow: inset 0 0 0 calc(var(--s) * 3) rgb(255 255 255 / 0.18); }
.row { list-style: none; margin: 0; padding: calc(var(--s) * 34) 0 0; display: flex; gap: calc(var(--s) * 30); }
.slot { position: relative; touch-action: none; }
.movable { cursor: grab; }
.slot > .medallion { transition: transform 0.15s ease-out, filter 0.15s, opacity 0.15s; }
.movable:hover > .medallion { transform: translateY(calc(var(--s) * -6)); }
.ghost > .medallion { opacity: 0.35; filter: saturate(0.4); }
/* Where it would land: a dashed golden oval, breathing. */
.landing .ghost::before {
  content: '';
  position: absolute;
  z-index: 1;
  left: calc(var(--s) * -9);
  right: calc(var(--s) * -9);
  top: calc(var(--s) * -9);
  height: calc(var(--s) * 198);
  border-radius: 50%;
  border: calc(var(--s) * 4) dashed #ffe27a;
  box-shadow: 0 0 calc(var(--s) * 18) rgb(255 220 100 / 0.55), inset 0 0 calc(var(--s) * 18) rgb(255 220 100 / 0.35);
  pointer-events: none;
  animation: landing-pulse 0.7s ease-in-out infinite;
}
.placed > .medallion { transform: translateY(calc(var(--s) * -10)) scale(1.06); filter: drop-shadow(0 0 calc(var(--s) * 16) rgb(255 230 120 / 0.9)); }
.host > .medallion { transform: scale(1.12); filter: drop-shadow(0 0 calc(var(--s) * 18) #7dff9e) brightness(1.15); }
.valid { cursor: crosshair; }
.valid > .medallion { filter: drop-shadow(0 0 calc(var(--s) * 12) #7dff9e); animation: valid-pulse 0.9s ease-in-out infinite; }
.valid:hover > .medallion { transform: scale(1.1); filter: drop-shadow(0 0 calc(var(--s) * 20) #b6ffcb) brightness(1.2); }
.dim > .medallion { opacity: 0.45; filter: grayscale(0.7); }
/* Its end-of-turn effect plays: it rises into the light. */
.end-of-turn-source > .medallion { transform: translateY(calc(var(--s) * -12)) scale(1.1); filter: drop-shadow(0 0 calc(var(--s) * 22) #ffe680) brightness(1.25); }
.end-of-turn-source::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 30%;
  width: calc(var(--medal-w) * 0.9);
  height: calc(var(--medal-w) * 2.4);
  translate: -50% 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(to top, rgb(255 236 160 / 0.6), rgb(255 236 160 / 0.15) 60%, transparent);
  filter: blur(calc(var(--s) * 8));
  animation: forecast-in 0.25s ease-out;
}
.end-of-turn-note b { background: #fff3c4; color: var(--color-ink); }
.freed > .medallion { filter: drop-shadow(0 0 calc(var(--s) * 18) #ffd84a) brightness(1.15); animation: valid-pulse 0.9s ease-in-out infinite; }
/* What the casserole in hand would do here, above the medallion, before it is dropped. */
.forecast { position: absolute; left: 50%; top: calc(var(--s) * -30); translate: -50% 0; z-index: 3; display: flex; gap: calc(var(--s) * 6); pointer-events: none; white-space: nowrap; animation: forecast-in 0.25s cubic-bezier(0.3, 1.6, 0.5, 1); }
.forecast b { padding: calc(var(--s) * 2) calc(var(--s) * 12); border-radius: calc(var(--s) * 14); border: calc(var(--s) * 3) solid var(--color-ink); font: 400 calc(var(--s) * 26) / 1.1 var(--font-number); letter-spacing: calc(var(--s) * 1); box-shadow: calc(var(--s) * 3) calc(var(--s) * 4) 0 rgb(0 0 0 / 0.4); }
.owner-bonus { background: #ffd84a; color: var(--color-ink); }
.scandal { background: #c8102e; color: #fff; rotate: -4deg; }
.scandal.forgets { background: #f2c230; color: var(--color-ink); }
.quip { position: absolute; left: 50%; bottom: calc(100% - var(--s) * 20); z-index: 4; width: max-content; max-width: calc(var(--s) * 340); translate: -50% 0; pointer-events: none; animation: forecast-in 0.3s cubic-bezier(0.3, 1.6, 0.5, 1); }
.quip :deep(.bubble) { font-size: calc(var(--s) * 22); }
@keyframes forecast-in { from { transform: scale(0.3); opacity: 0; } }


.board-move { transition: transform 0.22s ease-out; }
.board-enter-active > .medallion { animation: land 0.5s ease-out; }
/* The preview of a drop does not land: it fades in where it would go. */
.ghost.board-enter-active > .medallion { animation: ghost-in 0.18s ease-out; }
.ghost.board-enter-active::after { content: none; }
/* Touchdown: a ring of air flattens out on the carpet. */
.board-enter-active:not(.ghost)::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(var(--s) * -8);
  width: calc(var(--s) * 180);
  height: calc(var(--s) * 46);
  margin-left: calc(var(--s) * -90);
  border-radius: 50%;
  border: calc(var(--s) * 5) solid rgb(255 244 210 / 0.95);
  pointer-events: none;
  opacity: 0;
  animation: shockwave 0.32s ease-out 0.24s forwards;
}
.board-enter-active::after {
  content: '';
  position: absolute;
  left: -20%;
  right: -20%;
  bottom: calc(var(--s) * -10);
  height: calc(var(--s) * 50);
  pointer-events: none;
  background: radial-gradient(ellipse at 30% 60%, rgb(230 225 210 / 0.7), transparent 45%), radial-gradient(ellipse at 70% 60%, rgb(230 225 210 / 0.6), transparent 45%), radial-gradient(ellipse at 50% 50%, rgb(230 225 210 / 0.5), transparent 60%);
  opacity: 0;
  animation: dust 0.4s ease-out 0.24s forwards;
}
@keyframes land {
  0% { transform: translateY(calc(var(--s) * -70)) scale(0.9, 1.15); opacity: 0.4; }
  55% { transform: translateY(0) scale(1.14, 0.84); opacity: 1; }
  75% { transform: scale(0.96, 1.05); }
  100% { transform: none; }
}
@keyframes dust { from { transform: scale(0.4); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
@keyframes shockwave { 0% { transform: scale(0.4); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes ghost-in { from { opacity: 0; transform: scale(0.85); } }
@keyframes landing-pulse { 50% { transform: scale(1.04); border-color: #fff3b0; } }
@keyframes valid-pulse { 50% { filter: drop-shadow(0 0 calc(var(--s) * 20) #7dff9e) brightness(1.1); } }
@media (prefers-reduced-motion: reduce) {
  .board-enter-active > .medallion, .board-enter-active::before, .board-enter-active::after, .landing .ghost::before, .valid > .medallion, .freed > .medallion { animation: none !important; }
}
</style>
