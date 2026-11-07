import type { GameStore } from '#src/client/stores/createGameStore.ts';
import { useHurry } from '#src/client/stores/useHurry.ts';

/**
 * The end of turn plays by itself on the recruitment table; a tap or a key goes straight to the combat. Online, the
 * server already sent the combat: passing only shows it sooner here.
 */
export function useEndOfTurnHurry(store: GameStore): void {
  function skipEndOfTurn(): boolean {
    const playing = store.endOfTurn.value;
    playing?.skip();
    return playing !== null;
  }

  useHurry(skipEndOfTurn);
}
