import { createMusicGraph } from '#src/client/cutscenes/audio/score/musicGraph.ts';
import type { MusicGraph } from '#src/client/cutscenes/audio/score/musicGraph.ts';
import { MusicScheduler } from '#src/client/cutscenes/audio/score/musicScheduler.ts';
import type { Music } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/** How far ahead the notes are scheduled: a timer late by a second (a tab in the background) leaves no hole. */
const LOOKAHEAD_SECONDS = 1.5;
const TICK_MS = 250;
const START_DELAY_SECONDS = 0.06;
const FADE_SECONDS = 0.45;

/** A music that plays live, in a loop, until it is stopped. */
export class MusicPlayer {
  private readonly context: BaseAudioContext;
  private readonly graph: MusicGraph;
  private readonly scheduler: MusicScheduler;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(context: BaseAudioContext, destination: AudioNode, music: Music) {
    this.context = context;
    this.graph = createMusicGraph(context, destination, music);
    this.scheduler = new MusicScheduler(context, music, this.graph.inputs, context.currentTime + START_DELAY_SECONDS);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  /** A short fade, then silence. Stopping twice does nothing more. */
  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
    const { output } = this.graph;
    output.gain.cancelScheduledValues(this.context.currentTime);
    output.gain.setTargetAtTime(0, this.context.currentTime, FADE_SECONDS / 6);
    setTimeout(() => output.disconnect(), (FADE_SECONDS + 0.15) * 1000);
  }

  private tick(): void {
    try {
      this.scheduler.scheduleUntil(this.context.currentTime + LOOKAHEAD_SECONDS);
    } catch (error) {
      console.error('Cutscene music could not play', error);
      this.stop();
    }
  }
}
