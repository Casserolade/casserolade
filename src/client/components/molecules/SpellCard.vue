<script setup lang="ts">
import { computed } from 'vue';
import CasseroleArt from '#src/client/components/atoms/CasseroleArt.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import { DEFAULT_SPELL_ART, SPELL_ART } from '#src/client/const/spellArt.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cardFaceStyle } from '#src/client/tools/cardFaceStyle.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { fittedNameSize } from '#src/client/tools/fittedNameSize.ts';
import { fittedRulesSize } from '#src/client/tools/fittedRulesSize.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { casseroleCardLines, spellCardLines } from '#src/client/tools/spellCardLines.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import type { Casserole, Spell } from '#src/engine/types.ts';

const CASSEROLE_COLORS = { affaire: '#8c2a1e', ridicule: '#c86a12' } as const;

/** A card that is not a minion: a spell, a pile of Tracts, an Investiture, a casserole. Same frame as the minions. */
const props = withDefaults(defineProps<{
  spell?: Spell | null;
  casserole?: Casserole | null;
  /** A pile of Tracts. */
  count?: number;
  /** The tier an Investiture was fixed at. */
  tier?: number;
  tract?: { atk: number; hp: number };
}>(), { spell: null, casserole: null, count: 1, tier: undefined, tract: undefined });

const art = computed(() => (props.spell ? (SPELL_ART[props.spell.id] ?? DEFAULT_SPELL_ART) : DEFAULT_SPELL_ART));
const color = computed(() => (props.casserole ? CASSEROLE_COLORS[props.casserole.kind] : art.value.color));
const owner = computed(() => (props.casserole ? CARD_BY_ID[props.casserole.owner] : null));
const frameTier = computed(() => props.spell?.tier ?? owner.value?.tier ?? 1);
const faceStyle = computed(() => ({
  ...cardFaceStyle(gameArt.manifest.value, 'civile', frameTier.value, props.spell?.id === 'investiture'),
  '--camp-color': color.value,
}));
const panImage = computed(() => (props.casserole ? cssImage(gameArt.manifest.value.carte[`casserole_${props.casserole.kind}`]) : 'none'));
const illustration = computed(() => (props.casserole ? cssImage(gameArt.manifest.value.casseroles?.[props.casserole.id]) : 'none'));
const ownerPuppet = computed(() => (owner.value ? puppetStyle(gameArt.manifest.value, owner.value.id, owner.value.camp) : null));
const name = computed(() => props.casserole?.name ?? props.spell?.name ?? '');
const lines = computed(() => {
  if (props.casserole) return casseroleCardLines(props.casserole);
  return props.spell ? spellCardLines(props.spell, { tier: props.tier, tract: props.tract }) : [];
});
const nameSize = computed(() => fittedNameSize(name.value));
const rulesSize = computed(() => fittedRulesSize(lines.value));
</script>

<template>
  <span class="face" :class="{ casserole: Boolean(casserole) }" :style="faceStyle">
    <span class="art">
      <span class="burst" />
      <CasseroleArt v-if="casserole" :illustration="illustration" :pan-image="panImage" :owner-puppet="ownerPuppet" :owner-name="owner?.name ?? ''" />
      <span v-else-if="spell?.id === 'investiture' && tier" class="big-tier"><GameIcon name="crown" /><span>{{ tier }}</span></span>
      <GameIcon v-else class="big-icon" :name="art.icon" />
    </span>
    <span class="frame" />
    <span class="ribbon" />
    <strong class="name" :style="{ '--name-size': nameSize }">{{ name }}</strong>
    <span class="rules" :style="{ '--rules-size': rulesSize }">
      <RichText v-for="line in lines" :key="line" :text="line" />
    </span>
    <span class="kind">{{ casserole ? (casserole.kind === 'affaire' ? 'Affaire' : 'Ridicule') : 'Sort' }}</span>
    <span v-if="count > 1" class="count">×{{ count }}</span>
  </span>
</template>

