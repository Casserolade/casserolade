<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import { TUTORIAL_TARGETS } from '#src/client/const/tutorialTargets.ts';
import type { Consigne } from '#src/histoire/tutoriel.ts';

const MEASURE_MS = 200;
const SHAKE_MS = 600;
/** Room around the ring, in screen pixels. */
const RING_PAD = 10;

/**
 * The tutorial's one instruction, beside the table, and a ring with an arrow on each thing it is about: the budget,
 * the card, the button. It never blocks anything and has nothing to close: the instruction goes when it is done. A
 * gesture refused by the rails (`nudge` counts them) shakes it, and its rings flash.
 */
const props = withDefaults(defineProps<{ step: Consigne | null; learned: boolean; players?: number; nudge?: number }>(), { players: 4, nudge: 0 });
defineEmits<{ career: [] }>();

interface Ring { left: number; top: number; width: number; height: number; below: boolean }
const rings = ref<Ring[]>([]);
/** The reminders between two lessons. */
const reminder = computed(() => props.step !== null && ['choix', 'plein', 'sorts', 'budget', 'pret'].includes(props.step.cle));
/** On a phone, the instruction never covers what it points at: below the table when the first ring is in the upper half. */
const atBottom = computed(() => {
  const first = rings.value[0];
  return first !== undefined && first.top + first.height / 2 < window.innerHeight * 0.5;
});

/** The first of these selectors on the table, as a ring around it. */
function ringAround(selectors: string[], choosing: boolean): Ring | null {
  for (const selector of selectors) {
    // A choice covers the table: only what is on it may be pointed at.
    if (choosing && !selector.startsWith('.discover')) continue;
    const element = document.querySelector(selector);
    if (!element) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const top = Math.max(0, box.top);
    const bottom = Math.min(window.innerHeight, box.bottom);
    // Near the top of the screen, the arrow comes from below.
    return { left: box.left - RING_PAD, top: top - RING_PAD, width: box.width + RING_PAD * 2, height: bottom - top + RING_PAD * 2, below: top < window.innerHeight * 0.22 };
  }
  return null;
}

function measure(): void {
  const groups = props.step && !props.learned ? (TUTORIAL_TARGETS[props.step.cle] ?? []) : [];
  const choosing = document.querySelector('.discover') !== null;
  rings.value = groups.map((selectors) => ringAround(selectors, choosing)).filter((ring): ring is Ring => ring !== null);
}

/** A refused gesture: the bubble shakes, the rings flash. */
const shaking = ref(false);
let shakeTimer = 0;
watch(() => props.nudge, () => {
  shaking.value = false;
  window.clearTimeout(shakeTimer);
  requestAnimationFrame(() => (shaking.value = true));
  shakeTimer = window.setTimeout(() => (shaking.value = false), SHAKE_MS);
});

let timer = 0;
onMounted(() => {
  measure();
  timer = window.setInterval(measure, MEASURE_MS);
});
onUnmounted(() => {
  window.clearInterval(timer);
  window.clearTimeout(shakeTimer);
});

/** Under the last row of the scores (ScoreBoard: top 176, rows of 70 every 80), whatever the size of the table. */
const bubbleTop = computed(() => ({ '--bubble-top': String(176 + props.players * 80 + 12) }));

function ringStyle(ring: Ring): Record<string, string> {
  return { left: `${ring.left}px`, top: `${ring.top}px`, width: `${ring.width}px`, height: `${ring.height}px` };
}
</script>

<template>
  <div class="guide" aria-live="polite">
    <div class="stage">
      <Transition name="say" mode="out-in">
        <div v-if="step" :key="step.cle" class="bubble" :class="{ last: learned, 'at-bottom': atBottom, shaking }" :style="bubbleTop">
          <span class="kicker">{{ learned ? 'Bravo' : reminder ? 'Rappel' : 'Tutoriel' }}</span>
          <p><RichText :text="step.texte" /></p>
          <AppButton v-if="learned" class="career" primary @click="$emit('career')">Passer à la carrière</AppButton>
        </div>
      </Transition>
    </div>
    <template v-if="step && !learned">
      <div v-for="(ring, index) in rings" :key="`${step.cle}-${index}`" class="ring" :class="{ below: ring.below, flash: shaking }" :style="ringStyle(ring)" aria-hidden="true">
        <svg class="arrow" viewBox="0 0 40 48"><path d="M13 2h14v22h11L20 46 2 24h11Z" /></svg>
      </div>
    </template>
  </div>
</template>

