import { biquad, level, oscillator, vibrato } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { PhraseNote } from '#src/client/cutscenes/audio/score/musicTypes.ts';

const THEREMIN_LEVEL = 0.13;
/** The hand slides to the next pitch: it starts this early, and takes about three times this long. */
const GLIDE_LEAD_SECONDS = 0.07;
const GLIDE_SECONDS = 0.075;
const SWELL_SECONDS = 0.3;
const FADE_SECONDS = 0.35;

/**
 * A theremin: a nearly pure tone that slides from note to note and wavers with a wide vibrato, swelling with the
 * player's hand. A whole phrase is one gesture.
 */
export function theremin(context: BaseAudioContext, out: AudioNode, at: number, notes: PhraseNote[]): void {
  const last = notes[notes.length - 1];
  const release = at + last.offset + last.seconds;
  const end = release + FADE_SECONDS * 2;
  const hand = context.createGain();
  hand.gain.setValueAtTime(0, at);
  hand.gain.linearRampToValueAtTime(THEREMIN_LEVEL * notes[0].velocity, at + SWELL_SECONDS);
  const tone = biquad(context, 'lowpass', 2600, 0.7, at);
  tone.connect(hand);
  hand.connect(out);
  const voice = oscillator(context, 'sine', notes[0].frequency, at, end);
  const edge = oscillator(context, 'sine', notes[0].frequency * 2, at, end);
  voice.connect(tone);
  edge.connect(level(context, tone, 0.1));
  for (const note of notes.slice(1)) {
    const slide = Math.max(at, at + note.offset - GLIDE_LEAD_SECONDS);
    voice.frequency.setTargetAtTime(note.frequency, slide, GLIDE_SECONDS);
    edge.frequency.setTargetAtTime(note.frequency * 2, slide, GLIDE_SECONDS);
    hand.gain.setTargetAtTime(THEREMIN_LEVEL * note.velocity, Math.max(slide, at + SWELL_SECONDS), 0.12);
  }
  hand.gain.setTargetAtTime(0, Math.max(release, at + SWELL_SECONDS), FADE_SECONDS / 4);
  vibrato(context, [voice.detune, edge.detune], at, end, 6.1, 24, 0.8);
}