<style scoped>
.face {
  --u: calc(100cqw / 512);
  display: block;
  position: relative;
  width: 100%;
  aspect-ratio: 512 / 732;
  border-radius: calc(var(--u) * 26);
  color: var(--color-ink);
  font-family: var(--font-card);
  line-height: 1.1;
  text-shadow: none;
}
.face > * { position: absolute; display: block; }
.art {
  left: calc(var(--u) * 30);
  top: calc(var(--u) * 30);
  width: calc(var(--u) * 452);
  height: calc(var(--u) * 426);
  overflow: hidden;
  background: radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--camp-color) 55%, #fff), var(--camp-color) 45%, color-mix(in srgb, var(--camp-color) 55%, #000));
}
.burst {
  position: absolute;
  inset: -30%;
  background: repeating-conic-gradient(from 0deg at 50% 50%, rgb(255 255 255 / 0.2) 0 6deg, transparent 6deg 15deg);
  will-change: transform;
  animation: burst-turn 24s linear infinite;
}
.big-icon {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -52%;
  font-size: calc(var(--u) * 250);
  color: #fff8e6;
  --icon-edge: rgb(20 14 6 / 0.9);
  filter: drop-shadow(0 calc(var(--u) * 10) calc(var(--u) * 12) rgb(0 0 0 / 0.45));
}
.big-tier {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff8e6;
  font: 400 calc(var(--u) * 170) / 0.9 var(--font-number);
  -webkit-text-stroke: calc(var(--u) * 12) var(--color-ink);
  paint-order: stroke fill;
}
.big-tier .game-icon { font-size: calc(var(--u) * 140); }
.frame { inset: 0; background: var(--frame-image) center / 100% 100% no-repeat; }
.ribbon {
  left: 0;
  width: 100%;
  top: calc(var(--u) * 417);
  height: calc(var(--u) * 92);
  background: var(--camp-color);
  background-blend-mode: multiply;
  background-image: var(--ribbon-image);
  background-size: 100% 100%;
  mask: var(--ribbon-image) center / 100% 100% no-repeat;
}
.name {
  left: calc(var(--u) * 40);
  right: calc(var(--u) * 40);
  top: calc(var(--u) * 456);
  transform: translateY(-50%);
  color: #fff;
  font: 800 calc(var(--u) * var(--name-size)) / 1 var(--font-card-title);
  text-align: center;
  white-space: nowrap;
  -webkit-text-stroke: calc(var(--u) * 5) var(--color-ink);
  paint-order: stroke fill;
}
.rules {
  left: calc(var(--u) * 58);
  right: calc(var(--u) * 58);
  top: calc(var(--u) * 506);
  height: calc(var(--u) * 186);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(var(--u) * 6);
  overflow: hidden;
  font-size: calc(var(--u) * var(--rules-size));
  font-weight: 500;
  text-align: center;
}
.rules > * { display: block; }
.rules :deep(strong) { font-weight: 700; color: #6a1d08; }
.kind {
  left: calc(var(--u) * 40);
  top: calc(var(--u) * 40);
  padding: 0 calc(var(--u) * 16);
  border-radius: calc(var(--u) * 12);
  background: var(--camp-color);
  color: #fff;
  font: 800 calc(var(--u) * 28) / 1.3 var(--font-card-title);
}
.count {
  right: calc(var(--u) * 10);
  top: calc(var(--u) * 10);
  min-width: calc(var(--u) * 120);
  padding: calc(var(--u) * 6) calc(var(--u) * 18);
  border-radius: calc(var(--u) * 60);
  border: calc(var(--u) * 6) solid var(--color-ink);
  background: radial-gradient(circle at 35% 30%, #fff1a8, #f2b21c);
  color: var(--color-ink);
  font: 400 calc(var(--u) * 76) / 1 var(--font-number);
  text-align: center;
  rotate: 8deg;
}
@keyframes burst-turn { to { rotate: 360deg; } }
@media (prefers-reduced-motion: reduce) { .burst { animation: none; } }
</style>
