<script setup lang="ts">
import { computed } from 'vue';
import CardChips from '#src/client/components/molecules/CardChips.vue';
import PaperPuppet from '#src/client/components/atoms/PaperPuppet.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import SheetSprite from '#src/client/components/atoms/SheetSprite.vue';
import { CAMP_LABELS } from '#src/client/const/campLabels.ts';
import { CARD_LAYOUT } from '#src/client/const/cardLayout.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { cardFaceStyle } from '#src/client/tools/cardFaceStyle.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { cardRuleLines } from '#src/client/tools/describeEffect.ts';
import { fittedNameSize } from '#src/client/tools/fittedNameSize.ts';
import { fittedRulesSize } from '#src/client/tools/fittedRulesSize.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { sheetSpriteStyle } from '#src/client/tools/sheetSpriteStyle.ts';
import { statTones } from '#src/client/tools/statTone.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import type { Camp, Effect, Keyword } from '#src/engine/types.ts';

/** The full card of a minion: the puppet in its window, its name, its rules with the keywords in bold. */
const props = withDefaults(
  defineProps<{
    cardId: string;
    name: string;
    camp: Camp;
    tier: number;
    atk: number;
    hp: number;
    keywords?: Keyword[];
    effects?: Effect[];
    casseroles?: string[];
    golden?: boolean;
    locked?: boolean;
    /** Copies owned, toward a triple. */
    copies?: number;
    charges?: number;
    scandalThreshold?: number;
    /** The first `oublie` casseroles are forgotten: medals now. */
    oublie?: number;
    /** Rounds of scandal left; 0 without a scandal. */
    scandalLeft?: number;
  }>(),
  { keywords: () => [], effects: () => [], casseroles: () => [], copies: 0, charges: 0, scandalThreshold: 0, oublie: 0, scandalLeft: 0 },
);

const faceStyle = computed(() => cardFaceStyle(gameArt.manifest.value, props.camp, props.tier, Boolean(props.golden)));
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.cardId, props.camp));
const shine = computed(() => {
  const art = gameArt.manifest.value.effets.dore;
  return props.golden && art ? sheetSpriteStyle(art, CARD_LAYOUT.width) : null;
});
const lines = computed(() => cardRuleLines({ keywords: props.keywords, effects: props.effects, golden: CARD_BY_ID[props.cardId]?.golden }, { isGolden: props.golden }));
/** Its casseroles: medals once forgotten, smoking while the scandal lasts. */
const casseroleList = computed(() => props.casseroles.flatMap((id, index) => {
  const casserole = CASSEROLE_BY_ID[id];
  if (!casserole) return [];
  const forgotten = index < props.oublie;
  return [{
    key: `${id}-${index}`,
    name: casserole.name,
    icon: gameArt.manifest.value.carte[`casserole_${casserole.kind}`],
    state: forgotten ? 'forgotten' : props.scandalLeft > 0 ? 'scandal' : 'dormant',
  }];
}));
const nameSize = computed(() => fittedNameSize(props.name));
const rulesSize = computed(() => {
  const all = [...lines.value, ...casseroleList.value.map((item) => item.name)];
  return fittedRulesSize(all);
});
const tones = computed(() => statTones(props.cardId, Boolean(props.golden), props.atk, props.hp));
</script>

<template>
  <span class="face" :class="{ golden }" :style="faceStyle">
    <span class="art" />
    <span class="frame" />
    <PaperPuppet :puppet="puppet" :name="name" />
    <span class="ribbon" />
    <strong class="name" :style="{ '--name-size': nameSize }">{{ name }}</strong>
    <span class="rules" :style="{ '--rules-size': rulesSize }">
      <RichText v-for="line in lines" :key="line" :text="line" />
      <span v-for="casserole in casseroleList" :key="casserole.key" class="casserole" :class="casserole.state">
        <img v-if="casserole.icon" :src="assetUrl(casserole.icon)" alt="" />{{ casserole.name }}<span v-if="casserole.state === 'forgotten'" class="sr-only"> (oubliée)</span>
      </span>
    </span>
    <span class="medal attack" :class="`tone-${tones.atk}`"><span class="sr-only">Attaque </span>{{ atk }}</span>
    <span class="medal health" :class="`tone-${tones.hp}`"><span class="sr-only">PV </span>{{ Math.max(0, hp) }}</span>
    <CardChips :tier="tier" :camp-label="CAMP_LABELS[camp]" :locked="locked" :copies="copies" :charges="charges" :scandal-threshold="scandalThreshold" :scandal-left="scandalLeft" />
    <span v-if="golden" class="sr-only">Doré</span>
    <SheetSprite v-if="shine" class="shine" :sprite="shine" />
  </span>
</template>

<style scoped>
/* --u is one pixel of the 512x732 reference card, whatever size the card is shown at. */
.face {
  --u: calc(100cqw / 512);
  display: block;
  position: relative;
  width: 100%;
  aspect-ratio: 512 / 732;
  border-radius: calc(var(--u) * 26);
  background: var(--color-surface);
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
  background: var(--art-image) center / 100% 100% no-repeat var(--camp-color);
  background-blend-mode: multiply;
}
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
  height: calc(var(--u) * 176);
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
.casserole { display: flex; align-items: center; justify-content: center; gap: calc(var(--u) * 6); font-weight: 700; color: #7a2a12; }
.rules img { width: 1.1em; height: 1.1em; flex: none; }
/* Forgotten: a medal, gold and harmless. In scandal: red hot. */
.forgotten { color: #8a6410; }
.forgotten img { filter: sepia(1) saturate(4) hue-rotate(5deg) brightness(1.15); }
.scandal { color: #c8102e; }
.medal {
  width: calc(var(--u) * 118);
  height: calc(var(--u) * 118);
  top: calc(var(--u) * 642);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font: 400 calc(var(--u) * 70) / 1 var(--font-number);
  -webkit-text-stroke: calc(var(--u) * 8) var(--color-ink);
  paint-order: stroke fill;
  background-position: center;
  background-size: 100% 100%;
}
.tone-up { color: var(--color-boosted); }
.tone-down { color: #ff7b7b; }
.attack { left: calc(var(--u) * -16); background-image: var(--attack-image); }
.health { left: calc(var(--u) * 410); background-image: var(--health-image); padding-bottom: calc(var(--u) * 10); }
.shine { left: 0; top: 0; }
/* Same place as on the combat stage: on the ground, a little under the feet. */
</style>
