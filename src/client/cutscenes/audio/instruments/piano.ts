import { pluckGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { noiseSource } from '#src/client/cutscenes/audio/kit/noise.ts';
import { seededRandom } from '#src/client/cutscenes/audio/kit/seededRandom.ts';
import { biquad } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

const PIANO_LEVEL = 0.11;
/** The two strings of each key, this far apart in cents: the honky-tonk of a saloon piano. */
const STRING_CENTS = [-10, 9];
/** And each key a little out of tune, always the same way, up to this many cents. */
const KEY_CENTS = 9;
const HARMONICS = 24;
/** Where the hammer hits the string, as a share of its length: it shapes the harmonics. */
const HAMMER_POINT = 0.13;
const waves = new WeakMap<BaseAudioContext, PeriodicWave>();

/** The spectrum of a struck string, built once per audio context. */
function stringWave(context: BaseAudioContext): PeriodicWave {
  const cached = waves.get(context);
  if (cached) return cached;
  const real = new Float32Array(HARMONICS);
  const imaginary = new Float32Array(HARMONICS);
  for (let harmonic = 1; harmonic < HARMONICS; harmonic++) imaginary[harmonic] = Math.abs(Math.sin(Math.PI * harmonic * HAMMER_POINT)) / harmonic ** 1.05;
  const wave = context.createPeriodicWave(real, imaginary);
  waves.set(context, wave);
  return wave;
}

/**
 * An upright piano of a silent-film theatre, a bit out of tune: two strings per key, a tone that dulls as it rings,
 * the low keys ringing longer, the felt of the hammer, and the damper that falls when the key is let go.
 */
export function piano(context: BaseAudioContext, out: AudioNode, at: number, { frequency, seconds, velocity, index }: Note): void {
  const ring = Math.min(5, Math.max(0.7, 4 * (130 / frequency) ** 0.55));
  const release = at + Math.max(seconds, 0.02);
  const end = Math.min(at + ring * 1.3, release + 0.3);
  const loudness = context.createGain();
  loudness.gain.setValueAtTime(0, at);
  loudness.gain.linearRampToValueAtTime(PIANO_LEVEL * velocity, at + 0.003);
  loudness.gain.setTargetAtTime(0, at + 0.003, ring / 4.5);
  loudness.gain.setTargetAtTime(0, release, 0.05);
  loudness.connect(out);
  const tone = biquad(context, 'lowpass', Math.min(frequency * (5 + 9 * velocity), 10000), 0.6, at);
  tone.frequency.setTargetAtTime(Math.min(frequency * 2.4, 6000), at + 0.01, ring / 5);
  tone.connect(loudness);
  const keyCents = (seededRandom(Math.round(frequency * 8), 3) - 0.5) * 2 * KEY_CENTS;
  for (const cents of STRING_CENTS) {
    const string = context.createOscillator();
    string.setPeriodicWave(stringWave(context));
    string.frequency.setValueAtTime(frequency, at);
    string.detune.setValueAtTime(cents + keyCents, at);
    string.connect(tone);
    string.start(at);
    string.stop(end);
  }
  const felt = biquad(context, 'bandpass', Math.min(frequency * 4, 5000), 0.9, at);
  noiseSource(context, at, 0.05, index * 31 + Math.round(frequency)).connect(felt);
  felt.connect(pluckGain(context, out, at, 0.035 * velocity, 0.001, 0.035));
}
