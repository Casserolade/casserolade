import { BRASS_VOICES } from '#src/client/cutscenes/audio/const/brassVoices.ts';
import type { BrassVoice } from '#src/client/cutscenes/audio/const/brassVoices.ts';
import { heldGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { biquad, oscillator, vibrato } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

const MAX_CUTOFF = 9000;
/** A held note sings with a vibrato; a short one does not have the time. */
const VIBRATO_AFTER_SECONDS = 0.45;

/**
 * Two sawtooth reeds a few cents apart, under a filter that opens with the breath: the blare of a brass. The note
 * starts under its pitch and slides up to it, as lips do.
 */
function playBrass(context: BaseAudioContext, out: AudioNode, at: number, { frequency, seconds, velocity }: Note, voice: BrassVoice): void {
  const { gain, end } = heldGain(context, out, at, voice.level * velocity, seconds, voice.envelope);
  const open = Math.min(frequency * (1.5 + voice.brightness * velocity), MAX_CUTOFF);
  const breath = voice.envelope.attack * 1.8;
  const tone = biquad(context, 'lowpass', frequency * 1.3, 1.2, at);
  tone.frequency.linearRampToValueAtTime(open, at + breath);
  tone.frequency.setTargetAtTime(Math.max(frequency * 1.5, open * 0.62), at + breath, 0.18);
  tone.connect(gain);
  const reeds = [-voice.spread / 2, voice.spread / 2].map((cents) => {
    const reed = oscillator(context, 'sawtooth', frequency, at, end);
    reed.detune.setValueAtTime(cents - voice.scoop, at);
    reed.detune.linearRampToValueAtTime(cents, at + 0.045);
    reed.connect(tone);
    return reed;
  });
  if (seconds > VIBRATO_AFTER_SECONDS) vibrato(context, reeds.map((reed) => reed.detune), at + 0.28, end, 5.3, 11);
}

/** The tune of a fanfare, and the stabs of the news. */
export function trumpet(context: BaseAudioContext, out: AudioNode, at: number, note: Note): void {
  playBrass(context, out, at, note, BRASS_VOICES.trumpet);
}

/** The held chords under the tune. */
export function horn(context: BaseAudioContext, out: AudioNode, at: number, note: Note): void {
  playBrass(context, out, at, note, BRASS_VOICES.horn);
}

/** The « oom » of the oom-pah, and the bass of a fanfare. */
export function tuba(context: BaseAudioContext, out: AudioNode, at: number, note: Note): void {
  playBrass(context, out, at, note, BRASS_VOICES.tuba);
}
