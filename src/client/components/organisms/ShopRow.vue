<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import { playSound } from '#src/client/services/soundEffects.ts';
import { cardInspector } from '#src/client/stores/cardInspector.ts';
import type { GestureItem, TableGestures } from '#src/client/stores/useTableGestures.ts';
import { sellGain } from '#src/client/tools/sellGain.ts';
import { shopFit } from '#src/client/tools/shopFit.ts';
import { minionFace } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import { SPELL_BY_ID } from '#src/data/sorts.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { makeMinion, tripleCopies } from '#src/engine/minion.ts';
import type { Minion } from '#src/engine/types.ts';

/**
 * The shop: minions already rendered as medallions, with their shop gains; the spell and the casserole as cards.
 * Click, or drag to your hand: it is bought. Drop one of yours here: it is sent back.
 */
const props = defineProps<{ view: PlayerView; gestures: TableGestures }>();

const owned = computed(() => [...props.view.board, ...props.view.hand]);

/** A key that survives a purchase: the cards after it shift left, they must not drop in again. */
function stableKeys(ids: string[]): string[] {
  const seen = new Map<string, number>();
  return ids.map((id) => {
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    return `${id}-${count}`;
  });
}

const minions = computed(() => props.view.shop.map((cardId, slot) => {
  const gain = props.view.shopGains[slot] ?? { atk: 0, hp: 0 };
  const base = makeMinion(CARD_BY_ID[cardId], -100 - slot);
  const minion: Minion = { ...base, atk: base.atk + gain.atk, hp: base.hp + gain.hp };
  const copies = tripleCopies(owned.value, cardId).length;
  return { slot, key: stableKeys(props.view.shop)[slot], minion, triple: copies >= 2, affordable: props.view.budget >= props.view.buyCost };
}));
const spells = computed(() => props.view.shopSpells.map((spellId, slot) => {
  const spell = SPELL_BY_ID[spellId];
  const cost = props.view.shopSpellCosts[slot] ?? spell.cost;
  return { slot, key: stableKeys(props.view.shopSpells)[slot], spell, cost, affordable: props.view.budget >= cost, card: { kind: 'spell', spell } as ShownCard };
}));
const casserole = computed(() => {
  const id = props.view.casseroleOffer;
  const found = id ? CASSEROLE_BY_ID[id] : null;
  if (!found) return null;
  const cost = props.view.casseroleCost ?? found.cost;
  return { casserole: found, cost, affordable: props.view.budget >= cost, card: { kind: 'casserole', casserole: found, ownerMultiplier: props.view.params.ownerMultiplier } as ShownCard };
});
/** A full counter (tier 6: six politicians, a spell, a casserole) shrinks its items to stay on one line. */
const fit = computed(() => shopFit(minions.value.length, spells.value.length + (casserole.value ? 1 : 0)));
/** One of yours carried over the shop: it would be sent back for this much. */
const sending = computed(() => {
  const drag = props.gestures.dragging.value;
  return (drag?.item.from === 'board' || drag?.item.from === 'hand') && drag.aim.zone === 'shop';
});
/** What the carried one brings back: its Vente budget counts too, from the board. */
const sellHint = computed(() => {
  const item = props.gestures.dragging.value?.item;
  if (!item || (item.from !== 'board' && item.from !== 'hand')) return null;
  return sellGain(props.view.params, props.view.mods, item.minion, item.from === 'board');
});

/** A new shop drops in, after a flash sweeps the old one away; a purchase only takes one away. */
const generation = ref(0);
watch(() => props.view.shop, (next, before) => {
  // Every state brings a new copy of the shop: only a different content counts.
  const same = next.length === before.length && next.every((id, index) => id === before[index]);
  const bought = next.length === before.length - 1 && next.every((id) => before.includes(id));
  if (same || bought) return;
  generation.value++;
  playSound('roll');
});

/** Frozen: snowflakes burst from the middle as the frost creeps in. Thawed: a drop. */
const frostBurst = ref(0);
watch(() => props.view.frozen, (frozen, before) => {
  if (frozen && !before) {
    frostBurst.value++;
    playSound('freeze');
  } else if (!frozen && before) {
    playSound('thaw');
  }
});

function carried(match: (item: GestureItem) => boolean): boolean {
  return props.gestures.isCarried(match);
}

function inspect(event: PointerEvent, card: ShownCard): void {
  cardInspector.show(card, event.currentTarget as Element);
}
</script>

