import { wornCasserole } from '#src/client/tools/wornCasserole.ts';
import type { WornCasserole } from '#src/client/tools/wornCasserole.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import type { Casserole, Minion } from '#src/engine/types.ts';

export interface SheetCasserole {
  key: string;
  casserole: Casserole;
  worn: WornCasserole;
}

/** Every casserole a politician carries, each with what it does now: forgotten, in the scandal, or asleep. */
export function wornCasseroles(minion: Minion, round: number): SheetCasserole[] {
  return minion.casseroles.flatMap((id, index) => {
    const casserole = CASSEROLE_BY_ID[id];
    return casserole ? [{ key: `${id}-${index}`, casserole, worn: wornCasserole(minion, index, round) }] : [];
  });
}
