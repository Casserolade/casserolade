import { heldGain, pluckGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import type { Envelope } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { noiseHit, toneHit } from '#src/client/cutscenes/audio/kit/hits.ts';
import { biquad, level, oscillator } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

const ORGAN: Envelope = { attack: 0.9, decay: 0.6, sustain: 1, release: 1.6 };
/** The stops of a small organ: [ratio to the note, loudness]. Eight feet, four feet, a twelfth, two feet. */
const ORGAN_STOPS: [number, number][] = [[1, 1], [2, 0.5], [3, 0.22], [4, 0.12]];

/** A tight synthesizer pluck: the urgent sixteenths under a news jingle. */
export function pluck(context: BaseAudioContext, out: AudioNode, at: number, { frequency, seconds, velocity }: Note): void {
  const decay = 0.16 + seconds;
  const tone = biquad(context, 'lowpass', Math.min(frequency * 14, 6000), 3, at);
  tone.frequency.exponentialRampToValueAtTime(Math.max(frequency * 1.6, 200), at + 0.14);
  tone.connect(pluckGain(context, out, at, 0.12 * velocity, 0.003, decay));
  for (const [type, cents] of [['sawtooth', -6], ['square', 6]] as const) {
    const source = oscillator(context, type, frequency, at, at + decay + 0.02);
    source.detune.setValueAtTime(cents, at);
    source.connect(tone);
  }
}

/** The beep of a wire service, pressing. */
export function ticker(context: BaseAudioContext, out: AudioNode, at: number, { frequency, velocity }: Note): void {
  toneHit(context, out, at, { type: 'triangle', from: frequency, duration: 0.07, gain: 0.06 * velocity, attack: 0.002 });
}

/** A soft organ, slow to speak: the drone of a funeral. */
export function organ(context: BaseAudioContext, out: AudioNode, at: number, { frequency, seconds, velocity }: Note): void {
  const { gain, end } = heldGain(context, out, at, 0.05 * velocity, seconds, ORGAN);
  const tone = biquad(context, 'lowpass', 2200, 0.5, at);
  tone.connect(gain);
  for (const [ratio, loudness] of ORGAN_STOPS) {
    const pipe = oscillator(context, 'sine', frequency * ratio, at, end);
    pipe.detune.setValueAtTime(ratio === 1 ? 0 : 3, at);
    pipe.connect(level(context, tone, loudness));
  }
}

/** A heart beating, tuned to the bass: a thump that drops. */
export function heartbeat(context: BaseAudioContext, out: AudioNode, at: number, { frequency, velocity, index }: Note): void {
  const pitch = frequency || 55;
  toneHit(context, out, at, { from: pitch * 2, to: pitch, glide: 0.05, duration: 0.32, gain: 0.5 * velocity, attack: 0.006 });
  noiseHit(context, out, at, { filter: 'lowpass', from: 260, duration: 0.08, gain: 0.18 * velocity, seed: index + 13 });
}
