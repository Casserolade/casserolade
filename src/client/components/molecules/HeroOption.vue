<script setup lang="ts">
import { computed, ref } from 'vue';
import ArchPortrait from '#src/client/components/atoms/ArchPortrait.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import SpeechBubble from '#src/client/components/atoms/SpeechBubble.vue';
import { playVoice } from '#src/client/services/soundEffects.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { boldGlossaryTerms, glossaryFor } from '#src/client/tools/glossaryFor.ts';
import { heroQuotes } from '#src/client/tools/heroQuotes.ts';
import { nextQuote } from '#src/client/tools/nextQuote.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { splitPolls } from '#src/client/tools/splitPolls.ts';
import { voixPourPhrase } from '#src/data/trouverVoix.ts';
import type { Hero } from '#src/engine/types.ts';

/** A hero to choose: the face in its niche, its power, its polls. A real choice: one click. */
const props = withDefaults(defineProps<{ hero: Hero; startHp: number; as?: 'button' | 'article' }>(), { as: 'button' });

const split = computed(() => splitPolls(props.startHp + props.hero.hpBonus, props.startHp));
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.hero.id, 'civile'));
const archImage = computed(() => cssImage(gameArt.manifest.value.carte.arche));
/** Its power as the cards write theirs: the keywords in bold, and what they mean right under the card. */
const desc = computed(() => boldGlossaryTerms(props.hero.desc));
const glossary = computed(() => glossaryFor([desc.value]));
/** One of its real lines, word for word, shown when the pointer rests on it: another one each time it comes back. */
const quotes = computed(() => heroQuotes(props.hero.id));
const quote = ref<string | null>(nextQuote(quotes.value, null, Math.random()));
function rollQuote(): void {
  quote.value = nextQuote(quotes.value, quote.value, Math.random());
}

/**
 * Chosen: it says its line in its real voice, when it was recorded. If the line shown was not, the bubble
 * turns to one that was: the voice always says what the bubble shows.
 */
function sayIt(): void {
  if (props.as !== 'button') return;
  const id = props.hero.id;
  const voiced = quote.value && voixPourPhrase(id, quote.value) ? quote.value : quotes.value.find((line) => voixPourPhrase(id, line));
  if (!voiced) return;
  quote.value = voiced;
  void playVoice(voixPourPhrase(id, voiced));
}

</script>

<template>
  <component :is="as" :type="as === 'button' ? 'button' : undefined" class="hero" @pointerenter="rollQuote" @focus="rollQuote" @click="sayIt">
    <span v-if="quote" class="quote" aria-hidden="true"><SpeechBubble tail="down">{{ quote }}</SpeechBubble></span>
    <ArchPortrait class="arch" :puppet="puppet" :name="hero.name" :frame-image="archImage" hide-name />
    <strong class="name">{{ hero.name }}</strong>
    <span class="power">{{ hero.power }}</span>
    <span class="desc"><RichText :text="desc" /></span>
    <span class="polls"><span class="hp"><GameIcon name="heart" /> {{ split.polls }}</span><span v-if="split.electoralBase" class="base"><GameIcon name="shield" /> {{ split.electoralBase }}</span></span>
    <span v-if="glossary.length" class="glossary">
      <span v-for="entry in glossary" :key="entry.term" class="entry"><strong>{{ entry.term }}</strong> {{ entry.rule }}</span>
    </span>
  </component>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 17rem;
  padding: 1.2rem 1rem 1.2rem;
  border-radius: 22px;
  border: 3px solid rgb(255 255 255 / 0.16);
  background: linear-gradient(rgb(22 30 58 / 0.95), rgb(11 15 32 / 0.95));
  box-shadow: 0 16px 36px rgb(0 0 0 / 0.55);
  color: #fff;
  text-align: center;
  cursor: pointer;
  transition: transform 0.14s, border-color 0.14s, box-shadow 0.14s;
}
.hero:hover, .hero:focus-visible { z-index: 3; transform: translateY(-8px) scale(1.03); border-color: #d8b450; box-shadow: 0 0 34px rgb(255 200 60 / 0.4), 0 20px 40px rgb(0 0 0 / 0.6); outline: none; }
.arch { --arch-width: 9rem; }
.quote { position: absolute; left: 50%; bottom: calc(100% - 1.2rem); z-index: 2; width: max-content; max-width: 19rem; translate: -50% 0; pointer-events: none; opacity: 0; transform: scale(0.6); transform-origin: 50% 100%; transition: opacity 0.12s, transform 0.18s cubic-bezier(0.3, 1.6, 0.5, 1); }
.quote :deep(.bubble) { font-size: 1rem; }
.hero:hover .quote, .hero:focus-visible .quote { opacity: 1; transform: none; }
.name { font: 400 1.7rem / 1.05 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; }
.power { color: #ffe27a; font: 800 1.2rem / 1.1 var(--font-card-title); }
.desc { color: #d3d8e4; font-size: 1.05rem; line-height: 1.25; }
.desc :deep(strong) { color: #fff; font-weight: 800; }
/* Under the card, as the glossary of a card in hand: on hover or focus, and always on a touch screen, where a tap chooses. */
.glossary { position: absolute; left: 50%; top: calc(100% + 0.6rem); z-index: 2; display: flex; flex-direction: column; gap: 0.35rem; width: 100%; padding: 0.6rem 0.8rem; translate: -50% 0; border-radius: 14px; border: 2px solid rgb(255 255 255 / 0.18); background: rgb(12 14 24 / 0.95); box-shadow: 0 10px 30px rgb(0 0 0 / 0.6); color: #e8eaf0; font: 500 0.95rem / 1.25 var(--font-card); text-align: left; pointer-events: none; opacity: 0; transition: opacity 0.12s; }
.glossary strong { display: block; color: var(--color-accent); font: 800 1rem / 1.1 var(--font-card-title); }
.hero:hover .glossary, .hero:focus-visible .glossary { opacity: 1; }
/* On a touch screen it is always shown: in the card's flow, never over the card below. */
@media (hover: none) { .glossary { position: static; translate: none; opacity: 1; box-shadow: none; } }
.polls { display: flex; gap: 0.5rem; margin-top: auto; font: 400 1.4rem / 1 var(--font-number); }
.hp, .base { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0.6rem; border-radius: 999px; border: 2px solid #e8ecf2; }
.hp { background: #a8132a; }
.base { background: #24406e; }
</style>
