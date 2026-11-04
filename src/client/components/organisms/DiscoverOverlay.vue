<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CardGlossary from '#src/client/components/molecules/CardGlossary.vue';
import { playSound } from '#src/client/services/soundEffects.ts';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import { SPELL_BY_ID } from '#src/data/sorts.ts';
import { makeMinion } from '#src/engine/minion.ts';

/** A real choice: three big cards in the middle of a darkened table. One click takes one; nothing to close. */
const props = defineProps<{ choices: string[]; kind: 'serviteur' | 'sort' | null }>();
const emit = defineEmits<{ choose: [index: number] }>();

const chosen = ref<number | null>(null);
const hovered = ref<number | null>(null);
const cards = computed(() => props.choices.map((id): ShownCard | null => {
  if (props.kind === 'sort') return SPELL_BY_ID[id] ? { kind: 'spell', spell: SPELL_BY_ID[id] } : null;
  const card = CARD_BY_ID[id];
  if (!card) return null;
  const { cardId, name, camp, tier, atk, hp, keywords, effects, golden } = makeMinion(card, -1);
  return { kind: 'minion', face: { cardId, name, camp, tier, atk, hp, keywords, effects, golden } };
}));

function choose(index: number): void {
  if (chosen.value !== null) return;
  chosen.value = index;
  playSound('buy');
  emit('choose', index);
}

onMounted(() => playSound('discover'));
</script>

<template>
  <div class="discover" role="dialog" aria-modal="true" aria-label="Découvrez : choisissez une carte">
    <p class="title" aria-hidden="true">Découvrez !</p>
    <ol class="choices">
      <li v-for="(card, index) in cards" :key="`${choices[index]}-${index}`" class="choice" :class="{ chosen: chosen === index, gone: chosen !== null && chosen !== index }" :style="{ '--i': index }">
        <button v-if="card" type="button" class="pick" @click="choose(index)" @pointerenter="hovered = index" @pointerleave="hovered = null">
          <ShownCardFace :card="card" />
        </button>
        <CardGlossary v-if="card && hovered === index" class="glossary" :card="card" />
      </li>
    </ol>
  </div>
</template>

<style scoped>
.discover {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--s) * 56);
  background: radial-gradient(ellipse at 50% 50%, rgb(20 26 50 / 0.8), rgb(3 5 12 / 0.94));
  animation: darken 0.25s ease-out;
}
.title {
  color: #ffe27a;
  font: 400 calc(var(--s) * 86) / 1 var(--font-number);
  letter-spacing: calc(var(--s) * 3);
  -webkit-text-stroke: calc(var(--s) * 9) var(--color-ink);
  paint-order: stroke fill;
  rotate: -3deg;
  animation: title-in 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.choices { list-style: none; margin: 0; padding: 0; display: flex; align-items: flex-start; gap: calc(var(--s) * 50); }
.choice { position: relative; width: calc(var(--s) * 420); animation: card-in 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) backwards; animation-delay: calc(var(--i) * 0.09s); rotate: calc((var(--i) - 1) * 4deg); translate: 0 calc(var(--s) * (var(--i) - 1) * (var(--i) - 1) * 24); }
.pick { display: block; width: 100%; padding: 0; background: none; border: none; cursor: pointer; transition: transform 0.14s ease-out, filter 0.14s; filter: drop-shadow(0 calc(var(--s) * 20) calc(var(--s) * 30) rgb(0 0 0 / 0.7)); }
.pick:hover, .pick:focus-visible { transform: translateY(calc(var(--s) * -24)) scale(1.05); filter: drop-shadow(0 0 calc(var(--s) * 30) rgb(255 220 90 / 0.9)); }
.glossary { position: absolute; left: 0; right: 0; top: calc(100% + var(--s) * 10); }
.chosen .pick { animation: picked 0.4s ease-in forwards; }
.gone { opacity: 0; transition: opacity 0.25s; }
@keyframes darken { from { opacity: 0; } }
@keyframes title-in { from { transform: scale(0.2); opacity: 0; } }
@keyframes card-in { from { transform: translateY(calc(var(--s) * 400)) rotate(20deg) scale(0.6); opacity: 0; } }
@keyframes picked { to { transform: translateY(calc(var(--s) * 300)) scale(0.5); opacity: 0; } }
</style>
