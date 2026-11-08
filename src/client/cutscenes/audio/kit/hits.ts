import { pluckGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { noiseSource } from '#src/client/cutscenes/audio/kit/noise.ts';
import { biquad, oscillator } from '#src/client/cutscenes/audio/kit/sources.ts';

/** A tone that may slide from `from` to `to`, plucked: the building block of the hits and the bells. */
export interface ToneHit {
  type?: OscillatorType;
  from: number;
  to?: number;
  /** How long the slide takes; the whole sound by default. */
  glide?: number;
  start?: number;
  duration: number;
  gain: number;
  attack?: number;
  detune?: number;
}

/** A puff of filtered noise, plucked. `seed` chooses the noise: the same seed, the same puff. */
export interface NoiseHit {
  filter: BiquadFilterType;
  from: number;
  to?: number;
  q?: number;
  start?: number;
  duration: number;
  gain: number;
  attack?: number;
  seed: number;
}

/** Plays a plucked tone from `at`; returns its oscillator, for more automation. */
export function toneHit(context: BaseAudioContext, out: AudioNode, at: number, { type = 'sine', from, to, glide, start = 0, duration, gain, attack = 0.003, detune = 0 }: ToneHit): OscillatorNode {
  const begin = at + start;
  const source = oscillator(context, type, from, begin, begin + duration + 0.02);
  if (detune) source.detune.setValueAtTime(detune, begin);
  if (to !== undefined) source.frequency.exponentialRampToValueAtTime(to, begin + (glide ?? duration));
  source.connect(pluckGain(context, out, begin, gain, attack, duration));
  return source;
}

/** Plays a plucked puff of noise from `at`; returns its filter, for more automation. */
export function noiseHit(context: BaseAudioContext, out: AudioNode, at: number, { filter, from, to, q = 0.8, start = 0, duration, gain, attack = 0.003, seed }: NoiseHit): BiquadFilterNode {
  const begin = at + start;
  const shape = biquad(context, filter, from, q, begin);
  if (to !== undefined) shape.frequency.exponentialRampToValueAtTime(to, begin + duration);
  noiseSource(context, begin, duration + 0.02, seed).connect(shape);
  shape.connect(pluckGain(context, out, begin, gain, attack, duration));
  return shape;
}
