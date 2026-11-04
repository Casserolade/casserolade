<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import ArchPortrait from '#src/client/components/atoms/ArchPortrait.vue';
import DeskButton from '#src/client/components/atoms/DeskButton.vue';
import SpeechBubble from '#src/client/components/atoms/SpeechBubble.vue';
import { playSound, playVoice } from '#src/client/services/soundEffects.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { hostQuote } from '#src/client/tools/hostQuote.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { voixPourPhrase } from '#src/data/trouverVoix.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { PlayerAction } from '#src/engine/types.ts';

const LINE_MS = 3200;
/** A player who has not touched anything for this long hears the host fill the silence, once a round. */
const IDLE_MS = 25_000;

/**
 * The host, small, behind its desk at the top of the table, like the tavern keeper. The desk holds
 * the tier and its upgrade on the left, refresh and freeze on the right. The host talks in bubbles that go away.
 */
const props = defineProps<{ view: PlayerView; line: string | null; lineCount: number; act: (action: PlayerAction) => void }>();

const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.view.animateur.id, 'civile'));
const archImage = computed(() => cssImage(gameArt.manifest.value.carte.arche));
const canUpgrade = computed(() => props.view.tier < props.view.params.tierMax);
const rollLabel = computed(() => {
  if (props.view.freeRolls > 1) return `Actualiser la boutique : gratuit, encore ${props.view.freeRolls} fois`;
  return props.view.rollCost === 0 ? 'Actualiser la boutique : gratuit' : 'Actualiser la boutique';
});
const shownLine = ref<string | null>(null);
const talking = ref(0);
let timer = 0;

/** A line in a bubble, gone by itself; in the host's real voice when its words were recorded, as long as the voice. */
function say(line: string): void {
  shownLine.value = line;
  talking.value++;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => (shownLine.value = null), LINE_MS);
  const shownAt = performance.now();
  void playVoice(voixPourPhrase(props.view.animateur.id, line)).then((voiceMs) => {
    if (voiceMs === 0 || shownLine.value !== line) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => (shownLine.value = null), Math.max(LINE_MS - (performance.now() - shownAt), voiceMs + 300));
  });
}

watch(() => props.lineCount, () => {
  if (props.line) say(props.line);
});

let idleTimer = 0;
let idleRound = -1;
watch(() => props.view, () => {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    const { round, animateur } = props.view;
    const line = idleRound === round ? null : hostQuote(animateur.id, 'attente', round);
    if (!line) return;
    idleRound = round;
    say(line);
  }, IDLE_MS);
}, { immediate: true });
onUnmounted(() => {
  window.clearTimeout(timer);
  window.clearTimeout(idleTimer);
  window.clearTimeout(spinTimer);
});

/** The tier climbs: the badge pops in a burst of rays, the desk flashes. */
const climbing = ref(false);
watch(() => props.view.tier, (tier, before) => {
  if (tier <= before) return;
  climbing.value = false;
  requestAnimationFrame(() => (climbing.value = true));
  window.setTimeout(() => (climbing.value = false), 900);
  playSound('upgrade');
});

/** Refreshing: its arrow spins once. */
const spinning = ref(false);
let spinTimer = 0;
function roll(): void {
  props.act({ t: 'roll' });
  spinning.value = false;
  requestAnimationFrame(() => (spinning.value = true));
  window.clearTimeout(spinTimer);
  spinTimer = window.setTimeout(() => (spinning.value = false), 450);
}
</script>

<template>
  <header class="host-desk" :class="{ climbing }">
    <div class="desk" aria-hidden="true" />
    <div class="side left">
      <DeskButton
        icon="tier"
        tone="gold"
        data-control="upgrade"
        :label="canUpgrade ? `Monter à l'échelon ${view.tier + 1}` : 'Échelon maximum'"
        :cost="canUpgrade ? view.upgradeCost : null"
        :disabled="!canUpgrade || view.budget < view.upgradeCost"
        @click="act({ t: 'upgrade' })"
      />
      <span class="tier-spot">
        <span v-if="climbing" class="tier-rays" aria-hidden="true" />
        <span class="tier" :aria-label="`Échelon ${view.tier}`"><span class="tier-number">{{ view.tier }}</span></span>
      </span>
    </div>
    <ArchPortrait class="host" :class="{ talking: shownLine }" :puppet="puppet" :name="view.animateur.nom" :frame-image="archImage" hide-name />
    <div class="side right">
      <DeskButton
        icon="refresh"
        data-control="roll"
        :class="{ spinning }"
        :label="rollLabel"
        :cost="view.rollCost"
        :free-left="view.freeRolls"
        :disabled="view.budget < view.rollCost"
        @click="roll"
      />
      <DeskButton
        icon="snowflake"
        tone="ice"
        data-control="freeze"
        :label="view.frozen ? 'Dégeler la boutique' : 'Geler la boutique'"
        :pressed="view.frozen"
        @click="act({ t: 'freeze' })"
      />
    </div>
    <div v-if="shownLine" :key="talking" class="talk" role="status">
      <SpeechBubble tail="left">{{ shownLine }}</SpeechBubble>
    </div>
  </header>
