import { seededRandom } from '#src/client/cutscenes/audio/kit/seededRandom.ts';
import type { Note } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/**
 * What can go wrong on a school recorder. A squeak: the note starts an octave up and cracks down. A squeal: the
 * whole note an octave up. A crack: the breath fails in the middle. Wrong: the wrong finger, corrected. Airy: only
 * air at first. Late: the player was reading the score.
 */
export type RecorderAccident = 'squeak' | 'squeal' | 'crack' | 'wrong' | 'airy' | 'late';

/** Only the high notes squeal this badly. */
const SQUEAL_ABOVE_HERTZ = 1000;
/** Only a long note has the time to crack. */
const CRACK_LONGER_THAN_SECONDS = 0.4;

/**
 * What goes wrong on this note, or null. On the first turn, what `firstTurn` asks for (by the note's place in its
 * track), so that the tune is heard before it falls apart; after that, the luck of a beginner, drawn from the turn
 * and the note: about one note in eight.
 */
export function recorderAccident({ index, iteration, frequency, seconds }: Note, firstTurn: Partial<Record<number, RecorderAccident>>): RecorderAccident | null {
  if (iteration === 0) return firstTurn[index] ?? null;
  const luck = seededRandom(iteration * 131 + index, 11);
  if (luck < 0.03 && frequency > SQUEAL_ABOVE_HERTZ) return 'squeal';
  if (luck < 0.06) return 'squeak';
  if (luck < 0.08 && seconds > CRACK_LONGER_THAN_SECONDS) return 'crack';
  if (luck < 0.1) return 'wrong';
  if (luck < 0.115) return 'airy';
  if (luck < 0.13) return 'late';
  return null;
}
