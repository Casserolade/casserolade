import { noiseHit, toneHit } from '#src/client/cutscenes/audio/kit/hits.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/** A partial of something struck: [ratio to the note, loudness, how long it rings in seconds]. */
type Partial = [number, number, number];

/**
 * A church bell tuned in minor, as bells are: the hum an octave under, the minor third, the fifth, the nominal an
 * octave above, and the bright partials that die first.
 */
const CHURCH_BELL: Partial[] = [[0.5, 0.6, 11], [1, 0.5, 7], [1.19, 0.42, 5], [1.5, 0.2, 3.6], [2, 0.38, 4], [2.5, 0.12, 2.4], [3, 0.15, 2], [4.07, 0.08, 1.2], [5.43, 0.05, 0.8]];
const GLOCKENSPIEL: Partial[] = [[1, 1, 1.4], [2.76, 0.22, 0.5], [5.4, 0.08, 0.25]];
const CELESTA: Partial[] = [[1, 1, 2.4], [2, 0.25, 1.1], [3, 0.08, 0.5]];

/**
 * Rings these partials, each doubled a fraction of a hertz apart: the slow beating that makes metal shimmer.
 * `gain` is the loudness of the loudest one.
 */
function ring(context: BaseAudioContext, out: AudioNode, at: number, pitch: number, partials: Partial[], gain: number, beat: number): void {
  for (const [ratio, loudness, seconds] of partials) {
    for (const shift of [-beat, beat]) {
      toneHit(context, out, at, { from: pitch * ratio + shift * ratio, duration: seconds, gain: (gain * loudness) / 2, attack: 0.002 });
    }
  }
}

/** The great bell of a funeral: deep, long, shimmering. */
export function churchBell(context: BaseAudioContext, out: AudioNode, at: number, { frequency, velocity, index }: Note): void {
  ring(context, out, at, frequency, CHURCH_BELL, 0.14 * velocity, 0.35);
  noiseHit(context, out, at, { filter: 'bandpass', from: 2200, q: 0.7, duration: 0.05, gain: 0.06 * velocity, seed: index + 3 });
  toneHit(context, out, at, { from: frequency * 6.8, duration: 0.12, gain: 0.02 * velocity, attack: 0.001 });
}

/** Steel bars struck: a sparkle over a fanfare. */
export function glockenspiel(context: BaseAudioContext, out: AudioNode, at: number, { frequency, velocity }: Note): void {
  ring(context, out, at, frequency, GLOCKENSPIEL, 0.07 * velocity, 0.6);
}

/** A soft, glassy bell: a lonely ping in the dark. */
export function celesta(context: BaseAudioContext, out: AudioNode, at: number, { frequency, velocity }: Note): void {
  ring(context, out, at, frequency, CELESTA, 0.06 * velocity, 0.8);
}
