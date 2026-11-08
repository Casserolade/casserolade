import { noiseHit, toneHit } from '#src/client/cutscenes/audio/kit/hits.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/** The modes of a kettle drum: [ratio to the note, loudness, how long it rings], tuned close to harmonics. */
const MODES: [number, number, number][] = [[1, 1, 1.9], [1.505, 0.5, 1.2], [1.99, 0.32, 0.9], [2.44, 0.18, 0.6], [2.98, 0.1, 0.45]];
/** The skin, just struck, is a little sharp: it settles in this long. */
const SETTLE_SECONDS = 0.09;
const ROLL_STROKES_PER_SECOND = 17;

/** A kettle drum: tuned modes that settle onto the note, and the felt of the mallet. */
export function timpani(context: BaseAudioContext, out: AudioNode, at: number, { frequency, velocity, index }: Note): void {
  const pitch = frequency || 98;
  for (const [ratio, loudness, ring] of MODES) {
    const mode = toneHit(context, out, at, { from: pitch * ratio, duration: ring, gain: 0.22 * loudness * velocity, attack: 0.004 });
    mode.detune.setValueAtTime(22, at);
    mode.detune.linearRampToValueAtTime(0, at + SETTLE_SECONDS);
  }
  noiseHit(context, out, at, { filter: 'lowpass', from: 450, duration: 0.06, gain: 0.25 * velocity, seed: index + 5 });
}

/** A roll that swells for the whole note, into the next downbeat. */
export function timpaniRoll(context: BaseAudioContext, out: AudioNode, at: number, note: Note): void {
  const strokes = Math.max(2, Math.round(note.seconds * ROLL_STROKES_PER_SECOND));
  for (let stroke = 0; stroke < strokes; stroke++) {
    const progress = stroke / strokes;
    const velocity = note.velocity * (0.12 + 0.38 * progress ** 1.5) * (stroke % 2 ? 0.9 : 1);
    timpani(context, out, at + (stroke * note.seconds) / strokes, { ...note, velocity, index: note.index * 97 + stroke });
  }
}
