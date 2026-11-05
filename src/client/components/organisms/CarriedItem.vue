<script setup lang="ts">
import { computed } from 'vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import { carrySwing } from '#src/client/stores/carrySwing.ts';
import { isMinionItem } from '#src/client/stores/useTableGestures.ts';
import type { TableGestures } from '#src/client/stores/useTableGestures.ts';
import { scandalLeft } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';

/**
 * What the player carries, under the pointer: the medallion of a politician, or the card of a spell.
 * Lifted off the table with its shadow below, it tilts with the movement, and glows with what a drop here would do.
 */
const props = defineProps<{ gestures: TableGestures; scandalThreshold: number; round: number }>();

const drag = computed(() => props.gestures.dragging.value);
const minion = computed(() => {
  const item = drag.value?.item;
  return item && isMinionItem(item) ? item.minion : null;
});
const card = computed<ShownCard | null>(() => {
  const item = drag.value?.item;
  if (item?.from === 'hand-spell') return item.card;
  if (item?.from === 'shop-spell') return { kind: 'spell', spell: item.spell };
  if (item?.from === 'shop-casserole') return { kind: 'casserole', casserole: item.casserole };
  return null;
});
const place = computed(() => {
  const point = drag.value?.point;
  return point ? { transform: `translate(${point.x}px, ${point.y}px)` } : {};
});
const tilt = computed(() => ({ rotate: `${carrySwing.angle.value.toFixed(1)}deg` }));

/** What a drop here would do: buy it, send it back, give it to an ally, or lay it down. */
const mood = computed(() => {
  const current = drag.value;
  if (!current) return null;
  const { item, aim } = current;
  if (item.from === 'shop' || item.from === 'shop-spell' || item.from === 'shop-casserole') return aim.zone === 'hand' || aim.zone === 'board' ? 'buy' : null;
  if ((item.from === 'hand' || item.from === 'board') && aim.zone === 'shop') return 'sell';
  if (props.gestures.boardPreview.value.host !== null) return 'target';
  if (item.from === 'hand' && aim.zone === 'board') return 'lay';
  return null;
});
</script>

<template>
  <div v-if="minion || card" class="carried" :style="place" aria-hidden="true">
    <div class="lift" :class="[minion ? 'medal' : 'card', mood]" :style="tilt">
      <MedallionToken
        v-if="minion"
        :card-id="minion.cardId"
        :name="minion.name"
        :camp="minion.camp"
        :atk="minion.atk"
        :hp="minion.hp"
        :keywords="minion.keywords"
        :effects="minion.effects"
        :casseroles="minion.casseroles"
        :golden="minion.golden"
        :charges="minion.charges"
        :scandal-threshold="scandalThreshold"
        :oublie="minion.oublie"
        :scandal-left="scandalLeft(minion, round)"
      />
      <ShownCardFace v-else-if="card" :card="card" />
    </div>
  </div>
</template>

<style scoped>
/* Lifted: a soft shadow far below it, which does not turn with it. */
.carried {
  --medal-w: calc(var(--s) * 150);
  position: fixed;
  z-index: 45;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  filter: drop-shadow(calc(var(--s) * 10) calc(var(--s) * 34) calc(var(--s) * 12) rgb(0 0 0 / 0.5));
}
.lift { position: absolute; transform-origin: 50% 40%; transition: scale 0.12s ease-out, filter 0.12s; animation: pick-up 0.16s ease-out; }
.medal { left: calc(var(--s) * -75); top: calc(var(--s) * -80); scale: 1.12; }
.card { left: calc(var(--s) * -80); top: calc(var(--s) * -70); width: calc(var(--s) * 160); scale: 1.04; }
/* Over the hand or the board, from the shop: it is bought. */
.buy { filter: drop-shadow(0 0 calc(var(--s) * 14) #7dff9e) drop-shadow(0 0 calc(var(--s) * 4) #fff); }
/* Over the shop: sent back, for coins. */
.sell { scale: 0.92; filter: drop-shadow(0 0 calc(var(--s) * 16) #ffc83a) sepia(0.35) saturate(1.3); }
/* Over the ally it is for: it gets smaller, ready to go in. */
.target { scale: 0.82; filter: drop-shadow(0 0 calc(var(--s) * 20) #7dff9e) brightness(1.1); }
.lay { filter: drop-shadow(0 0 calc(var(--s) * 10) rgb(255 255 255 / 0.7)); }
@keyframes pick-up { from { scale: 1; } 60% { scale: 1.2; } }
@media (prefers-reduced-motion: reduce) { .lift { animation: none; rotate: 0deg !important; } }
</style>
