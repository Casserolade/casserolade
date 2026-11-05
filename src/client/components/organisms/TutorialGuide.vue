<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import { TUTORIAL_TARGETS } from '#src/client/const/tutorialTargets.ts';
import type { Etape } from '#src/data/histoire/tutoriel.ts';

const MEASURE_MS = 200;
/** Room around the ring, in screen pixels. */
const RING_PAD = 10;

/**
 * The tutorial's one instruction, beside the table, and a ring with an arrow on what it is about.
 * It never blocks anything and has nothing to close: the instruction goes when it is done.
 */
const props = withDefaults(defineProps<{ step: Etape | null; learned: boolean; players?: number }>(), { players: 4 });
defineEmits<{ career: [] }>();

const rect = ref<{ left: number; top: number; width: number; height: number } | null>(null);
const below = ref(false);

function measure(): void {
  const selectors = props.step ? (TUTORIAL_TARGETS[props.step.fini] ?? []) : [];
  // A choice covers the table: only what is on it may be pointed at.
  const choosing = document.querySelector('.discover') !== null;
  for (const selector of selectors) {
    if (choosing && !selector.startsWith('.discover')) continue;
    const element = document.querySelector(selector);
    if (!element) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const top = Math.max(0, box.top);
    const bottom = Math.min(window.innerHeight, box.bottom);
    rect.value = { left: box.left - RING_PAD, top: top - RING_PAD, width: box.width + RING_PAD * 2, height: bottom - top + RING_PAD * 2 };
    // Near the top of the screen, the arrow comes from below.
    below.value = top < window.innerHeight * 0.22;
    return;
  }
  rect.value = null;
}

let timer = 0;
onMounted(() => {
  measure();
  timer = window.setInterval(measure, MEASURE_MS);
});
onUnmounted(() => window.clearInterval(timer));

/** Under the last row of the scores (ScoreBoard: top 176, rows of 70 every 80), whatever the size of the table. */
const bubbleTop = computed(() => ({ '--bubble-top': String(176 + props.players * 80 + 12) }));

const ringStyle = computed(() => (rect.value ? {
  left: `${rect.value.left}px`,
  top: `${rect.value.top}px`,
  width: `${rect.value.width}px`,
  height: `${rect.value.height}px`,
} : {}));
</script>

<template>
  <div class="guide" aria-live="polite">
    <div class="stage">
      <Transition name="say" mode="out-in">
        <div v-if="step" :key="step.fini" class="bubble" :class="{ last: learned }" :style="bubbleTop">
          <span class="kicker">{{ learned ? 'Bravo' : 'Tutoriel' }}</span>
          <p><RichText :text="step.texte" /></p>
          <AppButton v-if="learned" class="career" primary @click="$emit('career')">Passer à la carrière</AppButton>
        </div>
      </Transition>
    </div>
    <div v-if="rect && step && !learned" :key="step.fini" class="ring" :class="{ below }" :style="ringStyle" aria-hidden="true">
      <svg class="arrow" viewBox="0 0 40 48"><path d="M13 2h14v22h11L20 46 2 24h11Z" /></svg>
    </div>
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
@keyframes arrow-bob { 50% { transform: translateY(-12px); } }
</style>
