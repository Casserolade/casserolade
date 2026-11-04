/** Allows bursts up to `capacity`, then `refillPerSecond` on average. */
export class TokenBucket {
  private tokens: number;
  private updatedAt: number;
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly now: () => number;

  constructor(capacity: number, refillPerSecond: number, now: () => number) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.now = now;
    this.tokens = capacity;
    this.updatedAt = now();
  }

  take(): boolean {
    const time = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((time - this.updatedAt) / 1000) * this.refillPerSecond);
    this.updatedAt = time;
    if (this.tokens < 1) return false;
    this.tokens--;
    return true;
  }
}
