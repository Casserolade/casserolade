import { heldGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import type { Envelope } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { biquad, oscillator } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/** Three players a few cents apart: a section, not a soloist. */
const SECTION_CENTS = [-8, 0, 7];
const SWELL: Envelope = { attack: 1.1, decay: 0.8, sustain: 0.8, release: 0.7 };
const PAD: Envelope = { attack: 0.35, decay: 0.5, sustain: 0.9, release: 0.5 };
const STAB: Envelope = { attack: 0.006, decay: 0.12, sustain: 0.35, release: 0.12 };
/** The bow trembles this many times a second, each player at his own speed. */
const TREMOLO_HERTZ = 12.5;

/** The string section on one note, into `out`: three sawtooths, softened. Returns when it falls silent. */
function section(context: BaseAudioContext, out: AudioNode, at: number, { frequency, seconds, velocity }: Note, envelope: Envelope, loudness: number): number {
  const { gain, end } = heldGain(context, out, at, loudness * velocity, seconds, envelope);
  const tone = biquad(context, 'lowpass', Math.min(frequency * 5, 3800), 0.5, at);
  tone.connect(gain);
  for (const cents of SECTION_CENTS) {
    const player = oscillator(context, 'sawtooth', frequency, at, end);
    player.detune.setValueAtTime(cents, at);
    player.connect(tone);
  }
  return end;
}

/** Strings that tremble and swell: suspense. */
export function tremoloStrings(context: BaseAudioContext, out: AudioNode, at: number, note: Note): void {
  const tremble = context.createGain();
  tremble.gain.value = 0.55;
  tremble.connect(out);
  const end = section(context, tremble, at, note, SWELL, 0.06);
  const bow = oscillator(context, 'triangle', TREMOLO_HERTZ + (note.index % 3) * 0.9, at, end);
  const depth = context.createGain();
  depth.gain.value = 0.45;
  bow.connect(depth);
  depth.connect(tremble.gain);
}

/** Held strings, under a tune. */
export function stringPad(context: BaseAudioContext, out: AudioNode, at: number, note: Note): void {
  section(context, out, at, note, PAD, 0.045);
}

/** A short, hard bow stroke: the strings of an orchestral stab. */
export function stringStab(context: BaseAudioContext, out: AudioNode, at: number, note: Note): void {
  section(context, out, at, note, STAB, 0.08);
}
