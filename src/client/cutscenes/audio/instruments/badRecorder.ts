import { recorderAccident } from '#src/client/cutscenes/audio/instruments/recorderAccident.ts';
import type { RecorderAccident } from '#src/client/cutscenes/audio/instruments/recorderAccident.ts';
import { recorderAccent, recorderPitch } from '#src/client/cutscenes/audio/instruments/recorderCurves.ts';
import { heldGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import type { Envelope } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { noiseHit } from '#src/client/cutscenes/audio/kit/hits.ts';
import { noiseSource } from '#src/client/cutscenes/audio/kit/noise.ts';
import { seededRandom } from '#src/client/cutscenes/audio/kit/seededRandom.ts';
import { biquad, level, oscillator, vibrato } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { Instrument, Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

const RECORDER_LEVEL = 0.2;
const RECORDER: Envelope = { attack: 0.028, decay: 0.12, sustain: 0.85, release: 0.04 };
/** Each note is off by up to this many cents, and the whole turn by up to half as much. */
const OFF_KEY_CENTS = 25;
/** The breath of a beginner: louder than a player's. */
const BREATH_LEVEL = 0.35;

/** How late the note comes, in seconds: a hair, or really late when the player was lost. Never early. */
function lateness(accident: RecorderAccident | null, seed: number): number {
  return accident === 'late' ? 0.09 + 0.08 * seededRandom(seed, 1) : seededRandom(seed, 1) * 0.025;
}

/** How far off the note is, in cents: its own error, plus the error of the whole turn. */
function offKey(iteration: number, seed: number): number {
  const turn = iteration === 0 ? -14 : (seededRandom(iteration, 5) - 0.5) * OFF_KEY_CENTS;
  return turn + (seededRandom(seed, 2) - 0.5) * 2 * OFF_KEY_CENTS;
}

/** One note of a school recorder, badly blown: a hollow pipe, a lot of breath, a wavering pitch and its accident. */
function playRecorder(context: BaseAudioContext, out: AudioNode, at: number, note: Note, accident: RecorderAccident | null): void {
  const { frequency, seconds, velocity, index, iteration } = note;
  const seed = iteration * 977 + index;
  const start = at + lateness(accident, seed);
  const hold = Math.max(0.06, seconds - Math.max(0, start - at));
  const { gain, end } = heldGain(context, out, start, RECORDER_LEVEL * velocity, hold, RECORDER);
  const accent = context.createGain();
  recorderAccent(accent.gain, start, hold, accident, seed);
  accent.connect(gain);
  const tone = biquad(context, 'lowpass', Math.min(frequency * 6, 9000), 0.5, start);
  tone.connect(accent);
  const pipe = oscillator(context, 'triangle', frequency, start, end);
  const octave = oscillator(context, 'sine', frequency * 2, start, end);
  pipe.connect(tone);
  octave.connect(level(context, tone, 0.07));
  const cents = offKey(iteration, seed);
  for (const source of [pipe, octave]) recorderPitch(source.detune, start, hold, cents, accident, seed);
  const pitches = [pipe.detune, octave.detune];
  vibrato(context, pitches, start, end, 3.4 + seededRandom(seed, 3), accident === 'squeal' ? 38 : 9, 0.05);
  vibrato(context, pitches, start, end, 6.3, 5, 0.05);
  const breath = biquad(context, 'bandpass', Math.min(frequency * 2.3, 8000), 0.9, start);
  noiseSource(context, start, end - start, seed).connect(breath);
  breath.connect(level(context, gain, accident === 'airy' ? BREATH_LEVEL * 2.5 : BREATH_LEVEL));
  noiseHit(context, out, start, { filter: 'bandpass', from: Math.min(frequency * 4, 9000), q: 1.8, duration: 0.04, gain: 0.06 * velocity, seed: seed + 1 });
}

/**
 * A school recorder in the hands of a beginner. `firstTurn` places the accidents of the first turn, by the index of
 * the note; after that, they fall where luck puts them.
 */
export function createBadRecorder(firstTurn: Partial<Record<number, RecorderAccident>>): Instrument {
  return function badRecorder(context: BaseAudioContext, out: AudioNode, at: number, note: Note): void {
    playRecorder(context, out, at, note, recorderAccident(note, firstTurn));
  };
}
