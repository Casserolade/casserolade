import { ref } from 'vue';
import { SYNTH_SOUNDS } from '#src/client/services/synthSounds.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { heardVoices } from '#src/client/stores/heardVoices.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { claimSpeech, claimVoice, createMixerState, varySound } from '#src/client/tools/soundMixer.ts';

export type { SynthName } from '#src/client/services/synthSounds.ts';

const MUTED_KEY = 'casserolade-son-coupe';
const VOLUME_KEY = 'casserolade-volume';
const DEFAULT_VOLUME = 0.6;
/** The recipes are written quiet; at the default volume they peak around -15 dB, under the voices. */
const MASTER_CEILING = 1.4;
/**
 * The greeting, shouted: Macron at the Porte de Versailles, 10 December 2016. Loud in the file, so turned down.
 * The full shout when the manifest has it, else the short cut.
 */
/** Macron's « parce que c'est notre projet ! », shouted: in sons/accueil, apart from the quotes. */
const WELCOME_SOUND = 'cest_notre_projet_complet';
const WELCOME_GAIN = 0.45;
/**
 * The real voices of the quotes: about -17 dB in their files, against -12 for the shout. At this gain
 * they stay under the welcome shout and over the table's sounds, at any volume.
 */
const VOICE_GAIN = 0.45;
/** A voice is a short sound effect: a longer file is faded out there. */
const MAX_VOICE_SECONDS = 9;
const VOICE_FADE_SECONDS = 0.4;
/** A hit this strong also gets the recorded punch, quietly. */
const BIG_HIT = 1.4;
const PUNCH_GAIN = 0.28;
/** Some sounds come in bursts during a combat: they wait longer before playing again. */
const GAPS_MS: Partial<Record<SynthName, number>> = { hit: 80, lunge: 110, bonk: 140, fall: 160, clang: 90, sell: 70 };

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('Sound setting could not be saved', error);
  }
}

function readVolume(): number {
  const stored = readStored(VOLUME_KEY);
  const value = stored === null || stored === '' ? Number.NaN : Number(stored);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
}

/** Shared by every sound control of the page: muting in combat mutes the home screen too. */
export const soundSettings = { muted: ref(readStored(MUTED_KEY) === '1'), volume: ref(readVolume()) };

let context: AudioContext | null = null;
let master: GainNode | null = null;
const mixer = createMixerState();
const samples = new Map<string, Promise<AudioBuffer | null>>();

function masterLevel(): number {
  return soundSettings.muted.value ? 0 : soundSettings.volume.value * MASTER_CEILING;
}

function applyLevel(): void {
  if (context && master) master.gain.setTargetAtTime(masterLevel(), context.currentTime, 0.02);
}

export function isSoundMuted(): boolean {
  return soundSettings.muted.value;
}

export function setSoundMuted(value: boolean): void {
  soundSettings.muted.value = value;
  store(MUTED_KEY, value ? '1' : '0');
  applyLevel();
  if (value) welcomeVoice?.pause();
}

export function setSoundVolume(value: number): void {
  soundSettings.volume.value = Math.min(1, Math.max(0, value));
  store(VOLUME_KEY, String(soundSettings.volume.value));
  applyLevel();
  if (welcomeVoice) welcomeVoice.volume = Math.min(1, soundSettings.volume.value * WELCOME_GAIN);
}

/** The audio graph, made at the first sound: browsers only let it play after a gesture. */
function audio(): { context: AudioContext; master: GainNode } | null {
  if (context && master) {
    if (context.state === 'suspended') context.resume().catch(() => undefined);
    return { context, master };
  }
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  try {
    context = new AudioContext();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.ratio.value = 6;
    master = context.createGain();
    master.gain.value = masterLevel();
    master.connect(limiter);
    limiter.connect(context.destination);
    return { context, master };
  } catch (error) {
    console.error('Audio could not start', error);
    return null;
  }
}

/**
 * A short sound of the table, made in code. `strength` makes it louder or softer (a big hit, a small one).
 * Never twice in the same instant, never more than a few at once, and each time a little different.
 */