<template>
  <section class="shop-zone" :class="{ frozen: view.frozen, sending }" :style="{ '--fit': fit }" aria-label="Boutique">
    <span class="frost" aria-hidden="true" />
    <span v-if="generation" :key="`sweep-${generation}`" class="sweep" aria-hidden="true" />
    <span v-if="frostBurst" :key="`frost-${frostBurst}`" class="frost-burst" aria-hidden="true">
      <GameIcon v-for="index in 10" :key="index" name="snowflake" :style="{ '--a': `${index * 36 + 8}deg`, '--far': `${300 + (index % 3) * 110}` }" />
    </span>
    <TransitionGroup tag="ol" name="shop" class="row">
      <li
        v-for="(item, index) in minions"
        :key="`${generation}-${item.key}`"
        class="item minion"
        :data-card="item.minion.cardId"
        :class="{ triple: item.triple, poor: !item.affordable, carried: carried((i) => i.from === 'shop' && i.slot === item.slot) }"
        :style="{ '--drop-delay': `${index * 70}ms` }"
        tabindex="0"
        role="button"
        :aria-label="`Acheter ${item.minion.name}`"
        @pointerdown="gestures.press($event, { from: 'shop', slot: item.slot, minion: item.minion })"
        @click="gestures.click({ from: 'shop', slot: item.slot, minion: item.minion }, $event.currentTarget as Element)"
        @keydown.enter.space.prevent="gestures.click({ from: 'shop', slot: item.slot, minion: item.minion }, $event.currentTarget as Element)"
        @pointerenter="inspect($event, { kind: 'minion', face: minionFace(item.minion) })"
        @pointerleave="cardInspector.hide()"
      >
        <MedallionToken
          :card-id="item.minion.cardId"
          :name="item.minion.name"
          :camp="item.minion.camp"
          :tier="item.minion.tier"
          show-tier
          :atk="item.minion.atk"
          :hp="item.minion.hp"
          :keywords="item.minion.keywords"
          :effects="item.minion.effects"
          :golden="item.minion.golden"
        />
        <span v-if="item.triple" class="triple-badge" aria-label="Complète un triple"><GameIcon name="sparkle" /></span>
      </li>
      <li
        v-for="(item, index) in spells"
        :key="`${generation}-spell-${item.key}`"
        class="item card"
        :data-card="item.spell.id"
        :class="{ poor: !item.affordable, carried: carried((i) => i.from === 'shop-spell' && i.slot === item.slot) }"
        :style="{ '--drop-delay': `${(minions.length + index) * 70}ms` }"
        tabindex="0"
        role="button"
        :aria-label="`Acheter ${item.spell.name}, ${item.cost} de budget`"
        @pointerdown="gestures.press($event, { from: 'shop-spell', slot: item.slot, spell: item.spell })"
        @click="gestures.click({ from: 'shop-spell', slot: item.slot, spell: item.spell }, $event.currentTarget as Element)"
        @keydown.enter.space.prevent="gestures.click({ from: 'shop-spell', slot: item.slot, spell: item.spell }, $event.currentTarget as Element)"
        @pointerenter="inspect($event, item.card)"
        @pointerleave="cardInspector.hide()"
      >
        <ShownCardFace :card="item.card" />
        <span class="price"><GameIcon name="coin" />{{ item.cost }}</span>
      </li>
      <li
        v-if="casserole"
        :key="`${generation}-casserole-${casserole.casserole.id}`"
        class="item card"
        data-card="casserole"
        :class="{ poor: !casserole.affordable, carried: carried((i) => i.from === 'shop-casserole') }"
        :style="{ '--drop-delay': `${(minions.length + spells.length) * 70}ms` }"
        tabindex="0"
        role="button"
        :aria-label="`Acheter la casserole ${casserole.casserole.name}, ${casserole.cost} de budget`"
        @pointerdown="gestures.press($event, { from: 'shop-casserole', casserole: casserole.casserole })"
        @click="gestures.click({ from: 'shop-casserole', casserole: casserole.casserole }, $event.currentTarget as Element)"
        @keydown.enter.space.prevent="gestures.click({ from: 'shop-casserole', casserole: casserole.casserole }, $event.currentTarget as Element)"
        @pointerenter="inspect($event, casserole.card)"
        @pointerleave="cardInspector.hide()"
      >
        <ShownCardFace :card="casserole.card" />
        <span class="price"><GameIcon name="coin" />{{ casserole.cost }}</span>
      </li>
    </TransitionGroup>
    <p v-if="sending && sellHint" class="sell-hint" aria-hidden="true">
      <GameIcon name="coin" /> +{{ sellHint.now }}<small v-if="sellHint.later"> puis +{{ sellHint.later }} à la manche suivante</small>
    </p>
  </section>
