<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import CardGlossary from '#src/client/components/molecules/CardGlossary.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import type { GestureItem, TableGestures } from '#src/client/stores/useTableGestures.ts';
import { fanLayout } from '#src/client/tools/fanLayout.ts';
import { handCards } from '#src/client/tools/handCards.ts';
import type { HandCard } from '#src/client/tools/handCards.ts';
import { minionFace, scandalLeft } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { tripleCopies } from '#src/engine/minion.ts';

/** In design pixels of the 1920×1080 table. */
const CARD_WIDTH = 196;
const CARD_HEIGHT = CARD_WIDTH * (732 / 512);
const FAN = { step: 150, maxSpan: 900, anglePerCard: 5, maxAngle: 16, dip: 5, hoverScale: 1.95, hoverLift: 0, hoverSpread: 70 };
/** The hovered card stands on the bottom of the screen, whole. */
const HOVER_BOTTOM_MARGIN = 8;
/** How much of a card at rest hangs below the screen. */
const HIDDEN_AT_REST = 70;

/**
 * The hand, held in an arc at the bottom of the table: minions, spells and casseroles together.
 * Hovering a card straightens it and brings it up big enough to read, its keywords explained beside it.
 */
const props = defineProps<{ view: PlayerView; gestures: TableGestures }>();

const cards = computed(() => handCards(props.view.hand, props.view.spells));
const hovered = ref<number | null>(null);
const isBusy = computed(() => props.gestures.dragging.value !== null || props.gestures.targeting.value !== null);
const owned = computed(() => [...props.view.board, ...props.view.hand]);
/** Something carried from the shop: the hand glows, brighter when it is right over it. */
const receiving = computed(() => {
  const drag = props.gestures.dragging.value;
  if (!drag || !['shop', 'shop-spell', 'shop-casserole'].includes(drag.item.from)) return null;
  return drag.aim.zone === 'hand' ? 'over' : 'near';
});

watch(() => cards.value.length, () => (hovered.value = null));
watch(isBusy, (busy) => busy && (hovered.value = null));

const slots = computed(() => fanLayout(cards.value.length, hovered.value, FAN));

function shown(card: HandCard): ShownCard {
  if (card.kind === 'minion') {
    const copies = card.minion.golden ? 0 : tripleCopies(owned.value, card.minion.cardId).length;
    const { minion } = card;
    return {
      kind: 'minion',
      face: minionFace(minion, { copies: copies >= 2 ? copies : 0, charges: minion.charges, scandalThreshold: props.view.scandalThreshold, scandalLeft: scandalLeft(minion, props.view.round) }),
    };
  }
  if (card.kind === 'casserole') return { kind: 'casserole', casserole: card.casserole };
  return { kind: 'spell', spell: card.spell, count: card.held.count, tier: card.held.tier, tract: props.view.tract };
}

function item(card: HandCard): GestureItem {
  return card.kind === 'minion' ? { from: 'hand', minion: card.minion } : { from: 'hand-spell', held: card.held, card: shown(card) };
}

function cardStyle(index: number): Record<string, string> {
  const slot = slots.value[index];
  const isHovered = index === hovered.value;
  const lift = isHovered ? -(HIDDEN_AT_REST + HOVER_BOTTOM_MARGIN) : slot.y;
  return {
    transform: `translate(calc(var(--s) * ${slot.x - CARD_WIDTH / 2}), calc(var(--s) * ${lift})) rotate(${slot.angle}deg) scale(${slot.scale})`,
    zIndex: String(slot.z),
  };
}

const hoveredCard = computed(() => (hovered.value === null ? null : cards.value[hovered.value] ?? null));
/** The keywords of the hovered card go on the side of the hand where there is room. */
const glossaryStyle = computed(() => {
  if (hovered.value === null) return {};
  const x = slots.value[hovered.value].x;
  const half = (CARD_WIDTH * FAN.hoverScale) / 2 + 16;
  return x <= 0 ? { left: `calc(var(--s) * ${530 + x + half})` } : { right: `calc(var(--s) * ${530 - x + half})` };
});

/** Carried away, or laid on the board while its Annonce waits for a target: it waits as a faint copy. */
function isCarried(card: HandCard): boolean {
  const aim = props.gestures.targeting.value;
  if (aim?.kind === 'play' && aim.minion.uid === card.uid) return true;
  if (aim?.kind === 'cast' && aim.held.uid === card.uid) return true;
  return props.gestures.isCarried((other) => (other.from === 'hand' && other.minion.uid === card.uid) || (other.from === 'hand-spell' && other.held.uid === card.uid));
}

