<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import CasseroleTally from '#src/client/components/atoms/CasseroleTally.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { pollsLabel } from '#src/client/tools/pollsLabel.ts';
import { splitPolls } from '#src/client/tools/splitPolls.ts';

/**
 * The bar on top of the phone's table: your hero and its polls (a touch tells its power), the casseroles laid this
 * game, and the budget of the round. `powerReady`: an activable power waits to be used, a bolt on the face says so. The
 * settings' button, which also holds the door to leave, stands at its right end, drawn by the game's frame.
 */
const props = withDefaults(
  defineProps<{ heroId: string; hp: number; startHp: number; budget: number; maxBudget: number; casseroles?: number | null; palier?: number | null; powerReady?: boolean }>(),
  { casseroles: null, palier: null, powerReady: false },
);
const emit = defineEmits<{ hero: [] }>();

const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.heroId, 'civile'));
const polls = computed(() => splitPolls(props.hp, props.startHp));
</script>

<template>
  <header class="top-bar">
    <button type="button" class="hero" :aria-label="`Votre héros : ${pollsLabel(hp, startHp)}. Voir son pouvoir`" @click="emit('hero')">
      <span class="face-spot">
        <HeadPortrait class="face" :puppet="puppet" />
        <span v-if="powerReady" class="ready" aria-label="Pouvoir prêt"><GameIcon name="bolt" /></span>
      </span>
      <span class="count health"><GameIcon name="heart" />{{ polls.polls }}</span>
      <span v-if="polls.electoralBase > 0" class="count base"><GameIcon name="shield" />{{ polls.electoralBase }}</span>
      <CasseroleTally v-if="casseroles !== null" class="tally" :count="casseroles" :goal="palier" />
    </button>
    <span class="budget" data-control="budget" :aria-label="`Budget : ${budget} sur ${maxBudget}`"><GameIcon name="coin" />{{ budget }}<small>/{{ maxBudget }}</small></span>
  </header>
</template>

<style scoped>
.top-bar { display: flex; align-items: center; gap: 0.6rem; min-height: 48px; padding: 0 3.6rem 0 0.4rem; }
.hero { display: flex; align-items: center; gap: 0.35rem; padding: 0; border: 0; background: none; color: #fff; }
.face-spot { position: relative; flex: none; }
.face { --portrait-size: 44px; flex: none; border: 3px solid #9aa3b4; border-radius: 50%; background: #1b2240; }
.ready { position: absolute; right: -6px; bottom: -4px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--color-ink); background: var(--color-title); color: var(--color-ink); font-size: 13px; animation: ready-pulse 1.4s ease-in-out infinite; }
@keyframes ready-pulse { 50% { transform: scale(1.18); } }
@media (prefers-reduced-motion: reduce) { .ready { animation: none; } }
.tally { font-size: 1.05rem; }
.count { display: inline-flex; align-items: center; gap: 0.15em; padding: 0 0.45em; border-radius: 999px; border: 2px solid #e8ecf2; font: 400 1.15rem / 1.25 var(--font-number); letter-spacing: 1px; text-shadow: 0 2px 0 rgb(0 0 0 / 0.6); }
.health { background: var(--color-polls); }
.base { background: var(--color-electoral-base); }
.budget { display: inline-flex; align-items: baseline; gap: 0.15em; margin-left: auto; padding: 0.05em 0.6em; border-radius: 999px; border: 2px solid #1a1206; background: linear-gradient(#ffe27a, #e8a612); color: var(--color-ink); font: 400 1.35rem / 1.15 var(--font-number); }
.budget .game-icon { --icon-edge: transparent; align-self: center; color: #a8660a; }
.budget small { font-size: 0.75em; opacity: 0.75; }
</style>
