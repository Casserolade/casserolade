<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import type { DropGuide } from '#src/client/tools/dropGuideFor.ts';
import { dropGuideLabel } from '#src/client/tools/dropGuideLabel.ts';

/**
 * The counter line, while something is carried: the shop side above it, your side below. Its tag says what
 * a drop on the other side does (buy, sell) and for how much, and lights up once the pointer has crossed.
 */
const props = defineProps<{ guide: DropGuide }>();

const label = computed(() => dropGuideLabel(props.guide));
const amount = computed(() => (props.guide.mode === 'sell' ? `+${props.guide.amount}` : `${props.guide.amount}`));
</script>

<template>
  <div class="drop-line" :class="[guide.mode, { armed: guide.armed, blocked: guide.blocked }]" aria-hidden="true">
    <span class="line" />
    <span class="tag">
      <GameIcon class="arrow" name="tier" />
      <span>{{ label }}</span>
      <span v-if="guide.mode !== 'play'" class="amount"><GameIcon name="coin" />{{ amount }}</span>
    </span>
  </div>
</template>

<style scoped>
.drop-line { position: absolute; z-index: 7; left: calc(var(--s) * 300); width: calc(var(--s) * 1320); top: calc(var(--s) * 440); height: 0; pointer-events: none; }
.line {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--s) * -3);
  height: calc(var(--s) * 6);
  border-radius: calc(var(--s) * 3);
  background: repeating-linear-gradient(90deg, #ffd23a 0 calc(var(--s) * 26), transparent calc(var(--s) * 26) calc(var(--s) * 40));
  opacity: 0.45;
  transition: opacity 0.12s;
}
.armed .line { opacity: 1; box-shadow: 0 0 calc(var(--s) * 18) rgb(255 210 60 / 0.8); animation: march 0.6s linear infinite; }
.tag {
  position: absolute;
  left: 50%;
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 10);
  padding: calc(var(--s) * 6) calc(var(--s) * 20);
  translate: -50% 0;
  border: calc(var(--s) * 3) solid #ffd23a;
  border-radius: calc(var(--s) * 30);
  background: rgb(12 16 32 / 0.88);
  color: #ffe27a;
  font: 400 calc(var(--s) * 34) / 1 var(--font-number);
  white-space: nowrap;
  transition: scale 0.12s, background-color 0.12s;
}
/* Buying: the tag sits on your side and points down; selling: on the shop side, and points up. */
.buy .tag { top: calc(var(--s) * 14); }
.buy .arrow { rotate: 180deg; }
.sell .tag { bottom: calc(var(--s) * 14); }
.armed .tag { scale: 1.12; background: #2a2208; }
.amount { display: flex; align-items: center; gap: calc(var(--s) * 4); color: #fff; }
/* A purchase the game would refuse: in red, said in words. */
.blocked .line { background: repeating-linear-gradient(90deg, #ff5a4a 0 calc(var(--s) * 26), transparent calc(var(--s) * 26) calc(var(--s) * 40)); }
.blocked .tag { border-color: #ff5a4a; color: #ffb3a8; background: rgb(48 8 8 / 0.92); }
@keyframes march { to { background-position: calc(var(--s) * 40) 0; } }
@media (prefers-reduced-motion: reduce) { .armed .line { animation: none; } }
</style>
