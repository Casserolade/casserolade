import type { TwitchCredentials } from './readTwitchCredentials.ts';
import { readTwitchLive } from './readTwitchLive.ts';

/** A stream that starts shows within a minute and a half: this, plus the home page's half minute. */
const EVERY_MS = 60_000;
const TIMEOUT_MS = 5_000;
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const STREAMS_URL = 'https://api.twitch.tv/helix/streams';

/** What the watch needs from around it: the channel, the application's access when there is one, the journal. */
export interface TwitchWatchOptions {
  channel: string;
  /** Read again at each check: credentials put on the volume work without a restart. */
  credentials: () => TwitchCredentials | null;
  journal?: (line: string) => void;
  fetcher?: typeof fetch;
}

/**
 * Whether the game's Twitch channel is live, asked once a minute to Twitch's official API (Helix), with the access of
 * an application (client credentials). Without credentials, or when Twitch does not answer, the channel counts as off
 * air: the home page would rather hide its link than say someone plays when no one does. A trouble is written to the
 * journal once, and its end too.
 */
export class TwitchWatch {
  private onAir = false;
  private token: string | null = null;
  private trouble: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private readonly options: TwitchWatchOptions;
  private readonly fetcher: typeof fetch;

  constructor(options: TwitchWatchOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
  }

  get live(): boolean {
    return this.onAir;
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
      const access = this.options.credentials();
      this.onAir = access ? await this.askTwitch(access) : false;
      if (access) this.report(null);
    } catch (error) {
      this.onAir = false;
      this.report(error instanceof Error ? error.message : String(error));
    }
  }

  /** The application's token lasts about two months: when Twitch refuses it, a new one, and the question again. */
  private async askTwitch(access: TwitchCredentials): Promise<boolean> {
    let response = await this.streams(access);
    if (response.status === 401) {
      this.token = null;
      response = await this.streams(access);
    }
    if (!response.ok) throw new Error(`Twitch ne répond pas sur la chaîne (${response.status})`);
    return readTwitchLive(await response.json());
  }

  private async streams(access: TwitchCredentials): Promise<Response> {
    this.token ??= await this.newToken(access);
    return this.fetcher(`${STREAMS_URL}?user_login=${encodeURIComponent(this.options.channel)}`, {
      headers: { 'Client-Id': access.clientId, Authorization: `Bearer ${this.token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  private async newToken(access: TwitchCredentials): Promise<string> {
    const response = await this.fetcher(TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({ client_id: access.clientId, client_secret: access.clientSecret, grant_type: 'client_credentials' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
    if (!response.ok || typeof body?.access_token !== 'string') throw new Error(`Twitch refuse l'accès de l'application (${response.status})`);
    return body.access_token;
  }

  /** The journal hears of a trouble once, not every minute, and of its end. */
  private report(trouble: string | null): void {
    if (trouble === this.trouble) return;
    if (trouble) this.options.journal?.(`Twitch : ${trouble}`);
    else this.options.journal?.('Twitch répond de nouveau');
    this.trouble = trouble;
  }
}