</template>

<style scoped>
.shop-zone {
  --medal-w: calc(var(--s) * 150 * var(--fit, 1));
  position: absolute;
  left: calc(var(--s) * 326);
  top: calc(var(--s) * 174);
  width: calc(var(--s) * 1268);
  height: calc(var(--s) * 252);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(var(--s) * 30);
}
.shop-move { transition: transform 0.22s ease-out; }
/* Bought: gone at once (it is flying to the hand), the others slide over. */
.shop-leave-active { display: none; animation: none !important; }
.row { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: nowrap; align-items: center; gap: calc(var(--s) * 30 * var(--fit, 1)); }
.item { position: relative; cursor: pointer; touch-action: none; animation: shop-drop 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) backwards; animation-delay: var(--drop-delay); }
.item > :first-child { transition: transform 0.12s ease-out, filter 0.12s; }
.item:hover > :first-child, .item:focus-visible > :first-child { transform: translateY(calc(var(--s) * -8)) scale(1.04); }
.item:focus-visible { outline: calc(var(--s) * 4) solid var(--color-accent); outline-offset: calc(var(--s) * 6); border-radius: calc(var(--s) * 20); }
.card { width: calc(var(--s) * 140 * var(--fit, 1)); }
.card + .card, .minion + .card { margin-left: calc(var(--s) * 10); }
.card > :first-child { filter: drop-shadow(0 calc(var(--s) * 8) calc(var(--s) * 10) rgb(0 0 0 / 0.6)); }
.poor > :first-child { filter: saturate(0.35) brightness(0.75); }
.carried { opacity: 0.3; }
.price {
  position: absolute;
  left: 50%;
  top: calc(var(--s) * -18);
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 4);
  padding: calc(var(--s) * 2) calc(var(--s) * 12) calc(var(--s) * 2) calc(var(--s) * 6);
  border-radius: calc(var(--s) * 20);
  border: calc(var(--s) * 3) solid #1a1206;
  background: linear-gradient(#ffe27a, #e8a612);
  color: var(--color-ink);
  font: 400 calc(var(--s) * 30) / 1 var(--font-number);
  box-shadow: 0 calc(var(--s) * 4) calc(var(--s) * 8) rgb(0 0 0 / 0.5);
}
.price .game-icon { --icon-edge: transparent; color: #a8660a; font-size: calc(var(--s) * 26); }
.poor .price { background: linear-gradient(#c9c9c9, #8a8a8a); }
.triple > :first-child { animation: triple-glow 1.1s ease-in-out infinite; }
.triple-badge { position: absolute; left: calc(var(--s) * -8); top: calc(var(--s) * -6); color: #ffe066; font-size: calc(var(--s) * 40); filter: drop-shadow(0 0 calc(var(--s) * 8) #ffd23a); animation: spin 3s linear infinite; }

/* Frozen: frost creeps in from the edges and every medallion is iced over. */
.frost {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s;
  background:
    radial-gradient(ellipse 18% 60% at 0% 50%, rgb(200 235 255 / 0.55), transparent 70%),
    radial-gradient(ellipse 18% 60% at 100% 50%, rgb(200 235 255 / 0.55), transparent 70%),
    radial-gradient(ellipse 40% 30% at 50% 0%, rgb(200 235 255 / 0.4), transparent 70%),
    radial-gradient(ellipse 40% 30% at 50% 100%, rgb(200 235 255 / 0.4), transparent 70%),
    repeating-linear-gradient(60deg, rgb(255 255 255 / 0.08) 0 calc(var(--s) * 2), transparent calc(var(--s) * 2) calc(var(--s) * 22)),
    repeating-linear-gradient(-60deg, rgb(255 255 255 / 0.08) 0 calc(var(--s) * 2), transparent calc(var(--s) * 2) calc(var(--s) * 22)),
    rgb(120 190 255 / 0.18);
  box-shadow: inset 0 0 0 calc(var(--s) * 4) rgb(190 230 255 / 0.85), inset 0 0 calc(var(--s) * 40) rgb(170 220 255 / 0.7);
}
.frozen .frost { opacity: 1; animation: frost-in 0.5s ease-out; }
.frozen .item > :first-child { filter: saturate(0.6) brightness(1.05) hue-rotate(-10deg) drop-shadow(0 0 calc(var(--s) * 10) rgb(170 220 255 / 0.9)); }
.frozen .item::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 22%, rgb(255 255 255 / 0.9) 0 calc(var(--s) * 3), transparent calc(var(--s) * 4)),
    radial-gradient(circle at 80% 30%, rgb(255 255 255 / 0.8) 0 calc(var(--s) * 2), transparent calc(var(--s) * 3)),
    radial-gradient(circle at 70% 80%, rgb(255 255 255 / 0.8) 0 calc(var(--s) * 3), transparent calc(var(--s) * 4)),
    linear-gradient(135deg, rgb(220 245 255 / 0.4), transparent 40%, rgb(220 245 255 / 0.3) 70%, transparent);
  border-radius: 45%;
}
.sending { box-shadow: inset 0 0 0 calc(var(--s) * 4) rgb(255 200 60 / 0.9), inset 0 0 calc(var(--s) * 50) rgb(255 200 60 / 0.35); }
.sell-hint {
  position: absolute;
  right: calc(var(--s) * 24);
  top: calc(var(--s) * 14);
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 6);
  color: #ffe27a;
  font: 400 calc(var(--s) * 48) / 1 var(--font-number);
  -webkit-text-stroke: calc(var(--s) * 6) var(--color-ink);
  paint-order: stroke fill;
}
.sell-hint small { font-size: calc(var(--s) * 26); -webkit-text-stroke-width: calc(var(--s) * 4); }

/* Refreshed: a bright band wipes across the counter. */
.sweep { position: absolute; inset: 0; z-index: 2; overflow: hidden; border-radius: inherit; pointer-events: none; }
.sweep::before {
  content: '';
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: -45%;
  width: 34%;
  background: linear-gradient(100deg, transparent, rgb(255 255 255 / 0.35) 35%, rgb(255 246 200 / 0.85) 50%, rgb(255 255 255 / 0.35) 65%, transparent);
  transform: skewX(-18deg);
  animation: sweep 0.36s ease-in forwards;
}
.frost-burst { position: absolute; left: 50%; top: 50%; z-index: 2; width: 0; height: 0; pointer-events: none; }
.frost-burst::before {
  content: '';
  position: absolute;
  left: calc(var(--s) * -300);
  top: calc(var(--s) * -150);
  width: calc(var(--s) * 600);
  height: calc(var(--s) * 300);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(255 255 255 / 0.85), rgb(190 230 255 / 0.4) 40%, transparent 70%);
  opacity: 0;
  animation: frost-flash 0.4s ease-out;
}
.frost-burst .game-icon {
  position: absolute;
  left: -0.5em;
  top: -0.5em;
  color: #e6f6ff;
  font-size: calc(var(--s) * 44);
  filter: drop-shadow(0 0 calc(var(--s) * 8) rgb(150 210 255 / 0.95));
  opacity: 0;
  animation: flake 0.6s cubic-bezier(0.2, 0.7, 0.4, 1);
}
@keyframes sweep { to { left: 120%; } }
@keyframes frost-flash { 0% { opacity: 1; transform: scale(0.3); } 100% { opacity: 0; transform: scale(1.2); } }
@keyframes flake {
  0% { transform: rotate(var(--a)) translateX(0) scale(0.3); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: rotate(var(--a)) translateX(calc(var(--s) * var(--far))) rotate(160deg) scale(1); opacity: 0; }
}
@keyframes shop-drop {
  0% { transform: translateY(calc(var(--s) * -120)) rotate(-6deg); opacity: 0; }
  60% { transform: translateY(calc(var(--s) * 10)) rotate(2deg); opacity: 1; }
  80% { transform: translateY(calc(var(--s) * -4)); }
  100% { transform: none; }
}
@keyframes triple-glow { 50% { filter: drop-shadow(0 0 calc(var(--s) * 18) #ffd23a) brightness(1.15); } }
@keyframes spin { to { rotate: 360deg; } }
@keyframes frost-in { from { clip-path: inset(0 50% 0 50% round calc(var(--s) * 30)); } to { clip-path: inset(0 0 0 0 round calc(var(--s) * 30)); } }
@media (prefers-reduced-motion: reduce) {
  .item, .triple > :first-child, .triple-badge { animation: none; }
  .sweep, .frost-burst { display: none; }
}
</style>
