import { SYNTH_SOUNDS } from '#src/client/services/synthSounds.ts';
import type { SoundEffect } from '#src/client/cutscenes/audio/effects/soundEffectTypes.ts';
import { heldGain, pluckGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { noiseHit, toneHit } from '#src/client/cutscenes/audio/kit/hits.ts';
import { freshSeed, noiseSource } from '#src/client/cutscenes/audio/kit/noise.ts';
import { biquad, level, oscillator } from '#src/client/cutscenes/audio/kit/sources.ts';

const WHISTLE_HERTZ = 2950;
/** The pea in the whistle rattles this fast: the trill of a referee. */
const PEA_HERTZ = 41;
/** The bell of a cash register: [ratio, how long it rings]. */
const TILL_BELL: [number, number][] = [[1, 0.65], [2, 0.42], [2.76, 0.3], [5.4, 0.15]];
const TILL_BELL_HERTZ = 1760;
const SHIMMER_HERTZ = [1046, 1318, 1568, 2093, 2637];

/** One blast of a referee's whistle. */
function blast(context: BaseAudioContext, out: AudioNode, at: number, seconds: number, loudness: number): void {
  const { gain, end } = heldGain(context, out, at, loudness, seconds, { attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.03 });
  const trill = context.createGain();
  trill.gain.value = 0.62;
  trill.connect(gain);
  const whistle = oscillator(context, 'sine', WHISTLE_HERTZ, at, end);
  whistle.frequency.linearRampToValueAtTime(WHISTLE_HERTZ * 1.03, at + seconds);
  whistle.connect(trill);
  oscillator(context, 'sine', WHISTLE_HERTZ * 2, at, end).connect(level(context, trill, 0.06));
  for (const [rate, depth] of [[PEA_HERTZ, 120], [PEA_HERTZ * 1.31, 60]]) {
    const pea = oscillator(context, 'triangle', rate, at, end);
    pea.connect(level(context, whistle.frequency, depth));
    pea.connect(level(context, trill.gain, 0.19));
  }
  const breath = biquad(context, 'bandpass', WHISTLE_HERTZ, 1.5, at);
  noiseSource(context, at, end - at, freshSeed()).connect(breath);
  breath.connect(level(context, gain, 0.22));
}

/** A spring: « boing », the pitch rising as the wobble slows down. */
export const BOING: SoundEffect = {
  seconds: 0.85,
  play(context, out, at) {
    const end = at + 0.8;
    const gain = pluckGain(context, out, at, 0.2, 0.004, 0.75);
    const twang = biquad(context, 'bandpass', 500, 4, at);
    twang.frequency.exponentialRampToValueAtTime(1400, at + 0.06);
    twang.frequency.exponentialRampToValueAtTime(600, at + 0.5);
    twang.connect(gain);
    const wobble = oscillator(context, 'sine', 16, at, end);
    wobble.frequency.linearRampToValueAtTime(9, at + 0.7);
    const depth = context.createGain();
    depth.gain.setValueAtTime(55, at);
    depth.gain.exponentialRampToValueAtTime(3, at + 0.7);
    wobble.connect(depth);
    for (const [type, into] of [['sawtooth', twang], ['sine', level(context, gain, 0.6)]] as const) {
      const spring = oscillator(context, type, 150, at, end);
      spring.frequency.linearRampToValueAtTime(205, at + 0.6);
      depth.connect(spring.frequency);
      spring.connect(into);
    }
  },
};

/** The referee: a short blast, then a long one. */
export const SIFFLET: SoundEffect = {
  seconds: 0.95,
  play(context, out, at) {
    blast(context, out, at, 0.13, 0.11);
    blast(context, out, at + 0.21, 0.6, 0.13);
  },
};

/** Beamed away: a trembling shimmer and a buzzing sweep that rise together, a whoosh, and a zap. */
export const TELEPORTATION: SoundEffect = {
  seconds: 1.3,
  play(context, out, at) {
    const shimmer = context.createGain();
    shimmer.gain.setValueAtTime(0, at);
    shimmer.gain.linearRampToValueAtTime(0.04, at + 0.35);
    shimmer.gain.setValueAtTime(0.04, at + 0.75);
    shimmer.gain.linearRampToValueAtTime(0, at + 1.05);
    shimmer.connect(out);
    SHIMMER_HERTZ.forEach((hertz, number) => {
      const tone = oscillator(context, 'sine', hertz, at, at + 1.1);
      tone.frequency.exponentialRampToValueAtTime(hertz * 1.5, at + 0.95);
      const tremble = level(context, shimmer, 0.5);
      oscillator(context, 'square', 19 + number * 4.3, at, at + 1.1).connect(level(context, tremble.gain, 0.5));
      tone.connect(tremble);
    });
    const { gain, end } = heldGain(context, out, at, 0.05, 0.85, { attack: 0.1, decay: 0.2, sustain: 1, release: 0.08 });
    const buzz = biquad(context, 'bandpass', 400, 2, at);
    buzz.frequency.exponentialRampToValueAtTime(3200, at + 0.9);
    buzz.connect(gain);
    const sweep = oscillator(context, 'sawtooth', 180, at, end);
    sweep.frequency.exponentialRampToValueAtTime(2600, at + 0.9);
    sweep.connect(buzz);
    const seed = freshSeed();
    noiseHit(context, out, at, { filter: 'bandpass', from: 500, to: 7000, q: 1.5, duration: 0.9, gain: 0.07, attack: 0.3, seed });
    toneHit(context, out, at, { type: 'square', from: 2400, to: 120, start: 0.92, duration: 0.18, gain: 0.07 });
    noiseHit(context, out, at, { filter: 'highpass', from: 3000, start: 0.92, duration: 0.03, gain: 0.12, seed: seed + 1 });
  },
};

/** The cash register: ka (the lever), ching (the bell), the drawer that rolls out, and the coins. */
export const TIROIR_CAISSE: SoundEffect = {
  seconds: 1.2,
  play(context, out, at) {
    const seed = freshSeed();
    noiseHit(context, out, at, { filter: 'lowpass', from: 2200, duration: 0.03, gain: 0.25, seed });
    toneHit(context, out, at, { type: 'square', from: 300, to: 120, duration: 0.035, gain: 0.07 });
    noiseHit(context, out, at, { filter: 'highpass', from: 2500, start: 0.07, duration: 0.012, gain: 0.18, seed: seed + 1 });
    for (const [ratio, seconds] of TILL_BELL) {
      for (const shift of [-2, 2]) toneHit(context, out, at, { from: TILL_BELL_HERTZ * ratio + shift, start: 0.1, duration: seconds, gain: 0.08 / ratio, attack: 0.001 });
    }
    noiseHit(context, out, at, { filter: 'bandpass', from: 1200, to: 600, q: 1.5, start: 0.12, duration: 0.3, gain: 0.07, attack: 0.02, seed: seed + 2 });
    noiseHit(context, out, at, { filter: 'lowpass', from: 1500, start: 0.42, duration: 0.05, gain: 0.2, seed: seed + 3 });
    toneHit(context, out, at, { from: 180, to: 90, start: 0.42, duration: 0.06, gain: 0.14 });
    SYNTH_SOUNDS.coins.play(context, out, at + 0.45, { pitch: 1, gain: 0.8 });
  },
};
