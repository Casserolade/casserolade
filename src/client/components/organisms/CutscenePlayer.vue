<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { Cutscene } from '#src/client/cutscenes/createCutscene.ts';
import { CutsceneSound } from '#src/client/cutscenes/cutsceneSound.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { isHurryKey } from '#src/client/tools/isHurryKey.ts';
import type { Cinematique } from '#src/data/histoire/cinematique.ts';

/** The stage of a cutscene, drawn for this size and fitted to the window. */
const STAGE = { width: 1920, height: 1080 };

/**
 * A career cutscene, full screen: it plays by itself and the career goes on when it ends. A touch, a click or a key
 * (Space, Enter, →, Escape) passes it: nothing has to be clicked, nothing has to be closed.
 */
const props = defineProps<{ cinematique: Cinematique }>();
const emit = defineEmits<{ end: []; ready: [cutscene: Cutscene] }>();

const frame = useTemplateRef<HTMLElement>('frame');
const scale = ref(1);
let cutscene: Cutscene | null = null;
let sound: CutsceneSound | null = null;
let ended = false;

function fit(): void {
  scale.value = Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height);
}

function end(): void {
  if (ended) return;
  ended = true;
  sound?.stop();
  emit('end');
}

function skip(): void {
  cutscene?.finish();
  end();
}

function handleKey(event: KeyboardEvent): void {
  if (event.repeat || !(isHurryKey(event.key) || event.key === 'Escape')) return;
  event.preventDefault();
  skip();
}

onMounted(async () => {
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', handleKey);
  await document.fonts.ready;
  if (ended || !frame.value) return;
  sound = new CutsceneSound();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  cutscene = new Cutscene(frame.value, props.cinematique, { manifest: gameArt.manifest.value, onCue: (cue) => sound?.cue(cue), reducedMotion });
  cutscene.timeline.eventCallback('onComplete', end);
  emit('ready', cutscene);
  cutscene.play();
});

onUnmounted(() => {
  window.removeEventListener('resize', fit);
  window.removeEventListener('keydown', handleKey);
  cutscene?.destroy();
  sound?.stop();
});
</script>

<template>
  <div class="cutscene-player" @pointerdown="skip">
    <div ref="frame" class="frame" :style="{ scale }" />
    <p class="hint" aria-hidden="true">Un geste pour passer</p>
  </div>
</template>

<style scoped>
.cutscene-player { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000; cursor: pointer; }
.frame { flex: none; width: 1920px; height: 1080px; }
.hint { position: absolute; right: 18px; bottom: 10px; margin: 0; color: rgb(255 255 255 / 0.45); font: 400 0.9rem / 1 var(--font-number); letter-spacing: 1px; pointer-events: none; }
</style>
