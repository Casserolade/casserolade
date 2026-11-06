<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import { playSound } from '#src/client/services/soundEffects.ts';
import { discoverCards } from '#src/client/tools/discoverCards.ts';
import { shownCardLines } from '#src/client/tools/shownCard.ts';

/**
 * A discovery on a phone: the three cards one under the other, each with its text at a reading size beside it.
 * A touch on one takes it. It is a real choice of the game: nothing to close.
 */
const props = defineProps<{ choices: string[]; kind: 'serviteur' | 'sort' | null }>();
const emit = defineEmits<{ choose: [index: number] }>();

const chosen = ref<number | null>(null);
const cards = computed(() => discoverCards(props.choices, props.kind).map((card) => (card ? { card, lines: shownCardLines(card) } : null)));

function nameOf(index: number): string {
  const card = cards.value[index]?.card;
  if (!card) return '';
  return card.kind === 'minion' ? card.face.name : card.kind === 'spell' ? card.spell.name : card.casserole.name;
}

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
      <li v-for="(entry, index) in cards" :key="`${choices[index]}-${index}`" class="choice" :class="{ chosen: chosen === index, gone: chosen !== null && chosen !== index }" :style="{ '--i': index }">
        <button v-if="entry" type="button" class="pick" :aria-label="`Prendre ${nameOf(index)}`" @click="choose(index)">
          <ShownCardFace class="face" :card="entry.card" />
          <span class="text">
            <strong class="name">{{ nameOf(index) }}</strong>
            <RichText v-for="line in entry.lines" :key="line" class="line" :text="line" />
          </span>
        </button>
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
  gap: 0.8rem;
  padding: calc(env(safe-area-inset-top) + 1rem) 0.8rem calc(env(safe-area-inset-bottom) + 1rem);
  overflow-y: auto;
  background: radial-gradient(ellipse at 50% 40%, rgb(20 26 50 / 0.9), rgb(3 5 12 / 0.96));
  animation: darken 0.25s ease-out;
}
.title { color: var(--color-title); font: 400 2.4rem / 1 var(--font-number); letter-spacing: 2px; -webkit-text-stroke: 6px var(--color-ink); paint-order: stroke fill; rotate: -3deg; }
.choices { display: flex; flex-direction: column; gap: 0.7rem; width: 100%; max-width: 30rem; margin: 0; padding: 0; list-style: none; }
.choice { animation: card-in 0.4s cubic-bezier(0.3, 1.4, 0.5, 1) backwards; animation-delay: calc(var(--i) * 0.08s); }
.pick { display: flex; align-items: center; gap: 0.8rem; width: 100%; padding: 0.5rem; border: 3px solid rgb(255 255 255 / 0.16); border-radius: 18px; background: var(--panel-background); color: var(--color-text); text-align: left; }
.pick:active { border-color: var(--color-frame); transform: scale(0.98); }
.face { width: 34%; flex: none; filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.6)); }
.text { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; font-size: 0.95rem; line-height: 1.3; }
.name { color: var(--color-title); font: 400 1.25rem / 1.1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 3px var(--color-ink); paint-order: stroke fill; }
.line :deep(strong) { color: var(--color-title); }
.chosen .pick { border-color: var(--color-frame); box-shadow: 0 0 20px rgb(255 216 74 / 0.6); }
.gone { opacity: 0.25; transition: opacity 0.2s; }
@keyframes darken { from { opacity: 0; } }
@keyframes card-in { from { transform: translateY(30px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .choice, .discover { animation: none; } }
</style>
