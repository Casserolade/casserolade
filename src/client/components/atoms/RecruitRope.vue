<script setup lang="ts">
import { computed } from 'vue';
import { ROPE_SPARKS } from '#src/client/const/ropeSparks.ts';

/**
 * The fuse: in the last seconds of the phase, it burns across the middle of the table, between the shop and
 * the board, toward « Prêt ». A twisted cord, a glowing ember with its burnt stub, a flickering flame, sparks,
 * a wisp of smoke, and the light it throws on the table. In the very last seconds, it races.
 */
const BURN_SECONDS = 20;
const URGENT_SECONDS = 5;

const props = defineProps<{ secondsLeft: number | null }>();

const left = computed(() => (props.secondsLeft === null ? 1 : Math.min(1, props.secondsLeft / BURN_SECONDS)));
const isBurning = computed(() => props.secondsLeft !== null && props.secondsLeft <= BURN_SECONDS);
const isUrgent = computed(() => props.secondsLeft !== null && props.secondsLeft <= URGENT_SECONDS);
</script>

<template>
  <div v-if="isBurning" class="rope-line" :class="{ urgent: isUrgent }" role="timer" :aria-label="`Plus que ${secondsLeft} secondes`">
    <span class="rope" :style="{ width: `${left * 100}%` }">
      <span class="stub" aria-hidden="true" />
      <span class="fire" aria-hidden="true">
        <span class="glow" />
        <span v-for="index in 3" :key="`smoke-${index}`" class="smoke" :style="{ '--k': index }" />
        <span
          v-for="(spark, index) in ROPE_SPARKS"
          :key="`spark-${index}`"
          class="spark"
          :style="{ '--angle': `${spark.angle}deg`, '--distance': spark.distance, '--delay': spark.delay }"
        />
        <svg class="flame" viewBox="0 0 40 60">
          <defs>
            <radialGradient id="rope-flame-outer" cx="50%" cy="78%" r="70%">
              <stop offset="0%" stop-color="#ffb02e" />
              <stop offset="60%" stop-color="#ff5a14" />
              <stop offset="100%" stop-color="#d81e05" />
            </radialGradient>
            <radialGradient id="rope-flame-inner" cx="50%" cy="80%" r="65%">
              <stop offset="0%" stop-color="#fff8d8" />
              <stop offset="45%" stop-color="#ffe066" />
              <stop offset="100%" stop-color="#ffa21e" />
            </radialGradient>
          </defs>
          <path class="outer" d="M20 2C27 14 37 24 36 38C35 50 28 58 20 58C12 58 5 50 4 38C3 26 14 20 20 2Z" fill="url(#rope-flame-outer)" />
          <path class="inner" d="M20 20C24 28 30 33 29 42C28 50 24 54 20 54C16 54 12 50 11 42C10 34 17 30 20 20Z" fill="url(#rope-flame-inner)" />
          <ellipse class="core" cx="20" cy="47" rx="5.5" ry="7" fill="#ffffff" />
        </svg>
        <span class="ember" />
      </span>
    </span>
  </div>
</template>

