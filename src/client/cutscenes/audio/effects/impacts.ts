import { SYNTH_SOUNDS } from '#src/client/services/synthSounds.ts';
import type { SoundEffect } from '#src/client/cutscenes/audio/effects/soundEffectTypes.ts';
import { heldGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { noiseHit, toneHit } from '#src/client/cutscenes/audio/kit/hits.ts';
import { freshSeed } from '#src/client/cutscenes/audio/kit/noise.ts';
import { oscillator, vibrato } from '#src/client/cutscenes/audio/kit/sources.ts';

/** When the falling one lands, after the whistle. */
const LANDING_SECONDS = 0.78;

/** A body that lands on the floor: a thump, the dust, a rattle. */
function landing(context: BaseAudioContext, out: AudioNode, at: number): void {
  const seed = freshSeed();
  toneHit(context, out, at, { from: 125, to: 40, glide: 0.12, duration: 0.34, gain: 0.5 });
  noiseHit(context, out, at, { filter: 'lowpass', from: 1500, to: 150, duration: 0.28, gain: 0.32, seed });
  [0.05, 0.11, 0.16].forEach((start, number) =>
    noiseHit(context, out, at, { filter: 'bandpass', from: 2400 - number * 500, q: 2, start, duration: 0.03, gain: 0.07, seed: seed + number + 1 }));
}

/** A punch, guignol style: the game's padded hit, a slap, and the recorded punch over it. */
export const COUP: SoundEffect = {
  seconds: 0.3,
  recorded: { name: 'coup', gain: 1.1 },
  play(context, out, at) {
    SYNTH_SOUNDS.hit.play(context, out, at, { pitch: 0.92, gain: 1.15 });
    noiseHit(context, out, at, { filter: 'bandpass', from: 1800, q: 1.2, duration: 0.05, gain: 0.16, seed: freshSeed() });
  },
};

/** A sledgehammer: a deep thud and a crunch, under the recorded blow. */
export const MASSE: SoundEffect = {
  seconds: 0.8,
  recorded: { name: 'masse', gain: 0.6 },
  play(context, out, at) {
    const seed = freshSeed();
    toneHit(context, out, at, { from: 110, to: 34, glide: 0.2, duration: 0.55, gain: 0.45 });
    noiseHit(context, out, at, { filter: 'lowpass', from: 900, to: 120, duration: 0.3, gain: 0.3, seed });
    noiseHit(context, out, at, { filter: 'bandpass', from: 1400, q: 1.5, duration: 0.05, gain: 0.12, seed: seed + 1 });
  },
};

/** He trips and falls all by himself: a slide whistle that drops, then the landing. */
export const CHUTE: SoundEffect = {
  seconds: 1.3,
  play(context, out, at) {
    const fall = LANDING_SECONDS - 0.03;
    const { gain, end } = heldGain(context, out, at, 0.15, fall, { attack: 0.03, decay: 0.2, sustain: 0.85, release: 0.03 });
    const whistle = oscillator(context, 'sine', 1700, at, end);
    whistle.frequency.exponentialRampToValueAtTime(260, at + fall);
    whistle.connect(gain);
    vibrato(context, [whistle.detune], at, end, 6, 22, 0.1);
    landing(context, out, at + LANDING_SECONDS);
  },
};
