import type { RecorderAccident } from '#src/client/cutscenes/audio/instruments/recorderAccident.ts';
import { seededRandom } from '#src/client/cutscenes/audio/kit/seededRandom.ts';

const OCTAVE_CENTS = 1200;
/** Out of breath at the end of a long note, the pitch sinks this far. */
const SAG_CENTS = 40;
/** After a crack, the breath comes back too hard: sharp. */
const CRACK_SHARP_CENTS = 35;

/** How long a squeak lasts before it cracks down to the note. */
function squeakSeconds(seed: number): number {
  return 0.08 + 0.09 * seededRandom(seed, 4);
}

/** When the breath fails in a cracked note, and how long. */
function crackTiming(start: number, hold: number): { from: number; to: number } {
  return { from: start + hold * 0.42, to: start + hold * 0.42 + 0.13 };
}

/**
 * The pitch of a note, in cents off what is written: off-key from the start (`cents`), then its accident, then a
 * long note sags as the breath runs out.
 */
export function recorderPitch(param: AudioParam, start: number, hold: number, cents: number, accident: RecorderAccident | null, seed: number): void {
  let settled = cents;
  if (accident === 'squeal') param.setValueAtTime(cents + OCTAVE_CENTS, start);
  else if (accident === 'squeak') {
    param.setValueAtTime(cents + OCTAVE_CENTS, start);
    param.setValueAtTime(cents, start + squeakSeconds(seed));
  } else if (accident === 'wrong') {
    const wrong = seededRandom(seed, 6) < 0.5 ? -100 : 100;
    param.setValueAtTime(cents + wrong, start);
    param.setValueAtTime(cents + wrong, start + 0.17);
    param.linearRampToValueAtTime(cents, start + 0.25);
  } else if (accident === 'airy') {
    param.setValueAtTime(cents - 70, start);
    param.setValueAtTime(cents - 70, start + 0.12);
    param.linearRampToValueAtTime(cents, start + 0.21);
  } else if (accident === 'crack') {
    param.setValueAtTime(cents, start);
    settled = cents + CRACK_SHARP_CENTS;
    param.setValueAtTime(settled, crackTiming(start, hold).to);
  } else param.setValueAtTime(cents, start);
  if (hold <= 0.5 || accident === 'squeal') return;
  const sagFrom = Math.max(start + hold * 0.45, start + 0.3, crackTiming(start, hold).to + 0.02);
  param.setValueAtTime(settled, sagFrom);
  param.linearRampToValueAtTime(settled - SAG_CENTS, start + hold);
}

/** The loudness of the tone over its envelope: the burst of a squeak or a squeal, the hole of a crack or of air. */
export function recorderAccent(param: AudioParam, start: number, hold: number, accident: RecorderAccident | null, seed: number): void {
  param.setValueAtTime(1, start);
  if (accident === 'squeal') param.setValueAtTime(1.35, start);
  else if (accident === 'squeak') {
    param.setValueAtTime(1.6, start);
    param.setValueAtTime(1, start + squeakSeconds(seed));
  } else if (accident === 'airy') {
    param.setValueAtTime(0, start);
    param.setValueAtTime(0, start + 0.12);
    param.linearRampToValueAtTime(1, start + 0.2);
  } else if (accident === 'crack') {
    const { from, to } = crackTiming(start, hold);
    param.setValueAtTime(1, from);
    param.linearRampToValueAtTime(0.04, from + 0.025);
    param.setValueAtTime(0.04, to - 0.03);
    param.linearRampToValueAtTime(1.15, to);
  }
}
