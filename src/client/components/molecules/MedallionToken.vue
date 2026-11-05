<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import PaperPuppet from '#src/client/components/atoms/PaperPuppet.vue';
import { playSound } from '#src/client/services/soundEffects.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { usePuppetFaces } from '#src/client/stores/usePuppetFaces.ts';
import { rememberOblivion } from '#src/client/stores/seenOblivion.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { cardFaceStyle } from '#src/client/tools/cardFaceStyle.ts';
import { medallionMarks } from '#src/client/tools/medallionMarks.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { statTones } from '#src/client/tools/statTone.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import type { Camp, Effect, Keyword } from '#src/engine/types.ts';

const POP_MS = 450;
/** The pan hits the head two thirds of the way through its fall. */
const CLANG_DELAY_MS = 360;
/** The table of a new round needs a moment to appear before anything happens on it. */
const ROUND_START_MS = 700;
/** A casserole or a scandal: its shocked face, turned round, then its own face again. */
const SHOCK_MS = 900;
/** A spell cast on it: the same jolt, a little longer, to be seen. */
const SPELL_SHOCK_MS = SHOCK_MS + 700;

/**
 * A minion on the table: an oval portrait, attack bottom left, health bottom right, nothing to read.
 * Its keywords show as shapes around it; small icons say what its card hides. The card comes up on hover.
 * Sized by --medal-w on a parent: everything inside is in 1/150 of it.
 */
const props = withDefaults(defineProps<{
  cardId: string;
  name: string;
  camp: Camp;
  tier?: number;
  /** The shop shows the tier as a tavern does: a pennant with one star per tier. */
  showTier?: boolean;
  atk: number;
  hp: number;
  keywords?: Keyword[];
  effects?: Effect[];
  casseroles?: string[];
  golden?: boolean;
  locked?: boolean;
  /** Under the Bracelet électronique: neither moved nor sold until the next round. */
  bracelet?: boolean;
  charges?: number;
  scandalThreshold?: number;
  /** The first `oublie` casseroles are forgotten: they hang as medals. */
  oublie?: number;
  /** Rounds of scandal left; 0 without a scandal. */
  scandalLeft?: number;
  /** Shown without its hanging casseroles and icons: the shop. */
  bare?: boolean;
  /** A minion of the board: it remembers what the people had forgotten, to show it when it happens between two rounds. */
  boardUid?: number;
  /** False when another one would answer a defeat in its place: its bubble goes dim. */
  answers?: boolean;
  /** How many spells it has received: at each new one, its face jolts. */
  jolts?: number;
}>(), { keywords: () => [], effects: () => [], casseroles: () => [], charges: 0, scandalThreshold: 0, oublie: 0, scandalLeft: 0, answers: true, jolts: 0 });

const has = (keyword: Keyword) => props.keywords.includes(keyword);
const style = computed(() => {
  const manifest = gameArt.manifest.value;
  const face = cardFaceStyle(manifest, props.camp, 1, Boolean(props.golden));
  return { '--camp-color': face['--camp-color'], '--attack-image': face['--attack-image'], '--health-image': face['--health-image'] };
});
const faces = usePuppetFaces();
const inScandal = computed(() => props.scandalLeft > 0);
const puppet = computed(() => {
  const manifest = gameArt.manifest.value;
  // In a scandal, it keeps its shocked face until the people forget.
  return puppetStyle(manifest, props.cardId, props.camp, faces.face.value ?? (inScandal.value ? 'choc' : null));
});
const tones = computed(() => statTones(props.cardId, Boolean(props.golden), props.atk, props.hp));
const marks = computed(() => medallionMarks(props.effects));
/** Stars per row on the tier pennant, as in a tavern: 1, 2 or 3 on one row, then 2 + 2, 3 + 2 and 3 + 3. */
const tierColumns = computed(() => ((props.tier ?? 0) <= 3 ? props.tier : Math.ceil((props.tier ?? 0) / 2)));
const hasMarks = computed(() => !props.bare && (marks.value.heritage || marks.value.triggered || marks.value.revanche !== null || marks.value.celebration || marks.value.reponse || props.locked));
/** Forgotten casseroles hang as medals; the others smoke while the scandal lasts. */
const pans = computed(() =>
  props.bare
    ? []
    : props.casseroles.map((id, index) => ({
        key: `${id}-${index}`,
        image: gameArt.manifest.value.carte[`casserole_${CASSEROLE_BY_ID[id]?.kind ?? 'affaire'}`],
        medal: index < props.oublie,
      })),
);
const porteParoleIcon = computed(() => gameArt.manifest.value.carte.mot_cle_porte_parole);

