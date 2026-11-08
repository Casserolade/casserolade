import { heldGain, pluckGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import type { Envelope } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { biquad, level, oscillator } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

const PAD: Envelope = { attack: 1.4, decay: 1, sustain: 0.9, release: 1.8 };
const PAD_CENTS = [-11, 0, 10];
/** The pad's filter breathes this slowly, by this many hertz. */
const BREATH_HERTZ = 0.13;
const BREATH_DEPTH = 450;

/** A slow, wide nebula of detuned sawtooths, its filter breathing. */
export function spacePad(context: BaseAudioContext, out: AudioNode, at: number, { frequency, seconds, velocity, index }: Note): void {
  const { gain, end } = heldGain(context, out, at, 0.035 * velocity, seconds, PAD);
  const tone = biquad(context, 'lowpass', 900, 2.4, at);
  const breath = oscillator(context, 'sine', BREATH_HERTZ + (index % 3) * 0.03, at, end);
  breath.connect(level(context, tone.frequency, BREATH_DEPTH));
  tone.connect(gain);
  for (const cents of PAD_CENTS) {
    const voice = oscillator(context, 'sawtooth', frequency, at, end);
    voice.detune.setValueAtTime(cents, at);
    voice.connect(tone);
  }
  oscillator(context, 'triangle', frequency * 2, at, end).connect(level(context, gain, 0.4));
}

/** The blip of an onboard computer. */
export function bleep(context: BaseAudioContext, out: AudioNode, at: number, { frequency, velocity }: Note): void {
  const tone = biquad(context, 'lowpass', 3200, 0.7, at);
  tone.connect(pluckGain(context, out, at, 0.045 * velocity, 0.002, 0.14));
  oscillator(context, 'square', frequency, at, at + 0.16).connect(tone);
}

/**
 * A flying saucer going by for the whole note: a warbling whine that crosses from left to right and drops as it
 * passes, as a siren does.
 */
export function saucer(context: BaseAudioContext, out: AudioNode, at: number, { seconds, velocity }: Note): void {
  const end = at + seconds;
  const place = context.createStereoPanner();
  place.pan.setValueAtTime(-0.9, at);
  place.pan.linearRampToValueAtTime(0.9, end);
  place.connect(out);
  const loudness = context.createGain();
  loudness.gain.setValueAtTime(0, at);
  loudness.gain.linearRampToValueAtTime(0.05 * velocity, at + seconds * 0.45);
  loudness.gain.linearRampToValueAtTime(0, end);
  loudness.connect(place);
  const whine = oscillator(context, 'sine', 980, at, end);
  whine.frequency.setValueAtTime(980, at + seconds * 0.4);
  whine.frequency.exponentialRampToValueAtTime(700, at + seconds * 0.6);
  const warble = oscillator(context, 'sine', 7.5, at, end);
  warble.connect(level(context, whine.frequency, 130));
  whine.connect(loudness);
}