/** What a screen reader says of a card of the hand. */
function nameOf(card: HandCard): string {
  if (card.kind === 'minion') return card.minion.name;
  return card.kind === 'casserole' ? `la casserole ${card.casserole.name}` : card.spell.name;
}

function enter(index: number): void {
  if (!isBusy.value) hovered.value = index;
}

function leave(index: number): void {
  if (hovered.value === index) hovered.value = null;
}
</script>

<template>
  <section class="hand-zone" :class="receiving" aria-label="Votre main" :style="{ '--card-w': CARD_WIDTH, '--card-h': CARD_HEIGHT, '--hidden': HIDDEN_AT_REST }">
    <span v-if="receiving" class="welcome" aria-hidden="true" />
    <TransitionGroup name="hand" tag="ol" class="fan">
      <li
        v-for="(card, index) in cards"
        :key="card.uid"
        class="card"
        :data-card="card.kind === 'minion' ? card.minion.cardId : card.kind === 'casserole' ? 'casserole' : card.spell.id"
        :class="{ hovered: index === hovered, golden: card.kind === 'minion' && card.minion.golden, carried: isCarried(card), spell: card.kind !== 'minion' }"
        :style="cardStyle(index)"
        tabindex="0"
        role="button"
        :aria-label="`Jouer ${nameOf(card)}`"
        @pointerenter="enter(index)"
        @pointerleave="leave(index)"
        @focus="enter(index)"
        @blur="leave(index)"
        @pointerdown="gestures.press($event, item(card))"
        @click="gestures.click(item(card), $event.currentTarget as Element)"
        @keydown.enter.space.prevent="gestures.click(item(card), $event.currentTarget as Element)"
      >
        <ShownCardFace :card="shown(card)" />
      </li>
    </TransitionGroup>
    <CardGlossary v-if="hoveredCard" :key="hoveredCard.uid" class="glossary" :style="glossaryStyle" :card="shown(hoveredCard)" />
  </section>
</template>

<style scoped>
.hand-zone {
  position: absolute;
  left: calc(var(--s) * 430);
  width: calc(var(--s) * 1060);
  bottom: 0;
  height: calc(var(--s) * 220);
  z-index: 20;
}
.fan { list-style: none; margin: 0; padding: 0; position: absolute; left: calc(var(--s) * 530); bottom: 0; width: 0; height: 0; }
.card {
  position: absolute;
  left: 0;
  bottom: calc(var(--s) * var(--hidden) * -1);
  width: calc(var(--s) * var(--card-w));
  transform-origin: 50% 100%;
  transition: transform 0.16s ease-out, opacity 0.15s;
  cursor: grab;
  touch-action: none;
}
.card > :first-child { filter: drop-shadow(0 calc(var(--s) * 6) calc(var(--s) * 10) rgb(0 0 0 / 0.6)); }
.hovered { cursor: grab; }
.hovered > :first-child { filter: drop-shadow(0 calc(var(--s) * 16) calc(var(--s) * 26) rgb(0 0 0 / 0.75)); }
.golden > :first-child { filter: drop-shadow(0 0 calc(var(--s) * 14) rgb(255 210 60 / 0.95)); }
.carried { opacity: 0.25; }
.card:focus-visible { outline: none; }
.card:focus-visible > :first-child { filter: drop-shadow(0 0 calc(var(--s) * 10) var(--color-accent)) drop-shadow(0 0 calc(var(--s) * 4) var(--color-accent)); }
.glossary { position: absolute; z-index: 30; bottom: calc(var(--s) * 18); width: calc(var(--s) * 380); pointer-events: none; }

/* A golden halo rises behind the hand, above the cards: drop it here. */
.welcome {
  position: absolute;
  left: calc(var(--s) * -60);
  right: calc(var(--s) * -60);
  bottom: 0;
  height: calc(var(--s) * 340);
  background: radial-gradient(ellipse 52% 100% at 50% 100%, transparent 50%, rgb(255 214 90 / 0.65) 68%, rgb(255 236 160 / 0.25) 80%, transparent 90%);
  pointer-events: none;
  opacity: 0.45;
  transition: opacity 0.15s;
  animation: welcome-in 0.2s ease-out;
}
.over .welcome { opacity: 1; }
/* A new card arrives as the bought medallion lands in the hand (FxLayer): it pops up a moment later. */
.hand-enter-active { animation: draw 0.36s cubic-bezier(0.3, 1.5, 0.5, 1) 0.22s both; }
@keyframes draw {
  from { opacity: 0; translate: 0 calc(var(--s) * 160); scale: 0.6; }
}
@keyframes welcome-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .hand-enter-active, .welcome { animation: none; } }
</style>