export function playSound(name: SynthName, strength = 1): void {
  if (soundSettings.muted.value) return;
  const graph = audio();
  if (!graph) return;
  const recipe = SYNTH_SOUNDS[name];
  if (!claimVoice(mixer, name, performance.now(), recipe.seconds * 1000, GAPS_MS[name])) return;
  const variation = varySound(Math.random(), Math.random());
  const level = Math.min(1.6, Math.max(0.4, strength));
  try {
    recipe.play(graph.context, graph.master, graph.context.currentTime + 0.005, { pitch: variation.pitch, gain: variation.gain * level });
  } catch (error) {
    console.error('Sound could not play', name, error);
  }
  if (name === 'hit' && strength >= BIG_HIT) playSample('coup', PUNCH_GAIN * level);
}

function loadSample(name: string, path = gameArt.manifest.value.sons.bruitages?.[name]): Promise<AudioBuffer | null> {
  const cached = samples.get(path ?? name);
  if (cached) return cached;
  const graph = audio();
  const loading = !path || !graph
    ? Promise.resolve(null)
    : fetch(assetUrl(path)).then((response) => response.arrayBuffer()).then((data) => graph.context.decodeAudioData(data)).catch(() => null);
  samples.set(path ?? name, loading);
  return loading;
}

/** Loads a real voice ahead of time, so that it starts with its bubble. */
export function preloadVoice(key: string | null): void {
  const path = key ? gameArt.manifest.value.sons.citations?.[key] : undefined;
  if (path && !soundSettings.muted.value) void loadSample(`voice-${key}`, path);
}

/**
 * A real voice of the manifest (`sons.citations`), never altered: one at a time, never cutting the one
 * that speaks, under the welcome shout, and never twice in the same game (heardVoices). Resolves to how long it
 * speaks, in milliseconds, once it starts: the bubble that shows its words stays at least that long. 0 when it does
 * not play.
 */
export async function playVoice(key: string | null): Promise<number> {
  const path = key ? gameArt.manifest.value.sons.citations?.[key] : undefined;
  if (!key || !path || soundSettings.muted.value || heardVoices.has(key)) return 0;
  const buffer = await loadSample(`voice-${key}`, path);
  const graph = audio();
  if (!buffer || !graph || soundSettings.muted.value) return 0;
  const seconds = Math.min(buffer.duration, MAX_VOICE_SECONDS);
  if (!claimSpeech(mixer, performance.now(), seconds * 1000)) return 0;
  try {
    const start = graph.context.currentTime + 0.01;
    const source = graph.context.createBufferSource();
    const level = graph.context.createGain();
    source.buffer = buffer;
    level.gain.setValueAtTime(VOICE_GAIN, start);
    source.connect(level);
    level.connect(graph.master);
    source.start(start);
    heardVoices.remember(key);
    if (buffer.duration > MAX_VOICE_SECONDS) {
      level.gain.setValueAtTime(VOICE_GAIN, start + seconds - VOICE_FADE_SECONDS);
      level.gain.linearRampToValueAtTime(0, start + seconds);
      source.stop(start + seconds);
    }
  } catch (error) {
    console.error('Voice could not play', key, error);
    return 0;
  }
  return seconds * 1000;
}

/** A recorded sound effect of the manifest, at a low gain and slightly varied. Silence if it is missing. */
export function playSample(name: string, gain: number): void {
  if (soundSettings.muted.value) return;
  loadSample(name).then((buffer) => {
    const graph = audio();
    if (!buffer || !graph || !claimVoice(mixer, `sample-${name}`, performance.now(), buffer.duration * 1000)) return;
    const variation = varySound(Math.random(), Math.random());
    const source = graph.context.createBufferSource();
    const level = graph.context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = variation.pitch;
    level.gain.value = gain * variation.gain;
    source.connect(level);
    level.connect(graph.master);
    source.start();
  }).catch(() => undefined);
}

let welcomeVoice: HTMLAudioElement | null = null;

/** The shout's player, made once and played again at each click on the logo. */
function welcomeAudio(): HTMLAudioElement | null {
  const path = gameArt.manifest.value.sons.accueil?.[WELCOME_SOUND];
  if (!path) return null;
  welcomeVoice ??= new Audio(assetUrl(path));
  welcomeVoice.volume = Math.min(1, soundSettings.volume.value * WELCOME_GAIN);
  return welcomeVoice;
}

/** The easter egg of the logo, its only use: the shout, from the start, each time it is clicked. */
export function shout(): void {
  const voice = soundSettings.muted.value ? null : welcomeAudio();
  if (!voice) return;
  voice.currentTime = 0;
  voice.play().catch(() => undefined);
}

