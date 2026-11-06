<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import { playVoice } from '#src/client/services/soundEffects.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { boldGlossaryTerms, glossaryFor } from '#src/client/tools/glossaryFor.ts';
import { heroQuotes } from '#src/client/tools/heroQuotes.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { splitPolls } from '#src/client/tools/splitPolls.ts';
import { voixPourPhrase } from '#src/data/trouverVoix.ts';
import type { Hero } from '#src/engine/types.ts';

/** A hero to choose on a phone, on one row: its face, its power and what its words mean, its polls. One touch chooses. */
const props = defineProps<{ hero: Hero; startHp: number }>();
const emit = defineEmits<{ choose: [] }>();

const split = computed(() => splitPolls(props.startHp + props.hero.hpBonus, props.startHp));
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.hero.id, 'civile'));
const desc = computed(() => boldGlossaryTerms(props.hero.desc));
const glossary = computed(() => glossaryFor([desc.value]));

/** Chosen: it says one of its lines in its real voice, when one was recorded. */
function choose(): void {
  const id = props.hero.id;
  const voiced = heroQuotes(id).find((line) => voixPourPhrase(id, line));
  if (voiced) void playVoice(voixPourPhrase(id, voiced));
  emit('choose');
}
</script>

<template>
  <button type="button" class="hero" @click="choose">
    <HeadPortrait class="face" :puppet="puppet" />
    <span class="text">
      <strong class="name">{{ hero.name }}</strong>
      <span class="power">{{ hero.power }}</span>
      <RichText class="desc" :text="desc" />
      <span v-for="entry in glossary" :key="entry.term" class="entry"><strong>{{ entry.term }}</strong> {{ entry.rule }}</span>
      <span class="polls"><span class="hp"><GameIcon name="heart" /> {{ split.polls }}</span><span v-if="split.electoralBase" class="base"><GameIcon name="shield" /> {{ split.electoralBase }}</span></span>
    </span>
  </button>
</template>

<style scoped>
.hero { display: flex; align-items: flex-start; gap: 0.7rem; width: 100%; padding: 0.7rem; border: 3px solid rgb(255 255 255 / 0.16); border-radius: 18px; background: var(--panel-background); box-shadow: var(--panel-shadow); color: #fff; text-align: left; }
.hero:active { border-color: var(--color-frame); transform: scale(0.98); }
.face { --portrait-size: 76px; flex: none; border: 3px solid var(--color-frame); border-radius: 50%; background: #1b2240; }
.text { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.name { font: 400 1.35rem / 1.05 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 3px var(--color-ink); paint-order: stroke fill; }
.power { color: var(--color-title); font: 800 1rem / 1.1 var(--font-card-title); }
.desc { color: #d3d8e4; font-size: 0.95rem; line-height: 1.25; }
.desc :deep(strong) { color: #fff; }
.entry { color: #c9cfdc; font-size: 0.8rem; line-height: 1.2; }
.entry strong { color: var(--color-accent); }
.polls { display: flex; gap: 0.4rem; margin-top: 0.2rem; font: 400 1.1rem / 1 var(--font-number); }
.hp, .base { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.1rem 0.5rem; border-radius: 999px; border: 2px solid #e8ecf2; }
.hp { background: #a8132a; }
.base { background: #24406e; }
</style>
