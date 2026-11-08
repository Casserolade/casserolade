import { parseTrack } from '#src/client/cutscenes/audio/score/parseTrack.ts';
import type { Music, MusicScore, ScoreEvent, Track, TrackScore } from '#src/client/cutscenes/audio/score/musicTypes.ts';

function addAt(byStep: Map<number, ScoreEvent[]>, step: number, event: ScoreEvent): void {
  byStep.set(step, [...(byStep.get(step) ?? []), event]);
}

/** The events grouped by the step they start on. */
function notesByStep(events: ScoreEvent[]): Map<number, ScoreEvent[]> {
  const byStep = new Map<number, ScoreEvent[]>();
  events.forEach((event) => addAt(byStep, event.step, event));
  return byStep;
}

/** The phrases (notes that follow each other without a rest), each found whole at the step it starts on. */
function phrasesByStep(events: ScoreEvent[]): Map<number, ScoreEvent[]> {
  const byStep = new Map<number, ScoreEvent[]>();
  let phraseStart = -1;
  let phraseEnd = -1;
  for (const event of events) {
    if (event.step !== phraseEnd) phraseStart = event.step;
    phraseEnd = event.step + event.steps;
    addAt(byStep, phraseStart, event);
  }
  return byStep;
}

function compileTrack(track: TrackScore, loopSteps: number, number: number): Track {
  const { events, steps } = parseTrack(track.score);
  if (steps !== loopSteps) console.error(`Cutscene music: track ${number} lasts ${steps} steps, not ${loopSteps}`);
  return { ...track, byStep: track.kind === 'phrases' ? phrasesByStep(events) : notesByStep(events) };
}

/** A written music, ready to play: its tracks are read once, when the module loads. */
export function defineMusic(score: MusicScore): Music {
  return {
    ...score,
    stepSeconds: 60 / score.bpm / score.stepsPerBeat,
    tracks: score.tracks.map((track, number) => compileTrack(track, score.loopSteps, number)),
  };
}