/** A number that changes pops, so that a gain is seen. */
const popAtk = ref(false);
const popHp = ref(false);
function pop(flag: typeof popAtk): void {
  flag.value = false;
  requestAnimationFrame(() => {
    flag.value = true;
    window.setTimeout(() => (flag.value = false), POP_MS);
  });
}
watch(() => props.atk, () => pop(popAtk));
watch(() => props.hp, () => pop(popHp));

/** A casserole lands: it falls from the ceiling onto the medallion, with a clang. */
const clang = ref(0);
watch(() => props.casseroles.length, (count, before) => {
  if (props.bare || count <= before) return;
  clang.value++;
  faces.show('choc', SHOCK_MS);
  window.setTimeout(() => playSound('clang'), CLANG_DELAY_MS);
});

/** A scandal breaks out: a puff of smoke, and the red stamp slams down. */
const puff = ref(0);
watch(inScandal, (now, before) => {
  if (props.bare || !now || before) return;
  puff.value++;
  faces.show('choc', SHOCK_MS);
  playSound('scandal');
});

/** A spell lands on it: the same jolt. */
watch(() => props.jolts, (count, before) => {
  if (!props.bare && count > before) faces.show('choc', SPELL_SHOCK_MS);
});

/** The people forget: the pans flip into gold medals, with a sparkle. Only the ones just forgotten. */
const minted = ref<{ from: number; to: number; key: number } | null>(null);
function mint(from: number, to: number): void {
  minted.value = { from, to, key: (minted.value?.key ?? 0) + 1 };
  playSound('forget');
}
const isRemembered = () => !props.bare && props.boardUid !== undefined && props.boardUid >= 0;
watch(() => props.oublie, (count, before) => {
  if (isRemembered()) rememberOblivion(props.boardUid as number, count);
  if (!props.bare && count > before) mint(before, count);
});
/** Forgotten at the start of the round, as the table came back: shown once the table is there. */
let mintTimer = 0;
onMounted(() => {
  if (!isRemembered()) return;
  const before = rememberOblivion(props.boardUid as number, props.oublie);
  if (before !== null && props.oublie > before) mintTimer = window.setTimeout(() => mint(before, props.oublie), ROUND_START_MS);
});
onUnmounted(() => window.clearTimeout(mintTimer));
const isMinted = (index: number) => minted.value !== null && index >= minted.value.from && index < minted.value.to;
</script>

