import { HORN_VOICES } from '#src/client/cutscenes/audio/const/hornVoices.ts';
import type { HornVoice } from '#src/client/cutscenes/audio/const/hornVoices.ts';
import type { SoundEffect } from '#src/client/cutscenes/audio/effects/soundEffectTypes.ts';
import { heldGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { freshSeed, noiseSource } from '#src/client/cutscenes/audio/kit/noise.ts';
import { biquad, level, oscillator } from '#src/client/cutscenes/audio/kit/sources.ts';

/** The French two-tone siren of the police: la, then ré, three times. */
const SIREN_TONES = [435, 580];
const SIREN_TONE_SECONDS = 0.42;
const SIREN_CYCLES = 3;
/** The pitch rises this much as it comes, and falls as much once it has passed. */
const DOPPLER = 0.025;

/** One squeeze of a bulb horn. */
function honk(context: BaseAudioContext, out: AudioNode, at: number, voice: HornVoice): void {
  const { pitch, length, squeeze, letGo } = voice;
  const { gain, end } = heldGain(context, out, at, voice.level, length, { attack: 0.012, decay: 0.06, sustain: 0.85, release: 0.04 });
  const tone = biquad(context, 'lowpass', 3600, 0.7, at);
  const bell = biquad(context, 'peaking', voice.bell, 2, at, voice.bellGain);
  bell.connect(tone);
  tone.connect(gain);
  for (const [type, cents] of [['sawtooth', -7], ['square', 7]] as const) {
    const reed = oscillator(context, type, pitch * squeeze, at, end);
    reed.detune.setValueAtTime(cents, at);
    reed.frequency.exponentialRampToValueAtTime(pitch, at + 0.035);
    reed.frequency.setValueAtTime(pitch, at + length - 0.06);
    reed.frequency.exponentialRampToValueAtTime(pitch * letGo, at + length);
    reed.connect(bell);
  }
  const air = biquad(context, 'bandpass', 2400, 1, at);
  noiseSource(context, at, end - at, freshSeed()).connect(air);
  air.connect(level(context, gain, 0.12));
}

/** The clown's horn: honk, honk. */
export const KLAXON: SoundEffect = {
  seconds: 0.65,
  play(context, out, at) {
    honk(context, out, at, HORN_VOICES.clown);
    honk(context, out, at + 0.3, { ...HORN_VOICES.clown, length: 0.27 });
  },
};

/** A bicycle horn: one squeeze. */
export const POUET: SoundEffect = {
  seconds: 0.3,
  play(context, out, at) {
    honk(context, out, at, HORN_VOICES.bicycle);
  },
};

/** The police go by: pin-pon, pin-pon, pin-pon, from left to right, the pitch dropping as they pass. */
export const SIRENE: SoundEffect = {
  seconds: 2.8,
  play(context, out, at) {
    const total = SIREN_CYCLES * SIREN_TONES.length * SIREN_TONE_SECONDS;
    const passing = at + total * 0.55;
    const place = context.createStereoPanner();
    place.pan.setValueAtTime(-0.8, at);
    place.pan.linearRampToValueAtTime(0.8, at + total);
    place.connect(out);
    const loudness = context.createGain();
    loudness.gain.setValueAtTime(0, at);
    loudness.gain.linearRampToValueAtTime(0.05, at + 0.05);
    loudness.gain.linearRampToValueAtTime(0.13, passing);
    loudness.gain.linearRampToValueAtTime(0.04, at + total);
    loudness.gain.linearRampToValueAtTime(0, at + total + 0.08);
    loudness.connect(place);
    const tone = biquad(context, 'lowpass', 4500, 0.7, at);
    const horn = biquad(context, 'peaking', 1300, 1.2, at, 6);
    horn.connect(tone);
    tone.connect(loudness);
    for (const [type, gain] of [['sawtooth', 1], ['square', 0.5]] as const) {
      const pipe = oscillator(context, type, SIREN_TONES[0], at, at + total + 0.1);
      for (let turn = 0; turn < SIREN_CYCLES * SIREN_TONES.length; turn++) {
        const time = at + turn * SIREN_TONE_SECONDS;
        const doppler = 1 - DOPPLER * Math.tanh((time - passing) / 0.25);
        pipe.frequency.setTargetAtTime(SIREN_TONES[turn % SIREN_TONES.length] * doppler, time, 0.012);
      }
      pipe.connect(level(context, horn, gain));
    }
  },
};
