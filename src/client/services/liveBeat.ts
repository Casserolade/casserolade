import { counter } from '#src/client/services/counter.ts';
import { runningLocalGame } from '#src/client/services/interruptedGame.ts';
import { PLAYING_BEAT_MS } from '#src/protocol/liveCount.ts';

/** While the page is in view: the browser is there (said once an hour), and its local game runs (said every minute). */
function beat(): void {
  if (document.visibilityState !== 'visible') return;
  counter.presence();
  const game = runningLocalGame();
  if (game) counter.playing(game.kind);
}

/** A tab opened in the background says it is there as soon as it is shown; its game keeps to the minute's beat. */
function sayPresenceInView(): void {
  if (document.visibilityState === 'visible') counter.presence();
}

/**
 * The game's page tells the server who is here right now, for the home page's « en direct »: once opened (whenOpened)
 * or as soon as its tab is shown, then once a minute. A page left in the background says nothing, so that a forgotten tab does
 * not count as a player.
 */
export function startLiveBeat(): void {
  beat();
  window.setInterval(beat, PLAYING_BEAT_MS);
  document.addEventListener('visibilitychange', sayPresenceInView);
}