<style scoped>
.rope-line { position: absolute; z-index: 6; left: calc(var(--s) * 340); width: calc(var(--s) * 1240); top: calc(var(--s) * 427); height: calc(var(--s) * 24); display: flex; justify-content: flex-end; align-items: center; pointer-events: none; }
/* A twisted cord: strands in a spiral over a round, lit-from-above body, and its shadow on the table. */
.rope {
  position: relative;
  display: block;
  height: calc(var(--s) * 18);
  border-radius: calc(var(--s) * 9);
  background:
    repeating-linear-gradient(118deg, rgb(255 238 196 / 0.6) 0 calc(var(--s) * 2), transparent calc(var(--s) * 2) calc(var(--s) * 7), rgb(74 40 10 / 0.6) calc(var(--s) * 7) calc(var(--s) * 9.5), transparent calc(var(--s) * 9.5) calc(var(--s) * 12)),
    linear-gradient(#f4d391, #cf9744 38%, #93601f 72%, #5a3410);
  box-shadow: 0 calc(var(--s) * 5) calc(var(--s) * 10) rgb(0 0 0 / 0.65), inset 0 calc(var(--s) * -2) calc(var(--s) * 3) rgb(0 0 0 / 0.35);
  transition: width 1s linear;
}
/* Burnt behind the ember: charred cord, a few sparks of red still in it, fading into ash. */
.stub {
  position: absolute;
  right: 100%;
  top: calc(var(--s) * 2);
  width: calc(var(--s) * 70);
  height: calc(var(--s) * 12);
  border-radius: calc(var(--s) * 6) 0 0 calc(var(--s) * 6);
  background:
    radial-gradient(circle at 88% 50%, rgb(255 90 20 / 0.9), transparent 22%),
    radial-gradient(circle at 64% 40%, rgb(255 120 40 / 0.6), transparent 9%),
    radial-gradient(circle at 40% 60%, rgb(255 110 30 / 0.45), transparent 7%),
    linear-gradient(90deg, transparent, #3a3330 35%, #1c1715 80%, #2a1208);
  animation: smoulder 0.9s steps(3, end) infinite alternate;
}
.fire { position: absolute; left: 0; top: 50%; width: 0; height: 0; }
.fire > * { position: absolute; }
/* The light of the flame on the table. */
.glow {
  left: calc(var(--s) * -130);
  top: calc(var(--s) * -130);
  width: calc(var(--s) * 260);
  height: calc(var(--s) * 260);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 180 70 / 0.5), rgb(255 120 30 / 0.18) 45%, transparent 70%);
  mix-blend-mode: screen;
  animation: glow-pulse 0.5s ease-in-out infinite alternate;
}
.flame {
  left: calc(var(--s) * -26);
  top: calc(var(--s) * -70);
  width: calc(var(--s) * 52);
  height: calc(var(--s) * 78);
  overflow: visible;
  transform-origin: 50% 88%;
  filter: drop-shadow(0 0 calc(var(--s) * 8) rgb(255 150 40 / 0.9));
  animation: flame-dance 0.36s steps(3, end) infinite alternate;
}
.flame .inner { transform-origin: 50% 90%; animation: flame-core 0.22s steps(2, end) infinite alternate; }
.flame .core { opacity: 0.85; }
.ember {
  left: calc(var(--s) * -9);
  top: calc(var(--s) * -9);
  width: calc(var(--s) * 18);
  height: calc(var(--s) * 18);
  border-radius: 50%;
  background: radial-gradient(circle at 45% 40%, #fff6c8, #ffb12e 40%, #e5380c 75%, #7a1404);
  box-shadow: 0 0 calc(var(--s) * 10) #ff7a1e, 0 0 calc(var(--s) * 22) rgb(255 90 20 / 0.7);
}
/* Sparks fly off in all directions, shrink and go out. */
.spark {
  left: calc(var(--s) * -3);
  top: calc(var(--s) * -3);
  width: calc(var(--s) * 6);
  height: calc(var(--s) * 6);
  border-radius: 50%;
  background: #fff1a8;
  box-shadow: 0 0 calc(var(--s) * 6) #ffb52e, 0 0 calc(var(--s) * 2) #fff;
  animation: spark-fly 0.9s ease-out infinite;
  animation-delay: calc(var(--delay) * -0.9s);
}
/* A thin wisp of smoke rises and thins out. */
.smoke {
  left: calc(var(--s) * -14);
  top: calc(var(--s) * -40);
  width: calc(var(--s) * 28);
  height: calc(var(--s) * 28);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(190 185 180 / 0.45), transparent 70%);
  animation: smoke-rise 1.8s ease-out infinite;
  animation-delay: calc(var(--k) * -0.6s);
}
/* The last seconds: the flame doubles, the sparks race, the table glows brighter. */
.urgent .flame { scale: 1.4; animation-duration: 0.2s; }
.urgent .spark { animation-duration: 0.5s; animation-delay: calc(var(--delay) * -0.5s); }
.urgent .glow { scale: 1.4; animation-duration: 0.25s; }
.urgent .rope { animation: fuse-shake 0.12s steps(2, end) infinite alternate; }
@keyframes flame-dance {
  0% { transform: scale(0.92, 1.04) skewX(-4deg); }
  50% { transform: scale(1.06, 0.94) skewX(3deg); }
  100% { transform: scale(0.98, 1.1) skewX(-2deg); }
}
@keyframes flame-core { from { transform: scale(0.9, 1.05); } to { transform: scale(1.08, 0.92); } }
@keyframes glow-pulse { from { opacity: 0.75; } to { opacity: 1; } }
@keyframes smoulder { from { filter: brightness(0.85); } to { filter: brightness(1.25); } }
/* Turned toward its angle first, so it flies along it. */
@keyframes spark-fly {
  0% { transform: rotate(var(--angle)) translateY(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: rotate(var(--angle)) translateY(calc(var(--s) * var(--distance) * -1)) scale(0.3); opacity: 0; }
}
@keyframes smoke-rise {
  0% { translate: 0 0; scale: 0.5; opacity: 0; }
  20% { opacity: 1; }
  100% { translate: calc(var(--s) * 18) calc(var(--s) * -70); scale: 2.2; opacity: 0; }
}
@keyframes fuse-shake { from { translate: 0 calc(var(--s) * -1); } to { translate: 0 calc(var(--s) * 1); } }
@media (prefers-reduced-motion: reduce) {
  .flame, .flame .inner, .glow, .spark, .smoke, .stub, .urgent .rope { animation: none; }
  .spark, .smoke { display: none; }
}
</style>
