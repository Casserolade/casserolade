import type { Container } from 'pixi.js';
import { shakeOffset } from '#src/client/tools/shakeOffset.ts';

/** At full trauma: how far the table is thrown, and how far it tilts. */
const MAX_OFFSET_PX = 26;
const MAX_TILT = 0.035;
/** Trauma lost per second: a big shock settles in about half a second. */
const RECOVERY_PER_SECOND = 1.7;
/** Asked for less motion: the shake stays, much smaller, never a tilt. */
const REDUCED = { offset: 0.25, tilt: 0 };

/**
 * The camera's shake over the whole combat: every blow adds trauma, which settles by itself. The table is moved around
 * its center, so that a tilt turns it about the middle of the screen.
 */
export class CameraShake {
  private trauma = 0;
  private time = 0;
  private readonly offsetScale: number;
  private readonly tiltScale: number;

  constructor(reducedMotion: boolean) {
    this.offsetScale = reducedMotion ? REDUCED.offset : 1;
    this.tiltScale = reducedMotion ? REDUCED.tilt : 1;
  }

  /** A shock: from 0.1 (a knock) to 1 (the blow that ends the combat). */
  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /**
   * Moves `view` for this frame, in real time: a shake goes on through a hit-stop. `scale` is the medallions' (1 on a
   * computer's 1080p table): a phone's small table shakes less far, never less than a little.
   */
  update(view: Container, realDeltaSeconds: number, centerX: number, centerY: number, scale: number): void {
    this.time += realDeltaSeconds;
    this.trauma = Math.max(0, this.trauma - RECOVERY_PER_SECOND * realDeltaSeconds);
    const reach = MAX_OFFSET_PX * this.offsetScale * Math.min(1.2, Math.max(0.4, scale));
    const { x, y, rotation } = shakeOffset(this.trauma, this.time, reach, MAX_TILT * this.tiltScale);
    view.pivot.set(centerX, centerY);
    view.position.set(centerX + x, centerY + y);
    view.rotation = rotation;
  }
}
