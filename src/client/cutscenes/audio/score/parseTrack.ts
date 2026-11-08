import type { ScoreEvent } from '#src/client/cutscenes/audio/score/musicTypes.ts';

const ACCENT = 1.3;
const SOFT = 0.55;

/**
 * Reads a written track. Tokens are separated by spaces: `C5` is a note one step long, `C5:3` three steps long,
 * `C4+E4+G4:2` a chord, `.:4` a rest, `x` a drum hit; `C5!:2` is accented and `C5?` soft. `|` only helps the eye.
 * Returns the events and the length of the track, in steps.
 */
export function parseTrack(written: string): { events: ScoreEvent[]; steps: number } {
  const events: ScoreEvent[] = [];
  let step = 0;
  for (const token of written.split(/\s+/)) {
    if (!token || token === '|') continue;
    const mark = /[!?]/.exec(token)?.[0];
    const velocity = mark === '!' ? ACCENT : mark === '?' ? SOFT : 1;
    const [body, length] = token.replace(/[!?]/g, '').split(':');
    const steps = length === undefined ? 1 : Number(length);
    if (body !== '.') events.push({ step, steps, pitches: body.split('+'), velocity, index: events.length });
    step += steps;
  }
  return { events, steps: step };
}