<style scoped>
.guide { position: fixed; inset: 0; z-index: 55; pointer-events: none; }
.stage { position: absolute; left: 50%; top: 50%; width: calc(var(--s) * 1920); height: calc(var(--s) * 1080); translate: -50% -50%; }
/* On the left rail, under the scores: the narrator's card, never over the play area. */
.bubble {
  position: absolute;
  left: calc(var(--s) * 30);
  top: calc(var(--s) * var(--bubble-top, 508));
  width: calc(var(--s) * 262);
  padding: calc(var(--s) * 16) calc(var(--s) * 18) calc(var(--s) * 18);
  border-radius: calc(var(--s) * 22);
  border: calc(var(--s) * 4) solid var(--color-ink);
  background: #fffbe8;
  color: var(--color-ink);
  box-shadow: calc(var(--s) * 6) calc(var(--s) * 8) 0 rgb(0 0 0 / 0.35), 0 0 calc(var(--s) * 30) rgb(255 220 90 / 0.35);
  font: 600 calc(var(--s) * 25) / 1.25 var(--font-card);
  rotate: -1deg;
}
.kicker { display: block; margin-bottom: calc(var(--s) * 6); color: #c8102e; font: 400 calc(var(--s) * 30) / 1 var(--font-number); letter-spacing: calc(var(--s) * 1); }
.last { background: #fff3c4; }
.last .kicker { color: #1f8a4c; }
.career { pointer-events: auto; margin-top: calc(var(--s) * 14); font-size: calc(var(--s) * 28); }
.say-enter-active { animation: say-in 0.4s cubic-bezier(0.3, 1.5, 0.5, 1); }
.say-leave-active { animation: say-in 0.18s ease-in reverse; }
@keyframes say-in { from { transform: scale(0.5) translateX(-30%); opacity: 0; } }

.ring {
  position: fixed;
  border-radius: 18px;
  border: 4px solid #ffe066;
  box-shadow: 0 0 0 4px rgb(20 17 12 / 0.7), 0 0 26px 6px rgb(255 224 102 / 0.75);
  animation: ring-pulse 1.1s ease-in-out infinite;
}
.arrow { position: absolute; left: 50%; bottom: calc(100% + 6px); width: 46px; height: 56px; translate: -50% 0; fill: #ffe066; stroke: var(--color-ink); stroke-width: 3; stroke-linejoin: round; filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.5)); animation: arrow-bob 0.8s ease-in-out infinite; }
.below .arrow { top: calc(100% + 6px); bottom: auto; rotate: 180deg; }
@keyframes ring-pulse { 50% { box-shadow: 0 0 0 4px rgb(20 17 12 / 0.7), 0 0 40px 12px rgb(255 224 102 / 0.9); } }
/* A refused gesture: the bubble says no with its head, the rings flash red. */
.shaking { animation: shake 0.5s ease-in-out; }
.flash { border-color: #ff5a4a; animation: ring-flash 0.2s ease-in-out 3; }
@keyframes shake { 20%, 60% { translate: calc(var(--s) * -14) 0; } 40%, 80% { translate: calc(var(--s) * 14) 0; } }
@keyframes ring-flash { 50% { box-shadow: 0 0 0 4px rgb(20 17 12 / 0.7), 0 0 44px 16px rgb(255 90 74 / 0.95); } }
@media (prefers-reduced-motion: reduce) { .shaking { animation: none; } }
@keyframes arrow-bob { 50% { transform: translateY(-12px); } }
</style>

<style>
/*
 * The phone version (html.mobile, /m/): no table of 1920×1080, the instruction is a band across the screen. Not
 * scoped: Vue's :global() keeps only `html.mobile` of such a selector, and would style the page itself.
 */
html.mobile .guide .stage { position: static; translate: none; width: auto; height: auto; }
html.mobile .guide .bubble { position: fixed; left: 10px; right: 10px; top: calc(env(safe-area-inset-top) + 94px); width: auto; padding: 10px 14px 12px; border-width: 3px; border-radius: 16px; font-size: 0.95rem; box-shadow: 4px 6px 0 rgb(0 0 0 / 0.35), 0 0 20px rgb(255 220 90 / 0.35); }
html.mobile .guide .bubble.at-bottom { top: auto; bottom: calc(env(safe-area-inset-bottom) + 92px); }
html.mobile .guide .kicker { margin-bottom: 4px; font-size: 1.05rem; }
html.mobile .guide .career { margin-top: 8px; font-size: 1.1rem; }
</style>
