import type { SheetAction } from '#src/client/tools/sheetAction.ts';
import { sellGain } from '#src/client/tools/sellGain.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { Minion } from '#src/engine/types.ts';

/** « Renvoyer », with what it brings back now: greyed under the Bracelet électronique, which forbids it. */
export function sellAction(view: Pick<PlayerView, 'params' | 'mods'>, minion: Minion, fromBoard: boolean): SheetAction {
  const reason = minion.bracelet ? 'Sous bracelet jusqu\'à la manche suivante' : null;
  return { id: 'sell', label: 'Renvoyer', gain: sellGain(view.params, view.mods, minion, fromBoard).now, reason, primary: false };
}
