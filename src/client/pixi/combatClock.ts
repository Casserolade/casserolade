/**
 * The combat's own time, against the page's: it stops dead for a hit-stop, and crawls in slow motion on the blow that
 * ends the combat. Lights, sparks and medallions run on it; the camera's shake runs on real time.
 */
export class CombatClock {
  private frozenFor = 0;
  private slowFor = 0;
  private slowFactor = 1;

  /** The stage stops on the contact of a blow; a longer freeze wins over a shorter one. */
  freeze(seconds: number): void {
    this.frozenFor = Math.max(this.frozenFor, seconds);
  }

  /** Slow motion: `factor` of the normal pace, for `seconds` of real time. */
  slowDown(factor: number, seconds: number): void {
    this.slowFactor = factor;
    this.slowFor = Math.max(this.slowFor, seconds);
  }

  /** How many seconds of combat pass during `realSeconds` of the page. */
  advance(realSeconds: number): number {
    let left = realSeconds;
    const frozen = Math.min(left, this.frozenFor);
    this.frozenFor -= frozen;
    left -= frozen;
    const slow = Math.min(left, this.slowFor);
    this.slowFor -= slow;
    left -= slow;
    return slow * this.slowFactor + left;
  }
}
