<script setup lang="ts">
import { computed } from 'vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import type { GestureItem, TableGestures } from '#src/client/stores/useTableGestures.ts';
import { handCardShown } from '#src/client/tools/handCardShown.ts';
import { handCards } from '#src/client/tools/handCards.ts';
import type { HandCard } from '#src/client/tools/handCards.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { PlayerView } from '#src/engine/game.ts';

/**
 * The hand on a phone: the cards side by side, overlapping once there are many. A touch opens a card, to read it and
 * play it; a drag lays it on the board, or sends it back to the shop.
 */
const props = defineProps<{ view: PlayerView; gestures: TableGestures }>();

const cards = computed(() => handCards(props.view.hand, props.view.spells).map((card) => ({ card, shown: handCardShown(card, props.view) })));
/** Something carried from the shop: the hand glows, brighter when it is right over it. */
const receiving = computed(() => {
  const drag = props.gestures.dragging.value;
  if (!drag || !['shop', 'shop-spell', 'shop-casserole'].includes(drag.item.from)) return null;
  return drag.aim.zone === 'hand' ? 'over' : 'near';
});

function item(card: HandCard, shown: ShownCard): GestureItem {
  return card.kind === 'minion' ? { from: 'hand', minion: card.minion } : { from: 'hand-spell', held: card.held, card: shown };
}

/** Carried away, or laid on the board while its Annonce waits for a target: it waits as a faint copy. */
function isCarried(card: HandCard): boolean {
  const aim = props.gestures.targeting.value;
  if (aim?.kind === 'play' && aim.minion.uid === card.uid) return true;
  if (aim?.kind === 'cast' && aim.held.uid === card.uid) return true;
  return props.gestures.isCarried((other) => (other.from === 'hand' && other.minion.uid === card.uid) || (other.from === 'hand-spell' && other.held.uid === card.uid));
}

function nameOf(card: HandCard): string {
  if (card.kind === 'minion') return card.minion.name;
  return card.kind === 'casserole' ? `la casserole ${card.casserole.name}` : card.spell.name;
}
</script>

<template>
  <section class="hand-zone" :class="receiving" aria-label="Votre main" :style="{ '--count': cards.length }">
    <p v-if="cards.length === 0" class="empty">Main vide : recrutez dans la boutique.</p>
    <TransitionGroup v-else name="hand" tag="ol" class="cards">
      <li
        v-for="({ card, shown }, index) in cards"
        :key="card.uid"
        class="card"
        :class="{ carried: isCarried(card), golden: card.kind === 'minion' && card.minion.golden, spell: card.kind !== 'minion' }"
        :style="{ '--i': index }"
        :data-card="card.kind === 'minion' ? card.minion.cardId : card.kind === 'casserole' ? 'casserole' : card.spell.id"
        tabindex="0"
        role="button"
        :aria-label="`Voir ${nameOf(card)}`"
        @pointerdown="gestures.press($event, item(card, shown))"
        @click="gestures.click(item(card, shown), $event.currentTarget as Element)"
        @keydown.enter.space.prevent="gestures.click(item(card, shown), $event.currentTarget as Element)"
      >
        <ShownCardFace :card="shown" />
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
/* --card-w is the width of a card; past the screen's width, each card hides part of the one before. */
.hand-zone {
  --card-w: min(98px, 25vw);
  container-type: inline-size;
  position: relative;
  height: calc(var(--card-w) * 732 / 512 + 14px);
  border-radius: 18px;
  transition: background-color 0.15s, box-shadow 0.15s;
}
.near { background: rgb(255 255 255 / 0.04); }
.over { background: rgb(255 216 74 / 0.12); box-shadow: inset 0 0 0 3px rgb(255 216 74 / 0.7); }
.empty { display: grid; place-items: center; height: 100%; color: var(--color-text-muted); font-style: italic; }
.cards {
  --step: min(calc(var(--card-w) + 6px), calc((100cqw - var(--card-w)) / max(1, calc(var(--count) - 1))));
  position: relative;
  width: calc((var(--count) - 1) * var(--step) + var(--card-w));
  height: 100%;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}
.card { position: absolute; left: calc(var(--i) * var(--step)); top: 7px; width: var(--card-w); touch-action: none; transition: left 0.2s ease-out, translate 0.12s ease-out; }
.card:active { translate: 0 -8px; }
.card > :first-child { filter: drop-shadow(0 6px 8px rgb(0 0 0 / 0.6)); }
.golden > :first-child { filter: drop-shadow(0 0 8px rgb(255 210 60 / 0.95)); }
.carried { opacity: 0.3; }
.hand-enter-active { transition: transform 0.35s cubic-bezier(0.3, 1.4, 0.5, 1), opacity 0.2s; }
.hand-enter-from { transform: translateY(-40px) scale(0.6); opacity: 0; }
.hand-leave-active { display: none; }
</style>
