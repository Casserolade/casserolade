import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import type { CombatLayout } from '#src/client/tools/combatLayout.ts';

const SLOTS = 7;
const SIDE_MARGIN = 8;
const GAP = 5;
/** However wide the screen, a medallion never grows past this, in screen pixels. */
const MAX_WIDTH = 96;
/** The middles of the rows, as shares of the screen's height: the rival's above, yours below, room to strike between. */
const ENEMY_ROW = 0.36;
const OWN_ROW = 0.63;

/**
 * Where the medallions of a combat stand on a phone held upright: seven across the width at most, the rival's row in
 * the upper part of the screen, yours in the lower part, each row centred. Same contract as combatLayout.
 */
export function portraitCombatLayout(width: number, height: number, enemyCount: number, ownCount: number): CombatLayout {
  const slots = Math.max(SLOTS, enemyCount, ownCount);
  const medallionWidth = Math.min(MAX_WIDTH, (width - 2 * SIDE_MARGIN - GAP * (slots - 1)) / slots);
  const scale = medallionWidth / MEDALLION_LAYOUT.width;
  const medallionHeight = MEDALLION_LAYOUT.height * scale;
  const row = (count: number, centerY: number) => {
    const rowWidth = count * medallionWidth + Math.max(0, count - 1) * GAP;
    return Array.from({ length: count }, (_, index) => ({ x: (width - rowWidth) / 2 + index * (medallionWidth + GAP), y: centerY - medallionHeight / 2 }));
  };
  return { scale, enemy: row(enemyCount, height * ENEMY_ROW), own: row(ownCount, height * OWN_ROW) };
}
