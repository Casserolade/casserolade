import { heldGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import type { Envelope } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { noiseSource } from '#src/client/cutscenes/audio/kit/noise.ts';
import { biquad, level, oscillator, vibrato } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

const SAX_LEVEL = 0.15;
const SAX_ENVELOPE: Envelope = { attack: 0.012, decay: 0.07, sustain: 0.78, release: 0.045 };
/** The honk: the sax plays through its nose. */
const NOSE_HERTZ = 1350;
const BUZZ_HERTZ = 2900;
/** It smears into each note from this far under, in cents. */
const SMEAR_CENTS = 55;

/**
 * A nasal saxophone, for chases: a reed and a hollow body through two honking resonances, a filter that opens with
 * the breath, a breath of air, and a smear into each note.
 */
export function sax(context: BaseAudioContext, out: AudioNode, at: number, { frequency, seconds, velocity, index }: Note): void {
  const { gain, end } = heldGain(context, out, at, SAX_LEVEL * velocity, seconds, SAX_ENVELOPE);
  const tone = biquad(context, 'lowpass', frequency * 2, 0.9, at);
  tone.frequency.linearRampToValueAtTime(Math.min(frequency * 9, 6500), at + 0.03);
  tone.frequency.setTargetAtTime(Math.min(frequency * 5.5, 5000), at + 0.03, 0.08);
  const nose = biquad(context, 'peaking', NOSE_HERTZ, 1.6, at, 9);
  const buzz = biquad(context, 'peaking', BUZZ_HERTZ, 2.2, at, 5);
  nose.connect(buzz);
  buzz.connect(tone);
  tone.connect(gain);
  const reed = oscillator(context, 'sawtooth', frequency, at, end);
  const body = oscillator(context, 'square', frequency, at, end);
  [reed, body].forEach((source) => {
    source.detune.setValueAtTime(-SMEAR_CENTS, at);
    source.detune.linearRampToValueAtTime(0, at + 0.04);
  });
  reed.connect(nose);
  body.connect(level(context, nose, 0.45));
  const air = biquad(context, 'bandpass', 2600, 1.4, at);
  noiseSource(context, at, end - at, index).connect(air);
  air.connect(level(context, gain, 0.05));
  if (seconds > 0.3) vibrato(context, [reed.detune, body.detune], at + 0.15, end, 5.8, 14, 0.2);
}
