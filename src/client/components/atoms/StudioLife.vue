<script setup lang="ts">
import { computed } from 'vue';
import { DEFAULT_STUDIO_LOOK, STUDIO_LOOKS } from '#src/client/const/studioLights.ts';
import { studioElements } from '#src/client/tools/studioElements.ts';

/** What moves on the TV set: spotlights sweeping and camera flashes. The audience is in the set itself. Everything in CSS. */
const props = defineProps<{ plateauId: string }>();

const elements = computed(() => studioElements(STUDIO_LOOKS[props.plateauId] ?? DEFAULT_STUDIO_LOOK));
</script>

<template>
  <div class="life" aria-hidden="true">
    <span v-for="(style, index) in elements.beams" :key="`beam-${index}`" class="beam" :style="style" />
    <span v-for="(style, index) in elements.flashes" :key="`flash-${index}`" class="flash" :style="style" />
  </div>
</template>

<style scoped>
.life { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.beam {
  position: absolute;
  top: -6%;
  left: var(--beam-x);
  width: 22vw;
  height: 120%;
  margin-left: -11vw;
  transform-origin: 50% 0;
  will-change: transform;
  background: linear-gradient(color-mix(in srgb, var(--beam-color) 55%, transparent), color-mix(in srgb, var(--beam-color) 12%, transparent) 55%, transparent 88%);
  clip-path: polygon(46% 0, 54% 0, 100% 100%, 0 100%);
  animation: beam-sweep var(--beam-seconds) ease-in-out var(--beam-delay) infinite alternate;
}
.flash {
  position: absolute;
  left: var(--flash-x);
  top: var(--flash-y);
  width: 7rem;
  height: 7rem;
  margin: -3.5rem;
  border-radius: 50%;
  background: radial-gradient(circle, #fff, rgb(255 255 255 / 0.5) 12%, transparent 60%);
  opacity: 0;
  animation: camera-flash var(--flash-seconds) linear var(--flash-delay) infinite;
}
@keyframes beam-sweep {
  from { transform: rotate(calc(var(--beam-swing) * -1)); }
  to { transform: rotate(var(--beam-swing)); }
}
@keyframes camera-flash {
  0%, 96%, 100% { opacity: 0; }
  97% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .beam, .flash { animation: none; }
}
</style>