</template>

<style scoped>
.host-desk { position: absolute; left: calc(var(--s) * 560); top: 0; width: calc(var(--s) * 800); height: calc(var(--s) * 160); z-index: 5; }
.desk {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--s) * -10);
  height: calc(var(--s) * 118);
  clip-path: polygon(0 0, 100% 0, 96% 100%, 4% 100%);
  background: linear-gradient(#e2c56a, #8a6418);
}
.desk::after {
  content: '';
  position: absolute;
  inset: 0 calc(var(--s) * 5) calc(var(--s) * 5);
  clip-path: polygon(0 0, 100% 0, 96% 100%, 4% 100%);
  background: linear-gradient(#2a3a6a, #172248 70%, #101836);
}
.side { position: absolute; top: calc(var(--s) * 14); display: flex; align-items: center; gap: calc(var(--s) * 20); }
.left { left: calc(var(--s) * 90); }
.right { right: calc(var(--s) * 90); }
.tier {
  position: relative;
  width: calc(var(--s) * 78);
  height: calc(var(--s) * 86);
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: linear-gradient(#ffe7a0, #c98d16);
}
.tier::before { content: ''; position: absolute; inset: calc(var(--s) * 5); clip-path: inherit; background: radial-gradient(circle at 40% 30%, #5a3a9a, #22124a); }
.tier-number { position: relative; color: #ffe27a; font: 400 calc(var(--s) * 52) / 1 var(--font-number); -webkit-text-stroke: calc(var(--s) * 5) var(--color-ink); paint-order: stroke fill; }
.host { --arch-width: calc(var(--s) * 128); position: absolute; left: 50%; top: calc(var(--s) * 6); translate: -50% 0; }
.host.talking :deep(.jaw) { animation: jaw-talk 0.18s steps(2, end) infinite alternate; }
.talk { position: absolute; left: calc(var(--s) * 800); top: calc(var(--s) * 16); width: max-content; max-width: calc(var(--s) * 440); }
.tier-spot { position: relative; display: block; }
/* Manga rays behind the badge, for the time of the jump. */
.tier-rays {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--s) * 300);
  height: calc(var(--s) * 300);
  margin: calc(var(--s) * -150);
  background: repeating-conic-gradient(from 0deg, rgb(255 222 90 / 0.9) 0 8deg, transparent 8deg 22deg);
  mask: radial-gradient(circle, #000 18%, transparent 62%);
  animation: tier-rays 0.6s ease-out forwards;
  pointer-events: none;
}
.spinning :deep(.game-icon) { animation: spin-once 0.42s cubic-bezier(0.3, 0.9, 0.4, 1); }
.climbing .tier { animation: tier-jump 0.6s cubic-bezier(0.3, 1.6, 0.5, 1); }
.climbing .desk { animation: desk-flash 0.8s ease-out; }
@keyframes jaw-talk { from { translate: 0 0; } to { translate: 0 calc(var(--arch-width) / 300 * 18); } }
@keyframes tier-jump { 0% { transform: scale(1); } 30% { transform: translateY(calc(var(--s) * -16)) scale(1.45) rotate(-8deg); filter: brightness(1.7); } 100% { transform: none; } }
@keyframes tier-rays { 0% { transform: scale(0.2) rotate(0); opacity: 1; } 100% { transform: scale(1.2) rotate(50deg); opacity: 0; } }
@keyframes spin-once { from { rotate: 0deg; } to { rotate: 360deg; } }
@media (prefers-reduced-motion: reduce) { .tier-rays, .spinning :deep(.game-icon), .climbing .tier, .climbing .desk { animation: none; } }
@keyframes desk-flash { 30% { filter: brightness(1.5) drop-shadow(0 0 calc(var(--s) * 30) #ffd23a); } }
</style>