<template>
  <span
    class="medallion"
    :class="{
      golden,
      'is-immune': has('immunite'),
      'is-taunt': has('porte_parole'),
      'is-reborn': has('retour'),
      'is-toxic': has('polemique'),
      'is-windfury': has('cumul'),
      'is-star': has('vedette'),
      'is-both': has('ni_droite_ni_gauche'),
      'is-scandal': inScandal,
      'with-tier': showTier && tier,
    }"
    :style="style"
  >
    <span v-if="has('porte_parole')" class="lectern" aria-hidden="true">
      <img v-if="porteParoleIcon" class="lectern-mic" :src="assetUrl(porteParoleIcon)" alt="" />
    </span>
    <span v-if="has('retour')" class="halo" aria-hidden="true" />
    <span class="ring" />
    <span v-if="showTier && tier" class="tier" role="img" :aria-label="`Échelon ${tier}`" :style="{ '--cols': tierColumns }"><GameIcon v-for="n in tier" :key="n" name="star" /></span>
    <span class="oval">
      <span class="rays" />
      <span class="figure" :class="{ turned: faces.turned.value }"><PaperPuppet :puppet="puppet" :name="name" /></span>
      <span v-if="golden" class="sheen" />
    </span>
    <span v-if="has('polemique')" class="slime" aria-hidden="true"><i /><i /><i /></span>
    <template v-if="golden">
      <span class="beads" aria-hidden="true" />
      <span class="twinkles" aria-hidden="true"><GameIcon v-for="n in 3" :key="n" name="sparkle" :style="{ '--k': n }" /></span>
      <span class="crown" aria-hidden="true"><GameIcon name="crown" /></span>
    </template>
    <span v-if="has('immunite')" class="bubble" aria-hidden="true"><span class="glint" /></span>
    <template v-if="has('cumul')"><span class="sash one" aria-hidden="true" /><span class="sash two" aria-hidden="true" /></template>
    <span v-if="has('retour')" class="comeback" aria-hidden="true"><GameIcon name="comeback" /></span>
    <span v-if="has('vedette')" class="star" aria-hidden="true"><GameIcon name="star" /></span>
    <span v-if="hasMarks" class="marks" aria-hidden="true">
      <GameIcon v-if="marks.heritage" class="mark skull" name="skull" />
      <GameIcon v-if="marks.triggered" class="mark bolt" name="bolt" />
      <span v-if="marks.revanche !== null" class="mark revanche"><GameIcon name="sword" />{{ marks.revanche }}</span>
      <GameIcon v-if="marks.celebration" class="mark confetti" name="confetti" />
      <GameIcon v-if="marks.reponse" class="mark answer" :class="{ idle: !answers }" name="speech" />
      <GameIcon v-if="locked" class="mark lock" :name="bracelet ? 'bracelet' : 'lock'" />
    </span>
    <span class="stat atk" :class="[`tone-${tones.atk}`, { pop: popAtk }]"><span class="sr-only">Attaque </span>{{ atk }}</span>
    <span class="stat hp" :class="[`tone-${tones.hp}`, { pop: popHp }]"><span class="sr-only">PV </span>{{ Math.max(0, hp) }}</span>
    <TransitionGroup v-if="pans.length" tag="span" name="pan-drop" class="pans" aria-label="Casseroles">
      <span
        v-for="(pan, index) in pans"
        :key="pan.key"
        class="pan"
        :class="{ medal: pan.medal, smoking: inScandal && !pan.medal, minted: pan.medal && isMinted(index) }"
        :style="{ '--pan-index': index }"
      >
        <img v-if="pan.image" :key="pan.medal && isMinted(index) ? `minted-${minted?.key}` : 'pan'" :src="assetUrl(pan.image)" alt="" />
        <span v-if="pan.medal && isMinted(index)" :key="`glint-${minted?.key}`" class="glint" aria-hidden="true" />
      </span>
      <span v-if="!inScandal && charges > 0" key="rumor" class="rumor">{{ charges }}/{{ scandalThreshold }}</span>
    </TransitionGroup>
    <span v-if="clang" :key="clang" class="clang" aria-hidden="true">Clang !</span>
    <span v-if="inScandal" class="scandal">Scandale<b>{{ scandalLeft }}</b></span>
    <span v-if="puff" :key="`puff-${puff}`" class="puff" aria-hidden="true"><i /><i /><i /><i /><i /></span>
    <span v-if="minted" :key="`oubli-${minted.key}`" class="oubli" aria-hidden="true"><GameIcon v-for="index in 5" :key="index" name="sparkle" :style="{ '--k': index }" /></span>
  </span>
</template>

<style scoped>
.medallion {
  --mu: calc(var(--medal-w, 150px) / 150);
  position: relative;
  display: block;
  width: calc(var(--mu) * 150);
  height: calc(var(--mu) * 180);
  color: var(--color-text);
  font-family: var(--font-card);
  text-shadow: none;
}
.medallion > * { position: absolute; display: block; }

