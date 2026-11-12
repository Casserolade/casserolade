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

/**
 * The game's page tells the server who is here right now, for the home page's « en direct »: once on opening, then
 * once a minute. A page left in the background says nothing, so that a forgotten tab does not count as a player.
 */
export function startLiveBeat(): void {
  beat();
  window.setInterval(beat, PLAYING_BEAT_MS);
}
