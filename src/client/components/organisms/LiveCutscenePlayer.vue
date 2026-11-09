<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { AudioClock } from '#src/client/cutscenes/AudioClock.ts';
import { soundSettings } from '#src/client/services/soundEffects.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { isHurryKey } from '#src/client/tools/isHurryKey.ts';
import type { CinematiqueComposee } from '#src/data/histoire/cinematique.ts';

/** The stage the pages are drawn for. */
const STAGE = { width: 1920, height: 1080 };
/** At most about 60 pictures a second, even on 120 Hz screens; 30 when the machine cannot keep up. */
const FRAME_MS = 14;
const SLOW_FRAME_MS = 30;
/** A page that does not get ready in this time is passed: nothing ever blocks the career. */
const READY_TIMEOUT_MS = 8000;
/** The mixes peak at -1 dBFS: at the default volume they sit with the game's voices. */
const SOUND_GAIN = 0.9;

interface Film {
  duration: number;
  seek: (time: number) => void;
  ready: Promise<unknown>;
}

/**
 * A career cutscene written with HyperFrames, drawn live in the page, never a video (rule of 9 November 2026): its page
 * runs in a frame, and on every screen frame the picture is drawn at the time of the sound, as in « Paul et Charlène ».
 * It plays by itself and the career goes on when it ends; a touch, a click or a key passes it.
 */
const props = defineProps<{ cinematique: CinematiqueComposee }>();
const emit = defineEmits<{ end: [] }>();

const frame = useTemplateRef<HTMLIFrameElement>('frame');
const scale = ref(1);
const audio = new Audio(assetUrl(props.cinematique.son));
const clock = new AudioClock(audio);
let film: Film | null = null;
let animation = 0;
let lastFrame = 0;
let averageFrame = FRAME_MS;
let frameMs = FRAME_MS;
let ended = false;

function fit(): void {
  scale.value = Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height);
}

function end(): void {
  if (ended) return;
  ended = true;
  cancelAnimationFrame(animation);
  audio.pause();
  emit('end');
}

function handleKey(event: KeyboardEvent): void {
  if (event.repeat || !(isHurryKey(event.key) || event.key === 'Escape')) return;
  event.preventDefault();
  end();
}

/** One screen frame: the picture at the time of the sound, and a watch on how long frames take. */
function tick(now: number): void {
  animation = requestAnimationFrame(tick);
  const elapsed = now - lastFrame;
  if (!film || elapsed < frameMs) return;
  lastFrame = now;
  averageFrame += (Math.min(elapsed, 250) - averageFrame) * 0.05;
  if (averageFrame > 48) frameMs = SLOW_FRAME_MS;
  const time = clock.timeAt(now);
  if (time >= film.duration) return end();
  film.seek(time);
}

function readyWithin(ready: Promise<unknown>): Promise<boolean> {
  const late = new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), READY_TIMEOUT_MS));
  return Promise.race([ready.then(() => true, () => true), late]);
}

async function start(): Promise<void> {
  const page = frame.value?.contentWindow as (Window & { __film?: Film }) | null | undefined;
  if (!page?.__film || !(await readyWithin(page.__film.ready)) || ended) return end();
  film = page.__film;
  film.seek(0);
  audio.volume = Math.min(1, soundSettings.volume.value * SOUND_GAIN);
  audio.muted = soundSettings.muted.value;
  // A browser that refuses the sound without a fresh gesture still shows the film, in silence.
  await audio.play().catch(() => clock.runSilently(performance.now()));
  if (ended) return;
  lastFrame = performance.now() - frameMs;
  animation = requestAnimationFrame(tick);
}

onMounted(() => {
  fit();
  audio.preload = 'auto';
  audio.addEventListener('ended', end);
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', handleKey);
});

onUnmounted(() => {
  window.removeEventListener('resize', fit);
  window.removeEventListener('keydown', handleKey);
  cancelAnimationFrame(animation);
  audio.pause();
  audio.removeAttribute('src');
});
</script>

<template>
  <div class="live-cutscene" @pointerdown="end">
    <iframe
      ref="frame"
      class="stage"
      :src="assetUrl(props.cinematique.page)"
      :title="props.cinematique.titre"
      :style="{ scale }"
      tabindex="-1"
      @load="start"
      @error="end"
    />
    <p class="hint" aria-hidden="true">Un geste pour passer</p>
  </div>
</template>

<style scoped>
.live-cutscene { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000; cursor: pointer; }
/* The page never takes the clicks: a gesture anywhere passes the cutscene. */
.stage { flex: none; width: 1920px; height: 1080px; border: 0; pointer-events: none; background: #000; }
.hint { position: absolute; right: 18px; bottom: 10px; margin: 0; color: rgb(255 255 255 / 0.45); font: 400 0.9rem / 1 var(--font-number); letter-spacing: 1px; pointer-events: none; }
</style>
