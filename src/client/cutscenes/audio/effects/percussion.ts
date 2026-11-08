import type { SoundEffect } from '#src/client/cutscenes/audio/effects/soundEffectTypes.ts';
import { noiseHit, toneHit } from '#src/client/cutscenes/audio/kit/hits.ts';
import { freshSeed, noiseSource } from '#src/client/cutscenes/audio/kit/noise.ts';
import { seededRandom } from '#src/client/cutscenes/audio/kit/seededRandom.ts';
import { biquad } from '#src/client/cutscenes/audio/kit/sources.ts';

const ROLL_SECONDS = 1.7;
const ROLL_STROKES_PER_SECOND = 26;
/** The partials of a boxing-ring bell: [ratio, loudness, how long it rings]. */
const RING_BELL: [number, number, number][] = [[1, 1, 1.6], [2, 0.42, 1], [2.76, 0.5, 0.7], [3.4, 0.25, 0.5], [5.4, 0.18, 0.3], [6.8, 0.1, 0.18]];
const RING_BELL_HERTZ = 830;
const GONG_HERTZ = 72;
const GONG_PARTIALS = 16;

/** The roll's last stroke: a hard crack of the snare over a bass drum, and a splash of cymbal. */
function accent(context: BaseAudioContext, out: AudioNode, at: number, seed: number): void {
  noiseHit(context, out, at, { filter: 'bandpass', from: 3000, q: 0.5, duration: 0.22, gain: 0.32, seed });
  toneHit(context, out, at, { type: 'triangle', from: 210, to: 150, duration: 0.12, gain: 0.22 });
  toneHit(context, out, at, { from: 92, to: 50, duration: 0.4, gain: 0.32 });
  noiseHit(context, out, at, { filter: 'highpass', from: 5000, duration: 1.2, gain: 0.09, seed: seed + 1 });
}

/** One strike of the ring bell, each partial doubled for the shimmer. */
function strikeBell(context: BaseAudioContext, out: AudioNode, at: number, gain: number): void {
  for (const [ratio, loudness, seconds] of RING_BELL) {
    for (const shift of [-0.8, 0.8]) toneHit(context, out, at, { from: RING_BELL_HERTZ * ratio + shift, duration: seconds, gain: (gain * loudness) / 2, attack: 0.001 });
  }
  noiseHit(context, out, at, { filter: 'highpass', from: 3000, duration: 0.015, gain: gain * 0.5, seed: freshSeed() });
}

/** A drum roll that swells, and its final crack: the moment before the news. */
export const TAMBOUR: SoundEffect = {
  seconds: 3,
  play(context, out, at) {
    const seed = freshSeed();
    const strokes = Math.round(ROLL_SECONDS * ROLL_STROKES_PER_SECOND);
    for (let stroke = 0; stroke < strokes; stroke++) {
      const swell = 0.18 + 0.82 * (stroke / strokes) ** 1.6;
      const time = at + stroke / ROLL_STROKES_PER_SECOND + (seededRandom(seed, stroke) - 0.5) * 0.006;
      noiseHit(context, out, time, { filter: 'bandpass', from: 3200, q: 0.55, duration: 0.07, gain: 0.12 * swell * (stroke % 2 ? 0.85 : 1), seed: seed + stroke });
    }
    const wires = biquad(context, 'bandpass', 4500, 0.8, at);
    noiseSource(context, at, ROLL_SECONDS + 0.1, seed + 999).connect(wires);
    const buzz = context.createGain();
    buzz.gain.setValueAtTime(0.01, at);
    buzz.gain.linearRampToValueAtTime(0.07, at + ROLL_SECONDS);
    buzz.gain.linearRampToValueAtTime(0, at + ROLL_SECONDS + 0.05);
    wires.connect(buzz);
    buzz.connect(out);
    accent(context, out, at + ROLL_SECONDS, seed);
  },
};

/** A great tam-tam: a low boom, then a shimmer of metal that blooms after the strike and dies slowly. */
export const GONG: SoundEffect = {
  seconds: 5.5,
  play(context, out, at) {
    const seed = freshSeed();
    toneHit(context, out, at, { from: GONG_HERTZ, to: GONG_HERTZ * 0.86, duration: 2.6, gain: 0.3, attack: 0.008 });
    noiseHit(context, out, at, { filter: 'lowpass', from: 500, duration: 0.15, gain: 0.22, seed });
    for (let partial = 0; partial < GONG_PARTIALS; partial++) {
      const from = 110 * 1.27 ** partial * (0.95 + 0.1 * seededRandom(partial, 1));
      const bloom = 0.04 + partial * 0.035;
      toneHit(context, out, at, { from, to: from * 0.985, duration: 4.6 - partial * 0.2, gain: 0.04 / (1 + partial * 0.15), attack: bloom });
    }
    noiseHit(context, out, at, { filter: 'bandpass', from: 3500, q: 0.7, duration: 3.2, gain: 0.035, attack: 0.4, seed: seed + 1 });
  },
};

/** The bell of a boxing ring: ding, ding. A round begins. */
export const CLOCHE: SoundEffect = {
  seconds: 2.4,
  play(context, out, at) {
    strikeBell(context, out, at, 0.2);
    strikeBell(context, out, at + 0.38, 0.17);
  },
};
