import type { Targeting } from '#src/client/stores/useTableGestures.ts';
import { tractPileSize } from '#src/client/tools/tractPileSize.ts';
import type { HandSpell } from '#src/engine/types.ts';

/** What the table says while the player aims at an ally: the question, and how to give a whole pile of Tracts. */
export interface AimHint {
  ask: string;
  tip: string | null;
}

/**
 * The words of an aim. A pile of Tracts says how to send it whole on one politician: the pile clicked (or touched)
 * again. `touch`: a screen without a mouse, where one touches instead of clicking.
 */
export function aimHint(aim: Targeting | null, spells: readonly HandSpell[], touch: boolean): AimHint | null {
  if (!aim) return null;
  if (aim.kind === 'play') return { ask: touch ? 'Quel allié ? Touchez-le.' : 'Quel allié ?', tip: null };
  const pile = tractPileSize(spells, aim.held.uid);
  const pointing = touch ? ' Touchez un politique.' : '';
  if (aim.all) return { ask: `Sur qui, les ${pile} Tracts ?${pointing}`, tip: null };
  const again = touch ? 'Retouchez la pile' : 'Recliquez la pile';
  return { ask: `Sur qui ?${pointing}`, tip: pile > 1 ? `${again} : les ${pile} Tracts sur le même.` : null };
}
