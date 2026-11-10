<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import type { PlayableCutscene } from '#src/client/cutscenes/PlayableCutscene.ts';
import { createPlayableCutscene } from '#src/client/cutscenes/createPlayableCutscene.ts';
import { CutsceneSound } from '#src/client/cutscenes/cutsceneSound.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { isHurryKey } from '#src/client/tools/isHurryKey.ts';
import type { Scene } from '#src/data/histoire/cinematique.ts';

/** The stage of a cutscene, drawn for this size and fitted to the window. */
const STAGE = { width: 1920, height: 1080 };
/**
 * How long the two clicks of a double click may lie apart. The second must neither pass the cutscene the first one
 * opened (a double click on « Élection suivante » made the episode after a won chapter vanish unseen, for good), nor
 * land on the screen a passed cutscene reveals (it entered the next chapter without its page): 10 November 2026.
 */
const DOUBLE_CLICK_MS = 500;

/**
 * A career cutscene, full screen, whatever made it (puppets from data, a HyperFrames episode): it plays by itself and the
 * career goes on when it ends. A touch, a click or a key (Space, Enter, →, Escape) passes it: nothing has to be clicked,
 * nothing has to be closed. One that cannot be built is passed too.
 */
const props = defineProps<{ cinematique: Scene }>();
const emit = defineEmits<{ end: []; ready: [cutscene: PlayableCutscene] }>();

const frame = useTemplateRef<HTMLElement>('frame');
const scale = ref(1);
let cutscene: PlayableCutscene | null = null;
let sound: CutsceneSound | null = null;
let ended = false;
const shownAt = performance.now();

function fit(): void {
  scale.value = Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height);
}

function end(): void {
  if (ended) return;
  ended = true;
  sound?.stop();
  emit('end');
}

/** Passed by a gesture: not by the second click of the double click that opened it. */
function skip(): boolean {
  if (ended || performance.now() - shownAt < DOUBLE_CLICK_MS) return false;
  cutscene?.finish();
  end();
  return true;
}

/** The clicks of the gesture that passed it end with it: the screen underneath does not receive them. */
function skipByPointer(): void {
  if (!skip()) return;
  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener('click', swallow, { capture: true });
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), DOUBLE_CLICK_MS);
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
  const built = await createPlayableCutscene(frame.value, props.cinematique, { manifest: gameArt.manifest.value, onCue: (cue) => sound?.cue(cue), reducedMotion }).catch((error: unknown) => {
    console.error('Cutscene could not be built', error);
    return null;
  });
  if (!built || ended) {
    built?.destroy();
    end();
    return;
  }
  cutscene = built;
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
  <div class="cutscene-player" @pointerdown="skipByPointer">
    <div ref="frame" class="frame" :style="{ scale }" />
    <p class="hint" aria-hidden="true">Un geste pour passer</p>
  </div>
</template>

<style scoped>
.cutscene-player { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000; cursor: pointer; }
.frame { flex: none; width: 1920px; height: 1080px; }
.hint { position: absolute; right: 18px; bottom: 10px; margin: 0; color: rgb(255 255 255 / 0.45); font: 400 0.9rem / 1 var(--font-number); letter-spacing: 1px; pointer-events: none; }
</style>
