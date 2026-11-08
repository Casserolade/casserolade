import { CUTSCENE_MOVE_SECONDS } from '#src/client/const/cutsceneMoveSeconds.ts';
import { lineSeconds } from '#src/client/tools/lineSeconds.ts';
import type { Action } from '#src/data/histoire/cinematique.ts';

/** What a voice lasts when its duration is unknown, and a caption at the least. */
const UNKNOWN_VOICE_SECONDS = 3;
const MIN_CAPTION_SECONDS = 2.4;
const CAPTION_SECONDS_PER_CHAR = 0.065;
/** One crossing of the screen in a chase, and how many when the script does not say. */
const CROSSING_SECONDS = 1.4;
const DEFAULT_CROSSINGS = 2;

/**
 * How long an action of a cutscene lasts, in seconds: a line its voice or its reading time, a caption the time to read
 * it, a move its own length or `en`. `speed` is the `accelere` of its plan. A face or a sound lasts 0.
 */
export function actionSeconds(action: Action, speed = 1, voiceSeconds: (key: string) => number | undefined = () => undefined): number {
  if ('dit' in action) {
    const voice = 'voix' in action && action.voix ? (voiceSeconds(action.voix) ?? UNKNOWN_VOICE_SECONDS) : undefined;
    return lineSeconds(action.texte, voice);
  }
  if ('pense' in action) return lineSeconds(action.texte);
  if ('bastonne' in action) return ((action.coups ?? 3) * 0.32 + 0.3) / speed;
  if ('narrateur' in action) return Math.max(MIN_CAPTION_SECONDS, action.narrateur.length * CAPTION_SECONDS_PER_CHAR);
  if ('animateur' in action) return Math.max(MIN_CAPTION_SECONDS, action.texte.length * CAPTION_SECONDS_PER_CHAR);
  if ('poursuite' in action) return ((action.tours ?? DEFAULT_CROSSINGS) * CROSSING_SECONDS) / speed;
  if ('en' in action && typeof action.en === 'number') return action.en / speed;
  const move = Object.keys(CUTSCENE_MOVE_SECONDS).find((key) => key in action);
  return move ? CUTSCENE_MOVE_SECONDS[move] / speed : 0;
}
