import { ref, shallowRef } from 'vue';
import { END_OF_TURN_FRAME_MS, endOfTurnStepMs } from '#src/protocol/endOfTurnDuration.ts';
import type { EndOfTurnNote, EndOfTurnStep, Keyword } from '#src/engine/types.ts';

export interface ShownStats {
  atk: number;
  hp: number;
  keywords: Keyword[];
}

/**
 * The end of turn, played on the recruitment table before the combat opens, as in Battlegrounds:
 * a banner, then each effect in turn, its politician lit up and its numbers changing. The table keeps
 * the view of the recruitment; this only says which stats to show instead, step after step.
 */
export class EndOfTurnPlayback {
  /** The banner « Fin de tour » is up. */
  readonly banner = ref(false);
  /** The politician whose effect plays now; null for the hero's power, or between two steps. */
  readonly source = ref<number | null>(null);
  /** What the playing effect touched besides the board, said next to it. Empty with no change: « Rien à faire ». */
  readonly notes = shallowRef<{ uid: number | null; notes: EndOfTurnNote[]; idle: boolean } | null>(null);
  /** The stats each politician shows now, instead of those of the recruitment's last view. */
  readonly stats = shallowRef<ReadonlyMap<number, ShownStats>>(new Map());
  private readonly steps: EndOfTurnStep[];
  private readonly onFinished: () => void;
  private timer = 0;
  private index = 0;
  private finished = false;

  constructor(steps: EndOfTurnStep[], onFinished: () => void) {
    this.steps = steps;
    this.onFinished = onFinished;
  }

  start(): void {
    this.banner.value = true;
    this.timer = window.setTimeout(() => this.playStep(), END_OF_TURN_FRAME_MS);
  }

  /** Straight to the combat: every step at once. */
  skip(): void {
    window.clearTimeout(this.timer);
    for (; this.index < this.steps.length; this.index++) this.applyStep(this.steps[this.index]);
    this.finish();
  }

  destroy(): void {
    window.clearTimeout(this.timer);
    this.finished = true;
  }

  private playStep(): void {
    const step = this.steps[this.index];
    if (!step) {
      this.source.value = null;
      this.notes.value = null;
      this.timer = window.setTimeout(() => this.finish(), END_OF_TURN_FRAME_MS);
      return;
    }
    this.index++;
    const target = step.source ?? step.changes[0]?.uid ?? null;
    this.source.value = step.source;
    this.notes.value = { uid: target, notes: step.notes, idle: step.changes.length === 0 && step.notes.length === 0 };
    this.applyStep(step);
    this.timer = window.setTimeout(() => this.playStep(), endOfTurnStepMs(this.steps.length));
  }

  private applyStep(step: EndOfTurnStep): void {
    if (step.changes.length === 0) return;
    const next = new Map(this.stats.value);
    for (const change of step.changes) next.set(change.uid, { atk: change.atk, hp: change.hp, keywords: change.keywords });
    this.stats.value = next;
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.banner.value = false;
    this.onFinished();
  }
}
