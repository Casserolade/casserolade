<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { splitPolls } from '#src/client/tools/splitPolls.ts';

/**
 * The bar on top of the phone's table: your hero and its polls (a touch tells its power), and the budget of the
 * round. The door to leave stands at its right end, drawn by the game's frame.
 */
const props = defineProps<{ heroId: string; hp: number; startHp: number; budget: number; maxBudget: number }>();
const emit = defineEmits<{ hero: [] }>();

const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.heroId, 'civile'));
const polls = computed(() => splitPolls(props.hp, props.startHp));
</script>

<template>
  <header class="top-bar">
    <button type="button" class="hero" :aria-label="`Votre héros : ${polls.polls} sondages. Voir son pouvoir`" @click="emit('hero')">
      <HeadPortrait class="face" :puppet="puppet" />
      <span class="count health"><GameIcon name="heart" />{{ polls.polls }}</span>
      <span v-if="polls.electoralBase > 0" class="count base"><GameIcon name="shield" />{{ polls.electoralBase }}</span>
    </button>
    <span class="budget" :aria-label="`Budget : ${budget} sur ${maxBudget}`"><GameIcon name="coin" />{{ budget }}<small>/{{ maxBudget }}</small></span>
  </header>
</template>

<style scoped>
.top-bar { display: flex; align-items: center; gap: 0.6rem; min-height: 48px; padding: 0 3.6rem 0 0.4rem; }
.hero { display: flex; align-items: center; gap: 0.35rem; padding: 0; border: 0; background: none; color: #fff; }
.face { --portrait-size: 44px; flex: none; border: 3px solid #9aa3b4; border-radius: 50%; background: #1b2240; }
.count { display: inline-flex; align-items: center; gap: 0.15em; padding: 0 0.45em; border-radius: 999px; border: 2px solid #e8ecf2; font: 400 1.15rem / 1.25 var(--font-number); letter-spacing: 1px; text-shadow: 0 2px 0 rgb(0 0 0 / 0.6); }
.health { background: #a8132a; }
.base { background: #24406e; }
.budget { display: inline-flex; align-items: baseline; gap: 0.15em; margin-left: auto; padding: 0.05em 0.6em; border-radius: 999px; border: 2px solid #1a1206; background: linear-gradient(#ffe27a, #e8a612); color: var(--color-ink); font: 400 1.35rem / 1.15 var(--font-number); }
.budget .game-icon { --icon-edge: transparent; align-self: center; color: #a8660a; }
.budget small { font-size: 0.75em; opacity: 0.75; }
</style>
