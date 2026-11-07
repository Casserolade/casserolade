import type { Container } from 'pixi.js';
import { springStep } from '#src/client/tools/springStep.ts';
import type { Spring } from '#src/client/tools/springStep.ts';

const SLIDE_PER_SECOND = 9;
/**
 * The lunge of an attack, in combat seconds: wind up, dash, back. The blow lands at the end of the dash, when the
 * journal's next event (the blow) plays: `attaque` lasts as long as wind-up and dash (combatDuration.ts).
 */
const LUNGE = { windUp: 0.1, dash: 0.14, back: 0.2, reach: 0.82 };
/** The medallion leans back as it winds up, into the blow as it dashes, in radians. */
const LEAN = { back: 0.1, forward: 0.18, across: 250 };
/** Knocked back by a blow, it springs home with a little bounce, like off a pinball bumper. */
const KNOCK = { stiffness: 380, damping: 15 };

/**
 * Where a medallion stands and how it moves: it slides to its place in its row, lunges at its target, is knocked back
 * by the blows it takes. A death may take it over (`detach`): then it is moved by the death alone.
 */
export class CardMotion {
  private readonly view: Container;
  private readonly body: Container;
  private targetX = 0;
  private targetY = 0;
  private targetScale = 1;
  private placeX = 0;
  private placeY = 0;
  private isPlaced = false;
  private lunge: { time: number; dx: number; dy: number } | null = null;
  private knockX: Spring = { offset: 0, velocity: 0 };
  private knockY: Spring = { offset: 0, velocity: 0 };
  private isDetached = false;

  constructor(view: Container, body: Container) {
    this.view = view;
    this.body = body;
  }

  /** Its place in the row. The first time, it just appears there. */
  moveTo(x: number, y: number, scale: number): void {
    this.targetX = x;
    this.targetY = y;
    this.targetScale = scale;
    if (!this.isPlaced) this.jumpToTarget();
    this.isPlaced = true;
  }

  jumpToTarget(): void {
    this.placeX = this.targetX;
    this.placeY = this.targetY;
    this.view.position.set(this.targetX, this.targetY);
    this.view.scale.set(this.targetScale);
  }

  /** The center of its place, for a medallion `width` × `height` units. */
  center(width: number, height: number): { x: number; y: number } {
    return { x: this.targetX + (width * this.targetScale) / 2, y: this.targetY + (height * this.targetScale) / 2 };
  }

  get scale(): number {
    return this.targetScale;
  }

  /** Winds up, dashes `dx`, `dy` pixels toward its target, and comes back. */
  lungeBy(dx: number, dy: number): void {
    this.lunge = { time: 0, dx, dy };
  }

  /** A blow pushes it, `push` pixels a second along (`dirX`, `dirY`). */
  knock(dirX: number, dirY: number, push: number): void {
    this.knockX = { ...this.knockX, velocity: this.knockX.velocity + dirX * push };
    this.knockY = { ...this.knockY, velocity: this.knockY.velocity + dirY * push };
  }

  /** A death takes it over: its place, its lunge and its knocks no longer move it. */
  detach(): void {
    this.isDetached = true;
  }

  /** Slides in real time; the lunge and the knocks follow the combat's time. */
  update(realDeltaSeconds: number, deltaSeconds: number): void {
    if (this.isDetached) return;
    this.knockX = springStep(this.knockX, deltaSeconds, KNOCK.stiffness, KNOCK.damping);
    this.knockY = springStep(this.knockY, deltaSeconds, KNOCK.stiffness, KNOCK.damping);
    const progress = Math.min(1, realDeltaSeconds * SLIDE_PER_SECOND);
    this.view.scale.set(this.view.scale.x + (this.targetScale - this.view.scale.x) * progress);
    const lunge = this.lunge;
    const fraction = this.lungeProgress(deltaSeconds);
    if (lunge) {
      this.placeX = this.targetX + lunge.dx * fraction;
      this.placeY = this.targetY + lunge.dy * fraction;
      const side = Math.max(-1, Math.min(1, lunge.dx / LEAN.across));
      this.body.rotation = fraction < 0 ? side * LEAN.back * (fraction / 0.08) : side * LEAN.forward * Math.min(1, fraction / 0.4);
    } else {
      this.body.rotation = 0;
      this.placeX += (this.targetX - this.placeX) * progress;
      this.placeY += (this.targetY - this.placeY) * progress;
    }
    this.view.position.set(this.placeX + this.knockX.offset, this.placeY + this.knockY.offset);
  }

  /** Where the lunge is, as a fraction of the way to the target (negative: winding up). */
  private lungeProgress(deltaSeconds: number): number {
    if (!this.lunge) return 0;
    this.lunge.time += deltaSeconds;
    const { windUp, dash, back, reach } = LUNGE;
    const t = this.lunge.time;
    if (t < windUp) return -0.08 * (t / windUp);
    if (t < windUp + dash) return -0.08 + (reach + 0.08) * ((t - windUp) / dash) ** 2;
    if (t < windUp + dash + back) return reach * (1 - (t - windUp - dash) / back);
    this.lunge = null;
    return 0;
  }
}
