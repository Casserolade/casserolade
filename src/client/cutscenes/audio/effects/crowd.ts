import { applauseBuffer } from '#src/client/cutscenes/audio/effects/applauseBuffer.ts';
import type { SoundEffect } from '#src/client/cutscenes/audio/effects/soundEffectTypes.ts';
import { freshSeed, noiseSource } from '#src/client/cutscenes/audio/kit/noise.ts';
import { biquad, level, oscillator } from '#src/client/cutscenes/audio/kit/sources.ts';

const BOOERS = 18;
const BOO_SECONDS = 2.1;
/** The vowel « ou »: its two formants, in hertz. */
const OU_FORMANTS = [320, 800];

/** One voice of the crowd: « bouuuh », sliding down, from its own place. */
function booer(context: BaseAudioContext, out: AudioNode, at: number, number: number): void {
  const high = number % 5 === 4;
  const pitch = high ? 190 + Math.random() * 80 : 92 + Math.random() * 70;
  const start = at + Math.random() * 0.28;
  const end = start + BOO_SECONDS * (0.75 + Math.random() * 0.25);
  const place = context.createStereoPanner();
  place.pan.value = Math.random() * 1.6 - 0.8;
  place.connect(out);
  const loudness = context.createGain();
  loudness.gain.setValueAtTime(0, start);
  loudness.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.02, start + 0.12 + Math.random() * 0.15);
  loudness.gain.setTargetAtTime(0, end - 0.35, 0.1);
  loudness.connect(place);
  const voice = oscillator(context, 'sawtooth', pitch * 0.92, start, end + 0.1);
  voice.frequency.linearRampToValueAtTime(pitch * 1.03, start + 0.25);
  voice.frequency.linearRampToValueAtTime(pitch * 0.84, end);
  const wobble = oscillator(context, 'sine', 4 + Math.random() * 2, start, end + 0.1);
  wobble.connect(level(context, voice.frequency, pitch * 0.015));
  for (const formant of OU_FORMANTS) {
    const mouth = biquad(context, 'bandpass', formant * (0.92 + Math.random() * 0.16), 5, start);
    voice.connect(mouth);
    mouth.connect(level(context, loudness, formant === OU_FORMANTS[0] ? 2.2 : 1));
  }
}

/** A room that applauds, then thins away. */
export const APPLAUDISSEMENTS: SoundEffect = {
  seconds: 3.4,
  play(context, out, at) {
    const source = context.createBufferSource();
    source.buffer = applauseBuffer(context);
    source.connect(out);
    source.start(at);
  },
};

/** A room that boos: « bouuuh », a crowd of low voices sliding down, and the breath of the room. */
export const HUEES: SoundEffect = {
  seconds: 2.5,
  play(context, out, at) {
    for (let number = 0; number < BOOERS; number++) booer(context, out, at, number);
    const room = biquad(context, 'lowpass', 600, 0.7, at);
    noiseSource(context, at, BOO_SECONDS + 0.3, freshSeed()).connect(room);
    const breath = context.createGain();
    breath.gain.setValueAtTime(0, at);
    breath.gain.linearRampToValueAtTime(0.05, at + 0.3);
    breath.gain.linearRampToValueAtTime(0, at + BOO_SECONDS + 0.3);
    room.connect(breath);
    breath.connect(out);
  },
};