/* The frame: a metal oval, gold for a golden minion, split in two colors when it is of every side. */
.ring {
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(160deg, #f4f6fa, #9aa3b4 30%, #4a5264 52%, #c3c9d4 74%, #6b7385);
  box-shadow: 0 calc(var(--mu) * 10) calc(var(--mu) * 16) rgb(0 0 0 / 0.6), inset 0 0 0 calc(var(--mu) * 1.5) rgb(0 0 0 / 0.55);
}
/* Doré, as plain as in Battlegrounds: a thick gold frame strung with beads, a crown, sparkles, and a warm glow. */
.golden .ring {
  inset: calc(var(--mu) * -5);
  background: linear-gradient(160deg, #fff6c4, #f2c230 22%, #9a6a08 46%, #ffe27a 66%, #c08a14 84%, #fff0a0);
  box-shadow: 0 0 calc(var(--mu) * 22) calc(var(--mu) * 4) rgb(255 200 40 / 0.75), inset 0 0 0 calc(var(--mu) * 2) #6a4400, 0 calc(var(--mu) * 10) calc(var(--mu) * 16) rgb(0 0 0 / 0.6);
  animation: gold-glow 2.6s ease-in-out infinite;
}
.golden .oval { inset: calc(var(--mu) * 9); box-shadow: inset 0 0 0 calc(var(--mu) * 3) #6a4400, inset 0 calc(var(--mu) * -12) calc(var(--mu) * 18) rgb(0 0 0 / 0.45); }
.beads {
  inset: calc(var(--mu) * -1);
  border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, #fffbe0 0 2.5deg, transparent 2.5deg 12deg);
  mask: radial-gradient(farthest-side, transparent calc(100% - var(--mu) * 5), #000 calc(100% - var(--mu) * 4.5), #000 calc(100% - var(--mu) * 2), transparent calc(100% - var(--mu) * 1.5));
  opacity: 0.9;
  pointer-events: none;
}
.crown {
  right: calc(var(--mu) * -10);
  top: calc(var(--mu) * -6);
  z-index: 2;
  rotate: 22deg;
  color: #ffd84a;
  font-size: calc(var(--mu) * 40);
  filter: drop-shadow(0 0 calc(var(--mu) * 6) rgb(255 210 60 / 0.9));
  --icon-edge: #5a3a00;
}
.twinkles { inset: calc(var(--mu) * -16); pointer-events: none; }
.twinkles > * { position: absolute; color: #fff6c4; font-size: calc(var(--mu) * 18); animation: twinkle 1.8s ease-in-out infinite; animation-delay: calc(var(--k) * -0.6s); filter: drop-shadow(0 0 calc(var(--mu) * 4) #ffd84a); }
.twinkles > :nth-child(1) { left: 2%; top: 30%; }
.twinkles > :nth-child(2) { right: 4%; top: 62%; }
.twinkles > :nth-child(3) { left: 14%; bottom: 6%; }
.is-both .ring { background: linear-gradient(90deg, #e2424f 0 50%, #2e64d8 50% 100%); }
.oval {
  inset: calc(var(--mu) * 7);
  border-radius: 50%;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 38%, color-mix(in srgb, var(--camp-color) 50%, #fff) 0%, var(--camp-color) 48%, color-mix(in srgb, var(--camp-color) 45%, #000) 100%);
  box-shadow: inset 0 calc(var(--mu) * -12) calc(var(--mu) * 18) rgb(0 0 0 / 0.45);
}
.is-both .oval { background: linear-gradient(90deg, #b8303c 0 50%, #234ea8 50% 100%); }
.rays { position: absolute; inset: -20%; background: repeating-conic-gradient(from 0deg at 50% 45%, rgb(255 255 255 / 0.1) 0 8deg, transparent 8deg 20deg); }
/* The puppet, in card units: head and shoulders fill the oval, super deformed. */
.figure {
  --u: calc(var(--mu) * 0.44);
  position: absolute;
  left: calc(var(--u) * -100);
  top: calc(var(--u) * -42);
  width: calc(var(--u) * 512);
  height: calc(var(--u) * 732);
}
/* Turned round at once, like a slapped cut-out: no transition, the jerk is the joke. */
.figure.turned { scale: -1 1; }
.sheen { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 42%, rgb(255 240 180 / 0.32) 50%, transparent 58%); background-size: 300% 100%; animation: sheen 3.6s ease-in-out infinite; mix-blend-mode: screen; }

/* Immunité, the divine shield of Battlegrounds: a bright bubble over the whole medallion, its rim and its gleam. */
.bubble {
  inset: calc(var(--mu) * -15);
  border-radius: 50%;
  border: calc(var(--mu) * 4) solid rgb(255 250 210 / 0.95);
  background:
    radial-gradient(ellipse 34% 20% at 32% 17%, rgb(255 255 255 / 0.95), transparent 70%),
    radial-gradient(ellipse at 50% 50%, rgb(255 248 200 / 0.16) 40%, rgb(255 226 110 / 0.42) 78%, rgb(255 214 80 / 0.7) 100%);
  box-shadow: 0 0 calc(var(--mu) * 16) calc(var(--mu) * 3) rgb(255 220 90 / 0.85), inset 0 0 calc(var(--mu) * 16) rgb(255 240 170 / 0.8);
  animation: bubble-breathe 2.4s ease-in-out infinite;
  pointer-events: none;
}
.bubble .glint { position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(115deg, transparent 40%, rgb(255 255 255 / 0.55) 48%, transparent 56%); background-size: 300% 100%; animation: sheen 2.8s ease-in-out infinite; }
/* Porte-parole: a lectern shaped like a shield, behind it, with its microphone. */
.lectern {
  left: calc(var(--mu) * -20);
  right: calc(var(--mu) * -20);
  top: calc(var(--mu) * -14);
  bottom: calc(var(--mu) * -30);
  clip-path: polygon(50% 0, 100% 9%, 100% 52%, 50% 100%, 0 52%, 0 9%);
  background:
    linear-gradient(160deg, rgb(255 255 255 / 0.35), transparent 40%),
    linear-gradient(#b9bfca, #4f5768 60%, #2a2f3a);
}
.lectern::after { content: ''; position: absolute; inset: calc(var(--mu) * 7); clip-path: inherit; background: linear-gradient(#5a3a9a, #2a1a52); }
.lectern-mic { position: absolute; z-index: 1; left: 50%; top: calc(var(--mu) * 1); width: calc(var(--mu) * 34); translate: -50% 0; }
.is-taunt .ring { box-shadow: 0 calc(var(--mu) * 6) calc(var(--mu) * 10) rgb(0 0 0 / 0.6); }
/* Retour en politique: a blue halo around the frame. */
.halo {
  inset: calc(var(--mu) * -12);
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 50%, transparent 54%, rgb(90 180 255 / 0.55) 66%, rgb(90 180 255 / 0) 76%);
  animation: halo-pulse 2.2s ease-in-out infinite;
}
/* Retour en politique: a « comes back once » arrow badge (a ghost floating over the head read as a blue blob). */
.comeback {
  left: calc(var(--mu) * -8);
  top: calc(var(--mu) * 2);
  width: calc(var(--mu) * 40);
  height: calc(var(--mu) * 40);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: calc(var(--mu) * 3) solid #0c2a55;
  background: radial-gradient(circle at 40% 35%, #8fd0ff, #2a7fe0 70%);
  color: #fff;
  font-size: calc(var(--mu) * 24);
  box-shadow: 0 0 calc(var(--mu) * 10) rgb(120 200 255 / 0.9);
  --icon-edge: #0c2a55;
}
/* Polémique: green slime dripping from the frame. */
.is-toxic .ring { box-shadow: 0 0 calc(var(--mu) * 22) calc(var(--mu) * 6) rgb(120 255 60 / 0.8), 0 calc(var(--mu) * 10) calc(var(--mu) * 16) rgb(0 0 0 / 0.6); }
.slime { left: calc(var(--mu) * 30); right: calc(var(--mu) * 30); bottom: calc(var(--mu) * 8); height: calc(var(--mu) * 40); pointer-events: none; }
.slime i {
  position: absolute;
  top: 0;
  width: calc(var(--mu) * 17);
  height: calc(var(--mu) * 34);
  border-radius: 40% 40% 50% 50% / 30% 30% 70% 70%;
  background: radial-gradient(circle at 35% 30%, #d6ff8a, #57d11c 45%, #2a8a10);
  box-shadow: 0 0 calc(var(--mu) * 6) rgb(120 255 60 / 0.8);
  transform-origin: 50% 0;
  animation: drip 1.9s ease-in infinite;
}
.slime i:nth-child(1) { left: 8%; animation-delay: -0.4s; }
.slime i:nth-child(2) { left: 45%; height: calc(var(--mu) * 44); animation-delay: -1.1s; }
.slime i:nth-child(3) { left: 78%; animation-delay: -1.6s; }
/* Cumul des mandats: two tricolor sashes whirling around it, like a gust of wind. */
.sash {
  will-change: transform;
  inset: calc(var(--mu) * -14);
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0 230deg, #2a55d6 230deg 268deg, #f4f4f4 268deg 300deg, #e03a3a 300deg 338deg, transparent 338deg);
  mask: radial-gradient(farthest-side, transparent calc(100% - var(--mu) * 7), #000 calc(100% - var(--mu) * 6), #000 calc(100% - var(--mu) * 1), transparent 100%);
  filter: drop-shadow(0 0 calc(var(--mu) * 3) rgb(0 0 0 / 0.6));
  animation: whirl 1.3s linear infinite;
  pointer-events: none;
}
.sash.two { inset: calc(var(--mu) * -6) calc(var(--mu) * -22); animation-duration: 1.7s; animation-direction: reverse; }
/* Vedette: a star over its head. */
.star {
  left: 50%;
  top: calc(var(--mu) * -30);
  translate: -50% 0;
  font-size: calc(var(--mu) * 40);
  color: #ffd84a;
  filter: drop-shadow(0 0 calc(var(--mu) * 6) rgb(255 220 80 / 0.9));
  animation: star-bob 1.8s ease-in-out infinite;
}
/* With the tier pennant over its head, the Vedette's star moves to the side. */
.with-tier .star { left: auto; right: calc(var(--mu) * -10); translate: 0 0; font-size: calc(var(--mu) * 34); }
/* The tier, as in a tavern: a pennant in the camp's colour, one gold star per tier. */
.tier {
  --star: calc(var(--mu) * 21);
  --gap: calc(var(--mu) * 2);
  z-index: 3;
  left: 50%;
  top: calc(var(--mu) * -38);
  translate: -50% 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--gap);
  width: calc(var(--star) * var(--cols) + var(--gap) * (var(--cols) - 1) + var(--mu) * 14);
  padding: calc(var(--mu) * 5) calc(var(--mu) * 7) calc(var(--mu) * 15);
  background: linear-gradient(var(--camp-color), color-mix(in srgb, var(--camp-color) 55%, #000));
  box-shadow: inset 0 0 0 calc(var(--mu) * 2.5) var(--color-gold);
  clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);
  color: var(--color-gold);
  font-size: var(--star);
  line-height: 0;
  pointer-events: none;
}
.tier > * { filter: drop-shadow(0 0 calc(var(--mu) * 1.5) var(--color-ink)); }

.stat {
  bottom: calc(var(--mu) * -6);
  width: calc(var(--mu) * 60);
  height: calc(var(--mu) * 60);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font: 400 calc(var(--mu) * 40) / 1 var(--font-number);
  -webkit-text-stroke: calc(var(--mu) * 6) var(--color-ink);
  paint-order: stroke fill;
  background-size: 100% 100%;
  filter: drop-shadow(0 calc(var(--mu) * 3) calc(var(--mu) * 3) rgb(0 0 0 / 0.6));
}
.atk { left: calc(var(--mu) * -12); background-image: var(--attack-image); }
.hp { right: calc(var(--mu) * -12); background-image: var(--health-image); padding-bottom: calc(var(--mu) * 5); }
.tone-up { color: var(--color-boosted); }
.tone-down { color: #ff7b7b; }
.pop { animation: stat-pop 0.45s ease-out; }

.marks {
  left: 50%;
  bottom: calc(var(--mu) * -12);
  translate: -50% 0;
  display: flex;
  gap: calc(var(--mu) * 3);
  padding: calc(var(--mu) * 3) calc(var(--mu) * 7);
  border-radius: calc(var(--mu) * 20);
  background: rgb(14 16 26 / 0.92);
  border: calc(var(--mu) * 2) solid #8a92a4;
  font-size: calc(var(--mu) * 21);
  line-height: 1;
  white-space: nowrap;
}
/* Another one speaks in its place: the icon stays, dim and grey. */
.mark.idle { opacity: 0.35; filter: grayscale(1); }
.mark { display: inline-flex; align-items: center; gap: calc(var(--mu) * 1); }
.skull { color: #e9e4d6; }
.bolt { color: #ffd23a; }
.revanche { color: #ff8a6a; font: 400 calc(var(--mu) * 22) / 1 var(--font-number); }
.confetti { color: #ff6ad5; }
.answer { color: #7fd0ff; }
.lock { color: #cfd4de; }

.pans { left: 50%; top: calc(100% + var(--mu) * 6); translate: -50% 0; display: flex; align-items: flex-start; gap: calc(var(--mu) * 2); }
.pan { position: relative; width: calc(var(--mu) * 34); height: calc(var(--mu) * 34); transform-origin: 50% -40%; animation: pan-swing 2.2s ease-in-out infinite; animation-delay: calc(var(--pan-index) * -0.5s); }
.pan::before { content: ''; position: absolute; left: 50%; top: calc(var(--mu) * -12); width: 1px; height: calc(var(--mu) * 14); background: #ccc; }
.pan img { width: 100%; height: 100%; object-fit: contain; }
.rumor { align-self: center; padding: 0 calc(var(--mu) * 6); border-radius: calc(var(--mu) * 10); background: #5a4a14; color: #ffe9a0; font: 400 calc(var(--mu) * 20) / 1.3 var(--font-number); white-space: nowrap; }
/* Forgotten: a shiny medal that no longer swings. */
.pan.medal { animation: none; filter: sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.15) drop-shadow(0 0 calc(var(--mu) * 4) rgb(255 210 80 / 0.8)); }
/* In scandal: dented, shaking, smoking. */
.pan.smoking { animation: pan-rattle 0.5s ease-in-out infinite; filter: grayscale(0.4) contrast(1.2); }
.pan.smoking::after { content: ''; position: absolute; left: 50%; bottom: 60%; width: calc(var(--mu) * 14); height: calc(var(--mu) * 14); border-radius: 50%; background: rgb(200 200 200 / 0.6); animation: smoke 1.6s ease-out infinite; }
.scandal {
  left: 50%;
  top: calc(var(--mu) * 96);
  translate: -50% 0;
  rotate: -12deg;
  padding: 0 calc(var(--mu) * 8);
  border: calc(var(--mu) * 3) solid #c8102e;
  border-radius: calc(var(--mu) * 6);
  background: rgb(255 240 235 / 0.88);
  color: #c8102e;
  display: flex;
  align-items: center;
  gap: calc(var(--mu) * 6);
  font: 400 calc(var(--mu) * 24) / 1.15 var(--font-number);
  letter-spacing: calc(var(--mu) * 1);
  text-transform: uppercase;
  box-shadow: 0 calc(var(--mu) * 3) calc(var(--mu) * 6) rgb(0 0 0 / 0.5);
  animation: stamp 0.35s cubic-bezier(0.3, 1.8, 0.5, 1);
}
.scandal b { padding: 0 calc(var(--mu) * 5); border-radius: calc(var(--mu) * 8); background: #c8102e; color: #fff; font-weight: 400; }
.is-scandal .ring { box-shadow: 0 0 calc(var(--mu) * 14) calc(var(--mu) * 3) rgb(220 30 50 / 0.7), 0 calc(var(--mu) * 10) calc(var(--mu) * 16) rgb(0 0 0 / 0.6); }

.pan-drop-enter-active { animation: pan-drop 0.65s cubic-bezier(0.3, 1.4, 0.5, 1); }
.clang {
  left: 62%;
  top: calc(var(--mu) * 120);
  z-index: 4;
  color: #ffe066;
  font: 400 calc(var(--mu) * 34) / 1 var(--font-number);
  letter-spacing: calc(var(--mu) * 1);
  -webkit-text-stroke: calc(var(--mu) * 5) var(--color-ink);
  paint-order: stroke fill;
  white-space: nowrap;
  pointer-events: none;
  animation: clang 1s ease-out forwards;
}
@keyframes pan-drop {
  0% { transform: translateY(calc(var(--mu) * -260)) rotate(-40deg); opacity: 0; }
  10% { opacity: 1; }
  60% { transform: translateY(0) rotate(12deg); }
  80% { transform: translateY(calc(var(--mu) * -10)) rotate(-6deg); }
  100% { transform: none; }
}
@keyframes clang {
  0%, 35% { transform: scale(0.2) rotate(-14deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(8deg); opacity: 1; }
  80% { transform: scale(1) rotate(4deg); opacity: 1; }
  100% { transform: scale(1.05) rotate(4deg); opacity: 0; }
}
/* The smoke of a scandal: grey clouds bursting out and rising, gone in half a second. */
.puff { inset: 0; z-index: 3; pointer-events: none; }
.puff i {
  position: absolute;
  left: 50%;
  top: 55%;
  width: calc(var(--mu) * 96);
  height: calc(var(--mu) * 96);
  margin: calc(var(--mu) * -48);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #ffffff, #d4d4dc 45%, #8e8e9a 62%, rgb(120 120 130 / 0) 72%);
  opacity: 0;
  animation: puff 0.6s ease-out;
}
.puff i:nth-child(1) { --px: -70; --py: -40; }
.puff i:nth-child(2) { --px: 70; --py: -50; animation-delay: 0.03s; }
.puff i:nth-child(3) { --px: -50; --py: 50; animation-delay: 0.05s; }
.puff i:nth-child(4) { --px: 60; --py: 45; animation-delay: 0.02s; }
.puff i:nth-child(5) { --px: 0; --py: -85; animation-delay: 0.06s; }
/* Forgotten just now: the pan flips over and comes back a medal, with a glint. */
.pan.minted img { animation: mint 0.55s ease-out; }
.glint {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--mu) * 60);
  height: calc(var(--mu) * 60);
  margin: calc(var(--mu) * -30);
  background:
    linear-gradient(transparent 46%, #fff 50%, transparent 54%),
    linear-gradient(90deg, transparent 46%, #fff 50%, transparent 54%),
    radial-gradient(circle, #fff 0 8%, rgb(255 230 120 / 0.8) 14%, transparent 40%);
  opacity: 0;
  animation: glint 0.6s ease-out 0.3s;
  pointer-events: none;
}
/* The people forget: golden sparkles pop all around the medallion. */
.oubli { inset: 0; z-index: 3; pointer-events: none; }
.oubli .game-icon {
  position: absolute;
  left: calc(50% + var(--mu) * 82 * cos(var(--k) * 72deg - 90deg));
  top: calc(50% + var(--mu) * 96 * sin(var(--k) * 72deg - 90deg));
  translate: -50% -50%;
  color: #ffe27a;
  font-size: calc(var(--mu) * 38);
  filter: drop-shadow(0 0 calc(var(--mu) * 8) #ffd23a);
  opacity: 0;
  animation: sparkle-pop 0.6s ease-out;
  animation-delay: calc(var(--k) * 50ms);
}
@keyframes sparkle-pop { 0% { transform: scale(0) rotate(0); opacity: 1; } 45% { transform: scale(1.3) rotate(45deg); opacity: 1; } 100% { transform: scale(0.4) rotate(90deg); opacity: 0; } }
@keyframes puff {
  0% { transform: translate(0, 0) scale(0.3); opacity: 0.95; }
  100% { transform: translate(calc(var(--mu) * var(--px)), calc(var(--mu) * (var(--py) - 30))) scale(1.4); opacity: 0; }
}
@keyframes mint {
  0% { transform: rotateY(0) scale(1); filter: none; }
  45% { transform: rotateY(90deg) scale(1.3); filter: brightness(2); }
  100% { transform: rotateY(360deg) scale(1); }
}
@keyframes glint { 0% { transform: scale(0.2) rotate(0); opacity: 1; } 100% { transform: scale(1.3) rotate(45deg); opacity: 0; } }
@keyframes pan-rattle { 0%, 100% { rotate: -9deg; } 50% { rotate: 9deg; } }
@keyframes smoke { 0% { translate: -50% 0; scale: 0.4; opacity: 0.8; } 100% { translate: -50% calc(var(--mu) * -26); scale: 1.4; opacity: 0; } }
@keyframes sheen { 0% { background-position: 120% 0; } 60%, 100% { background-position: -120% 0; } }
@keyframes bubble-breathe { 50% { transform: scale(1.03); opacity: 0.9; } }
@keyframes gold-glow { 50% { box-shadow: 0 0 calc(var(--mu) * 30) calc(var(--mu) * 7) rgb(255 210 60 / 0.95), inset 0 0 0 calc(var(--mu) * 2) #6a4400, 0 calc(var(--mu) * 10) calc(var(--mu) * 16) rgb(0 0 0 / 0.6); } }
@keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); } 50% { opacity: 1; transform: scale(1.1) rotate(45deg); } }
@keyframes halo-pulse { 50% { transform: scale(1.04); opacity: 0.75; } }
@keyframes whirl { to { rotate: 360deg; } }
@keyframes drip { 0% { transform: scaleY(0.4); opacity: 0; } 20% { opacity: 1; } 70% { transform: scaleY(1.25) translateY(calc(var(--mu) * 6)); opacity: 1; } 100% { transform: scaleY(0.6) translateY(calc(var(--mu) * 24)); opacity: 0; } }
@keyframes star-bob { 50% { transform: translateY(calc(var(--mu) * -5)) rotate(12deg) scale(1.08); } }
@keyframes stat-pop { 0% { transform: scale(1); } 35% { transform: scale(1.55); } 100% { transform: scale(1); } }
@keyframes stamp { from { transform: scale(2.4); opacity: 0; } }
@keyframes pan-swing { 0%, 100% { rotate: -9deg; } 50% { rotate: 9deg; } }
@media (prefers-reduced-motion: reduce) {
  .sheen, .bubble, .halo, .slime i, .sash, .star, .pan, .clang, .pan img, .scandal { animation: none !important; }
  .clang, .puff, .glint, .oubli { display: none; }
}
</style>
