<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';

/** A candidate's face holds the screen this long before the channel zaps to the next one. */
const ZAP_EVERY_MS = 3400;
/** The zap itself, and the glitch of a big shock. */
const ZAP_MS = 260;
const GLITCH_MS = 520;

/**
 * A television screen of the set: a candidate's face, live, between scanlines, zapping from one candidate to the next.
 * A big shock of the combat makes it glitch. Placed by its parent; sized by --screen-width.
 */
const props = defineProps<{
  /** The faces it zaps between (puppetStyle), the first shown first. */
  faces: Record<string, string>[];
  /** Counts the big shocks of the combat: each new one glitches the picture. */
  shocks: number;
  /** The set's colour, behind the face. */
  accent: string;
}>();

const index = ref(0);
const zapping = ref(false);
const glitching = ref(false);
let zapTimer = 0;
let flagTimer = 0;
let glitchTimer = 0;
const shown = computed(() => props.faces[index.value % Math.max(1, props.faces.length)] ?? null);

function zap(): void {
  if (props.faces.length < 2) return;
  zapping.value = true;
  window.clearTimeout(flagTimer);
  flagTimer = window.setTimeout(() => {
    index.value = (index.value + 1) % props.faces.length;
    zapping.value = false;
  }, ZAP_MS / 2);
}

watch(() => props.faces.length, () => (index.value = 0));
watch(() => props.shocks, () => {
  glitching.value = false;
  requestAnimationFrame(() => (glitching.value = true));
  window.clearTimeout(glitchTimer);
  glitchTimer = window.setTimeout(() => (glitching.value = false), GLITCH_MS);
});
onMounted(() => (zapTimer = window.setInterval(zap, ZAP_EVERY_MS)));
onUnmounted(() => {
  window.clearInterval(zapTimer);
  window.clearTimeout(flagTimer);
  window.clearTimeout(glitchTimer);
});
</script>

<template>
  <span class="screen" :class="{ zapping, glitching }" :style="{ '--accent': accent }" aria-hidden="true">
    <span class="glass">
      <span class="backdrop" />
      <HeadPortrait v-if="shown" :key="index" class="face" :puppet="shown" />
      <span class="scanlines" />
      <span class="snow" />
      <span class="live" />
      <span class="glare" />
    </span>
  </span>
</template>

<style scoped>
.screen {
  --w: var(--screen-width, 300px);
  position: absolute;
  display: block;
  width: var(--w);
  aspect-ratio: 16 / 9;
  padding: calc(var(--w) * 0.03);
  border-radius: calc(var(--w) * 0.035);
  background: linear-gradient(160deg, #3a3f4c, #121419 40%, #0a0b0e);
  box-shadow:
    0 0 0 calc(var(--w) * 0.006) color-mix(in srgb, var(--accent) 70%, #ffffff),
    0 0 calc(var(--w) * 0.12) color-mix(in srgb, var(--accent) 55%, transparent),
    0 calc(var(--w) * 0.04) calc(var(--w) * 0.08) rgb(0 0 0 / 0.6);
}
.glass {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(var(--w) * 0.015);
  background: #05060a;
}
.backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 75% at 50% 62%, color-mix(in srgb, var(--accent) 80%, #ffffff) 0%, transparent 70%),
    linear-gradient(color-mix(in srgb, var(--accent) 55%, #0a0c18), #0a0c18);
}
/* The studio light breathes on the screen: a white veil fading in and out (opacity only, cheap on a phone). */
.backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 50% 60% at 50% 55%, rgb(255 255 255 / 0.22), transparent 75%);
  opacity: 0;
  animation: backdrop-breathe 3.2s ease-in-out infinite;
}
/* The face, big, looking out of the set: no round frame here. */
.glass .face {
  --portrait-size: calc(var(--w) * 0.5);
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  background: transparent;
  border-radius: 0;
  overflow: visible;
  animation: face-in 0.26s cubic-bezier(0.3, 1.5, 0.5, 1), face-bob 2.4s ease-in-out 0.3s infinite;
}
.face :deep(.jaw) { animation: chatter 0.42s steps(2, jump-none) infinite; }
.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(rgb(0 0 0 / 0.2) 0 1px, transparent 1px 3px);
  pointer-events: none;
}
.snow {
  position: absolute;
  inset: -50%;
  opacity: 0;
  background:
    repeating-radial-gradient(circle at 17% 32%, rgb(255 255 255 / 0.9) 0 1px, transparent 1px 3px),
    repeating-radial-gradient(circle at 63% 71%, rgb(0 0 0 / 0.8) 0 1px, transparent 1px 2px),
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.35) 0 2px, rgb(30 30 30 / 0.4) 2px 5px);
}
/* On air: a red dot that breathes. */
.live {
  position: absolute;
  left: calc(var(--w) * 0.05);
  top: calc(var(--w) * 0.045);
  width: calc(var(--w) * 0.04);
  height: calc(var(--w) * 0.04);
  border-radius: 50%;
  background: #ff2a3a;
  box-shadow: 0 0 calc(var(--w) * 0.03) #ff2a3a;
  animation: live 1.1s ease-in-out infinite;
}
.glare {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, rgb(255 255 255 / 0.16) 0%, rgb(255 255 255 / 0.04) 32%, transparent 33%, transparent 100%);
  pointer-events: none;
}
.zapping .glass { animation: zap 0.26s linear; }
.zapping .snow { animation: snow-burst 0.26s steps(4) ; }
.glitching .face { animation: glitch-face 0.52s steps(6) 1; }
.glitching .snow { animation: snow-burst 0.52s steps(6); }
.glitching .backdrop { filter: hue-rotate(80deg) saturate(2); }
@keyframes backdrop-breathe { 50% { opacity: 1; } }
@keyframes face-in { from { translate: -50% 10%; scale: 0.7; } }
@keyframes face-bob { 50% { transform: translateY(calc(var(--w) * -0.012)) rotate(-1.5deg); } }
@keyframes chatter { 50% { transform: translateY(calc(var(--w) * 0.012)); } }
@keyframes live { 50% { opacity: 0.35; } }
@keyframes zap { 0% { filter: brightness(1); } 45% { filter: brightness(3) contrast(0.5); transform: scaleY(0.04); } 55% { transform: scaleY(0.04); } 100% { filter: brightness(1); transform: scaleY(1); } }
@keyframes snow-burst { 0%, 100% { opacity: 0; } 20%, 70% { opacity: 0.85; transform: translate(3%, -2%); } 45% { transform: translate(-4%, 3%); } }
@keyframes glitch-face {
  0%, 100% { translate: -50% -50%; filter: none; }
  20% { translate: -44% -50%; filter: drop-shadow(calc(var(--w) * -0.02) 0 #ff2a3a) drop-shadow(calc(var(--w) * 0.02) 0 #2ad8ff); }
  40% { translate: -57% -48%; filter: invert(1); }
  60% { translate: -48% -52%; filter: drop-shadow(calc(var(--w) * 0.03) 0 #ff2a3a) drop-shadow(calc(var(--w) * -0.03) 0 #2ad8ff); }
  80% { translate: -52% -50%; filter: saturate(3) brightness(1.6); }
}
@media (prefers-reduced-motion: reduce) {
  .backdrop::after, .face, .face :deep(.jaw), .live { animation: none; }
  .zapping .glass, .zapping .snow, .glitching .face, .glitching .snow { animation: none; }
}
</style>
