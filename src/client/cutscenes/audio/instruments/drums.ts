import { noiseHit, toneHit } from '#src/client/cutscenes/audio/kit/hits.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/** The bass drum: a thump that drops, and the click of the beater. */
export function kick(context: BaseAudioContext, out: AudioNode, at: number, { velocity, index }: Note): void {
  toneHit(context, out, at, { from: 150, to: 44, glide: 0.08, duration: 0.3, gain: 0.5 * velocity });
  noiseHit(context, out, at, { filter: 'highpass', from: 2500, duration: 0.01, gain: 0.08 * velocity, seed: index });
}

/** The snare: the crack of the wires, and the body of the drum. */
export function snare(context: BaseAudioContext, out: AudioNode, at: number, { velocity, index }: Note): void {
  noiseHit(context, out, at, { filter: 'bandpass', from: 3600, q: 0.6, duration: 0.15, gain: 0.3 * velocity, seed: index + 11 });
  noiseHit(context, out, at, { filter: 'highpass', from: 6000, duration: 0.06, gain: 0.08 * velocity, seed: index + 23 });
  toneHit(context, out, at, { type: 'triangle', from: 235, to: 165, duration: 0.07, gain: 0.22 * velocity });
}

/** The closed hi-hat. */
export function hat(context: BaseAudioContext, out: AudioNode, at: number, { velocity, index }: Note): void {
  noiseHit(context, out, at, { filter: 'highpass', from: 7600, duration: 0.035, gain: 0.1 * velocity, seed: index + 37 });
}

/** A shaker, for the drive of a chase. */
export function shaker(context: BaseAudioContext, out: AudioNode, at: number, { velocity, index }: Note): void {
  noiseHit(context, out, at, { filter: 'bandpass', from: 6500, q: 1.1, attack: 0.012, duration: 0.05, gain: 0.07 * velocity, seed: index + 41 });
}

/** The crash cymbal: a long hiss over a few metallic partials. */
export function crash(context: BaseAudioContext, out: AudioNode, at: number, { velocity, index }: Note): void {
  noiseHit(context, out, at, { filter: 'highpass', from: 4200, duration: 1.8, gain: 0.13 * velocity, seed: index + 53 });
  noiseHit(context, out, at, { filter: 'bandpass', from: 8200, q: 1.5, duration: 0.9, gain: 0.07 * velocity, seed: index + 59 });
  [3150, 4870, 6230, 7710].forEach((from, number) =>
    toneHit(context, out, at, { type: 'square', from, duration: 0.5 - number * 0.06, gain: 0.006 * velocity }));
}

/** A woodblock, pitched by its note: the tic-tac of a clock, the tok-tok of a chase. */
export function woodblock(context: BaseAudioContext, out: AudioNode, at: number, { frequency, velocity, index }: Note): void {
  const pitch = frequency || 1600;
  toneHit(context, out, at, { from: pitch, duration: 0.06, gain: 0.16 * velocity, attack: 0.001 });
  toneHit(context, out, at, { from: pitch * 2.71, duration: 0.025, gain: 0.05 * velocity, attack: 0.001 });
  noiseHit(context, out, at, { filter: 'bandpass', from: pitch, q: 3, duration: 0.012, gain: 0.08 * velocity, attack: 0.001, seed: index + 67 });
}

/** A bass drum muffled with cloth, for a funeral. */
export function muffledDrum(context: BaseAudioContext, out: AudioNode, at: number, { velocity, index }: Note): void {
  toneHit(context, out, at, { from: 78, to: 52, duration: 0.7, gain: 0.45 * velocity, attack: 0.006 });
  noiseHit(context, out, at, { filter: 'lowpass', from: 320, duration: 0.18, gain: 0.2 * velocity, seed: index + 71 });
}
