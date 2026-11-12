import { EARLIER_VISIT_KEYS } from '#src/client/const/earlierVisitKeys.ts';
import { VERSION } from '#src/protocol/version.ts';
import { takeEntryReferrer } from '#src/client/services/entryReferrer.ts';
import { browserStorage, read, write } from '#src/client/services/localProfile.ts';
import type { ProfileStorage } from '#src/client/services/localProfile.ts';
import { deviceKind } from '#src/client/tools/deviceKind.ts';
import { humanResult } from '#src/client/tools/humanResult.ts';
import { parisDay } from '#src/client/tools/parisDay.ts';
import { presenceIsDue } from '#src/client/tools/presenceIsDue.ts';
import { referrerSource } from '#src/client/tools/referrerSource.ts';
import { visitFlags } from '#src/client/tools/visitFlags.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { COUNTER_PATH } from '#src/protocol/counterEvent.ts';
import type { CounterEvent, Device, GameSettings, LocalMode, PageKind } from '#src/protocol/counterEvent.ts';
import type { Classement } from '#src/protocol/messages.ts';

const FIRST_VISIT_KEY = 'casserolade.premiere_visite';
const LAST_DAY_KEY = 'casserolade.dernier_jour';
/** When this browser last said it was on the game: shared by its tabs, so that it counts once an hour. */
const LAST_PRESENCE_KEY = 'casserolade.presence';
/** Set from the statistics page, on the browsers of the one who reads them: they are not counted. */
const NOT_COUNTED_KEY = 'casserolade.compteur';
const NOT_COUNTED = 'non';

export interface Surroundings {
  referrer: string;
  host: string;
  device: Device;
}

export interface CounterSetup {
  storage: ProfileStorage | null;
  /** Sends one event to the server, and never throws. */
  send: (event: CounterEvent) => void;
  /** False in development and under automation: nothing is sent. */
  active: boolean;
  now: () => Date;
  /** Where the visit came from and the screen it is on, read when a page is counted. */
  surroundings: () => Surroundings;
}

/**
 * The site's counter, seen from a page: the pages opened and the games played in the page, sent as totals to add.
 * No id leaves the browser; it only keeps the days it was counted, to say whether it is new and its first page today.
 */
export function createCounter(setup: CounterSetup) {
  function counts(): boolean {
    return setup.active && read(setup.storage, NOT_COUNTED_KEY) !== NOT_COUNTED;
  }

  /** A page of the site opened: the day's first one counts its visitor. */
  function page(kind: PageKind): void {
    if (!counts()) return;
    const today = parisDay(setup.now());
    const firstVisit = read(setup.storage, FIRST_VISIT_KEY);
    const cameBefore = EARLIER_VISIT_KEYS.some((key) => read(setup.storage, key) !== null);
    const flags = visitFlags({ firstVisit, lastDay: read(setup.storage, LAST_DAY_KEY), cameBefore }, today);
    if (firstVisit === null) write(setup.storage, FIRST_VISIT_KEY, today);
    write(setup.storage, LAST_DAY_KEY, today);
    const { referrer, host, device } = setup.surroundings();
    setup.send({ type: 'page', page: kind, appareil: device, ...flags, source: referrerSource(referrer, host) });
  }

  /** Without storage, the page remembers on its own: it must not say it is there at every check. */
  let presenceSaidAt: number | null = null;

  /** The browser is on the game: said once an hour at most, the players of the last hour are counted on it. */
  function presence(): void {
    if (!counts()) return;
    const now = setup.now().getTime();
    const stored = Number(read(setup.storage, LAST_PRESENCE_KEY) ?? Number.NaN);
    const lastSaidAt = Number.isFinite(stored) ? Math.max(stored, presenceSaidAt ?? stored) : presenceSaidAt;
    if (!presenceIsDue(lastSaidAt, now)) return;
    presenceSaidAt = now;
    write(setup.storage, LAST_PRESENCE_KEY, String(now));
    setup.send({ type: 'presence' });
  }

  /** A game in the page is still running: said once a minute, the games in progress are counted on it. */
  function playing(mode: LocalMode): void {
    if (counts()) setup.send({ type: 'en_jeu', mode });
  }

  function gameStarted(settings: GameSettings): void {
    if (counts()) setup.send({ type: 'partie', ...settings });
  }

  /** A game in the page ended: the human's place, rounds and hero. Won means first, unless the mode says otherwise. */
  function gameEnded(settings: GameSettings, ranking: Classement, view: PlayerView | null, won?: boolean): void {
    const result = humanResult(ranking, view);
    if (!result || !counts()) return;
    setup.send({ type: 'fin', ...settings, ...result, gagnee: won ?? result.place === 1, version: VERSION });
  }

  return { page, presence, playing, gameStarted, gameEnded };
}

export type Counter = ReturnType<typeof createCounter>;

/** One event, posted without waiting: a counter that fails never shows. */
function post(event: CounterEvent): void {
  try {
    fetch(COUNTER_PATH, { method: 'POST', body: JSON.stringify(event), keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
  } catch {
    // No network API: nothing is counted.
  }
}

/** The built game only, in a browser driven by a person. */
function isActive(): boolean {
  try {
    return import.meta.env.PROD && !navigator.webdriver;
  } catch {
    return false;
  }
}

function pageSurroundings(): Surroundings {
  return {
    referrer: takeEntryReferrer() ?? document.referrer,
    host: window.location.hostname,
    device: deviceKind({ coarsePointer: window.matchMedia('(pointer: coarse)').matches, shortSide: Math.min(window.screen.width, window.screen.height) }),
  };
}

export const counter = createCounter({ storage: browserStorage(), send: post, active: isActive(), now: () => new Date(), surroundings: pageSurroundings });
