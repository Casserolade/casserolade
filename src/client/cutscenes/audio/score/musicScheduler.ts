import { noteFrequency } from '#src/client/cutscenes/audio/kit/noteFrequency.ts';
import type { Music, Note, ScoreEvent, Track } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/** A step this late still plays, its first milliseconds clipped; any later, it is skipped. */
const LATE_TOLERANCE_SECONDS = 0.05;

function toNote(track: Track, event: ScoreEvent, pitch: string, iteration: number, stepSeconds: number): Note {
  return {
    frequency: noteFrequency(pitch, track.transpose),
    seconds: event.steps * stepSeconds * (track.articulation ?? 1),
    velocity: event.velocity,
    index: event.index,
    iteration,
  };
}

/** Plays what a track has on one step: its notes one by one, or the phrase that starts there. */
function playEvents(context: BaseAudioContext, out: AudioNode, track: Track, events: ScoreEvent[], at: number, iteration: number, stepSeconds: number): void {
  if (track.kind === 'phrases') {
    const first = events[0].step;
    const notes = events.map((event) => ({ ...toNote(track, event, event.pitches[0], iteration, stepSeconds), offset: (event.step - first) * stepSeconds }));
    track.instrument(context, out, at, notes);
    return;
  }
  for (const event of events) {
    for (const pitch of event.pitches) track.instrument(context, out, at, toNote(track, event, pitch, iteration, stepSeconds));
  }
}

/**
 * Plays a music step by step on the clock of its audio context, from `start`, looping without end: the loop is
 * seamless because a step's time only depends on its number. In the game it is asked again and again for the next
 * moments; offline, once for the whole length.
 */
export class MusicScheduler {
  private readonly context: BaseAudioContext;
  private readonly music: Music;
  private readonly inputs: AudioNode[];
  private readonly start: number;
  private nextStep = 0;

  constructor(context: BaseAudioContext, music: Music, inputs: AudioNode[], start: number) {
    this.context = context;
    this.music = music;
    this.inputs = inputs;
    this.start = start;
  }

  /** Schedules every step that starts before `until`, in context seconds. */
  scheduleUntil(until: number): void {
    const { stepSeconds } = this.music;
    while (this.start + this.nextStep * stepSeconds < until) {
      const at = this.start + this.nextStep * stepSeconds;
      if (at >= this.context.currentTime - LATE_TOLERANCE_SECONDS) this.playStep(this.nextStep, at);
      this.nextStep++;
    }
  }

  private playStep(step: number, at: number): void {
    const { loopSteps, stepSeconds, tracks } = this.music;
    const loopStep = step % loopSteps;
    const iteration = Math.floor(step / loopSteps);
    tracks.forEach((track, number) => {
      const events = track.byStep.get(loopStep);
      if (events) playEvents(this.context, this.inputs[number], track, events, at, iteration, stepSeconds);
    });
  }
}
