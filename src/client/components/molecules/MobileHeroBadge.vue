<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { splitPolls } from '#src/client/tools/splitPolls.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';

/**
 * A hero in a phone's combat: its head and its polls beside it, sized by --badge-size on a parent. `ghost`: the ghost
 * of an odd table, wearing this hero's face, faded, without polls.
 */
const props = withDefaults(defineProps<{ heroId: string; hp: number; startHp: number; ghost?: boolean }>(), { ghost: false });

const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.heroId, 'civile'));
const polls = computed(() => splitPolls(props.hp, props.startHp));
const label = computed(() => (props.ghost ? `Le fantôme de ${HERO_BY_ID[props.heroId]?.name ?? 'personne'}` : `${polls.value.polls} sondages`));
</script>

<template>
  <span class="badge" :class="{ ghost }" :aria-label="label">
    <HeadPortrait class="face" :puppet="puppet" />
    <span v-if="!ghost" class="counts">
      <span class="count health"><GameIcon name="heart" />{{ polls.polls }}</span>
      <span v-if="polls.electoralBase > 0" class="count base"><GameIcon name="shield" />{{ polls.electoralBase }}</span>
    </span>
  </span>
</template>

<style scoped>
.badge { display: inline-flex; align-items: center; gap: 0.3rem; }
.face { --portrait-size: var(--badge-size, 56px); flex: none; border: 3px solid #9aa3b4; border-radius: 50%; background: #1b2240; }
.ghost .face { opacity: 0.6; filter: grayscale(1); }
.counts { display: flex; flex-direction: column; gap: 2px; }
.count { display: inline-flex; align-items: center; gap: 0.15em; padding: 0 0.45em; border-radius: 999px; border: 2px solid #e8ecf2; color: #fff; font: 400 1.15rem / 1.25 var(--font-number); letter-spacing: 1px; text-shadow: 0 2px 0 rgb(0 0 0 / 0.6); }
.health { background: #a8132a; }
.base { background: #24406e; }
</style>
