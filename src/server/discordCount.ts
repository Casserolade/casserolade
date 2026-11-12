import type { DiscordCount } from '../protocol/liveCount.ts';
import { readDiscordCount } from './readDiscordCount.ts';

/** The counts move slowly, and Discord limits the calls: once every ten minutes is plenty. */
const EVERY_MS = 10 * 60_000;
const TIMEOUT_MS = 5_000;

/**
 * The members of the community's Discord server, read from its public invitation (no token, no account), every ten
 * minutes. When Discord does not answer, the last counts stay.
 */
export class DiscordCounter {
  private counts: DiscordCount | null = null;
  private timer: NodeJS.Timeout | null = null;
  private readonly invite: string;
  private readonly fetcher: typeof fetch;

  constructor(invite: string, fetcher: typeof fetch = fetch) {
    this.invite = invite;
    this.fetcher = fetcher;
  }

  get current(): DiscordCount | null {
    return this.counts;
  }

  start(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), EVERY_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async refresh(): Promise<void> {
    try {
      const url = `https://discord.com/api/v10/invites/${encodeURIComponent(this.invite)}?with_counts=true`;
      const response = await this.fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) return;
      this.counts = readDiscordCount(await response.json()) ?? this.counts;
    } catch {
      // Discord is slow or away: the last counts stay.
    }
  }
}
