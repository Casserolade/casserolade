<script setup lang="ts">
import { computed } from 'vue';
import SoundControl from '#src/client/components/atoms/SoundControl.vue';
import StudioLife from '#src/client/components/atoms/StudioLife.vue';
import { DEFAULT_STUDIO_LOOK, STUDIO_LOOKS } from '#src/client/const/studioLights.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';

/**
 * The table, the same for recruiting and fighting: the TV set all around, blurred into the background,
 * and in the middle one even surface where everything is played. Drawn for 1920×1080, scaled by --s.
 */
const props = defineProps<{ plateauId: string }>();

const decor = computed(() => cssImage(gameArt.manifest.value.plateaux[props.plateauId]?.decor));
const accent = computed(() => (STUDIO_LOOKS[props.plateauId] ?? DEFAULT_STUDIO_LOOK).colors[0]);
</script>

<template>
  <main class="table" :style="{ '--accent': accent }">
    <div class="decor" :style="{ backgroundImage: decor }" aria-hidden="true" />
    <StudioLife :plateau-id="plateauId" />
    <div class="vignette" aria-hidden="true" />
    <div class="stage">
      <div class="mat" aria-hidden="true" />
      <slot />
    </div>
    <slot name="overlay" />
    <div class="stage front">
      <slot name="front" />
      <SoundControl class="sound" />
    </div>
  </main>
</template>

<style scoped>
.table { position: fixed; inset: 0; z-index: 0; isolation: isolate; overflow: hidden; background: #0b0e18; user-select: none; -webkit-user-select: none; }
/*
 * The set is drawn larger than the table (2560×1440 around its 1920×1080) and scaled with it, not with the window:
 * the logo in a corner stays where the table leaves room for it, on any screen. A little dimmed, so the play surface leads.
 */
.decor {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: -3;
  width: max(calc(var(--s) * 2560), 100%);
  height: max(calc(var(--s) * 1440), 100%);
  translate: -50% -50%;
  background: center / cover no-repeat;
  filter: brightness(0.85) saturate(1.05);
}
.vignette { position: absolute; inset: 0; z-index: -1; pointer-events: none; background: radial-gradient(ellipse 70% 65% at 50% 55%, transparent 55%, rgb(4 6 14 / 0.5) 100%); }
.table :deep(.life) { z-index: -2; }
.stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--s) * 1920);
  height: calc(var(--s) * 1080);
  translate: -50% -50%;
}
/* Above the overlays (the combat canvas): what must be read over the medallions. */
.front { z-index: 20; pointer-events: none; }
/* The sound, in the top right corner of every table. */
.sound { position: absolute; right: calc(var(--s) * 26); top: calc(var(--s) * 20); --sound-size: calc(var(--s) * 64); }
/* One surface, as calm as the sand of a tavern: the studio carpet, lit from above. */
.mat {
  position: absolute;
  left: calc(var(--s) * 300);
  top: calc(var(--s) * 156);
  width: calc(var(--s) * 1320);
  height: calc(var(--s) * 640);
  border-radius: calc(var(--s) * 48);
  background:
    radial-gradient(ellipse 60% 55% at 50% 42%, rgb(255 255 255 / 0.09), transparent 75%),
    repeating-linear-gradient(45deg, rgb(255 255 255 / 0.025) 0 calc(var(--s) * 2), transparent calc(var(--s) * 2) calc(var(--s) * 7)),
    repeating-linear-gradient(-45deg, rgb(0 0 0 / 0.06) 0 calc(var(--s) * 2), transparent calc(var(--s) * 2) calc(var(--s) * 7)),
    linear-gradient(#24324f, #172238 60%, #121a2c);
  border: calc(var(--s) * 5) solid #0c1120;
  box-shadow:
    0 0 0 calc(var(--s) * 3) color-mix(in srgb, var(--accent) 70%, #fff),
    0 0 calc(var(--s) * 40) color-mix(in srgb, var(--accent) 45%, transparent),
    inset 0 0 calc(var(--s) * 70) rgb(0 0 0 / 0.55),
    0 calc(var(--s) * 30) calc(var(--s) * 70) rgb(0 0 0 / 0.65);
}
/* The shop is the counter at the back of the carpet. */
.mat::before {
  content: '';
  position: absolute;
  left: calc(var(--s) * 26);
  right: calc(var(--s) * 26);
  top: calc(var(--s) * 18);
  height: calc(var(--s) * 252);
  border-radius: calc(var(--s) * 30);
  background: linear-gradient(rgb(6 9 20 / 0.42), rgb(6 9 20 / 0.22));
  box-shadow: inset 0 calc(var(--s) * -3) 0 rgb(255 255 255 / 0.06), inset 0 calc(var(--s) * 6) calc(var(--s) * 18) rgb(0 0 0 / 0.35);
}
</style>
