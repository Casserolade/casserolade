import { computed, ref, shallowRef } from 'vue';
import { applyCombatEvent } from '#src/engine/replay.ts';
import type { CombatSides } from '#src/engine/replay.ts';
import type { CombatEvent } from '#src/engine/types.ts';
import { combatEventDuration } from '#src/protocol/combatDuration.ts';
import { narrateCombatEvent } from '#src/client/tools/narrateCombatEvent.ts';

/** Whoever draws the combat: it gets each event with the state right after it. */
export interface CombatPlaybackListener {
  handleEvent(event: CombatEvent, sides: CombatSides): void;
  jumpTo(sides: CombatSides): void;
  /** The last event has played, or the player skipped to the end. */
  handleFinished?(): void;
}

/** Plays a combat log one event at a time. It only reads the log: nothing is simulated. */
export class CombatPlayback {
  readonly sides = shallowRef<CombatSides>([[], []]);
  readonly current = shallowRef<CombatEvent | null>(null);
  readonly narration = ref('');
  readonly speed = ref(1);
  /** Comes after the last event has played its whole duration: the final state stays readable. */
  readonly finished = ref(false);
  private readonly index = ref(0);
  /** How many events have played so far: all of them once skipped. */
  readonly played = computed(() => this.index.value);
  private readonly log: CombatEvent[];
  private readonly listener: CombatPlaybackListener | null;
  private timer = 0;
  /** When the next event plays, on the page's clock. */
  private nextAt = 0;

  constructor(log: CombatEvent[], listener: CombatPlaybackListener | null = null) {
    this.log = log;
    this.listener = listener;
  }

  start(): void {
    this.playNext();
  }

  setSpeed(speed: number): void {
    this.speed.value = speed;
  }

  skip(): void {
    window.clearTimeout(this.timer);
    this.sides.value = this.log.reduce<CombatSides>(applyCombatEvent, this.sides.value);
    this.index.value = this.log.length;
    this.current.value = null;
    this.narration.value = 'Le débat est terminé.';
    this.listener?.jumpTo(this.sides.value);
    this.finish();
  }

  destroy(): void {
    window.clearTimeout(this.timer);
  }

  /**
   * The event playing now lasts at least this long: a real voice is heard to its end before the
   * combat goes on, so that nobody speaks over it. Nothing to hold once the combat is over.
   */
  hold(ms: number): void {
    if (this.finished.value || this.index.value === 0) return;
    const wanted = performance.now() + ms;
    if (wanted <= this.nextAt) return;
    window.clearTimeout(this.timer);
    this.nextAt = wanted;
    this.timer = window.setTimeout(() => this.playNext(), ms);
  }

  private finish(): void {
    this.finished.value = true;
    this.listener?.handleFinished?.();
  }

  private playNext(): void {
    const event = this.log[this.index.value];
    if (!event) {
      this.current.value = null;
      this.narration.value = '';
      this.finish();
      return;
    }
    this.narration.value = narrateCombatEvent(event, this.sides.value);
    this.current.value = event;
    this.sides.value = applyCombatEvent(this.sides.value, event);
    this.listener?.handleEvent(event, this.sides.value);
    this.index.value++;
    const duration = combatEventDuration(event) / this.speed.value;
    this.nextAt = performance.now() + duration;
    this.timer = window.setTimeout(() => this.playNext(), duration);
  }
}
