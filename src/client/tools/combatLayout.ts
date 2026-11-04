import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import { STAGE_HEIGHT, STAGE_WIDTH, stageScale } from '#src/client/tools/stageScale.ts';

/** On the 1920×1080 table: the rows of the combat, on the same carpet as the shop and the board. */
const ENEMY_ROW_Y = 312;
const OWN_ROW_Y = 612;
const ROW_WIDTH = 1240;
const GAP = 34;
const SLOTS = 7;

export interface CombatLayout {
  /** Screen pixels per medallion unit. */
  scale: number;
  /** Top left corner of each medallion, enemy row and own row. */
  enemy: { x: number; y: number }[];
  own: { x: number; y: number }[];
}

/**
 * Where the medallions of a combat stand: enemies on the shop's side, yours on the board's side,
 * the same size as during recruitment. Width and height are the screen's, the table being centered in it.
 */
export function combatLayout(width: number, height: number, enemyCount: number, ownCount: number): CombatLayout {
  const unit = stageScale(width, height);
  const left = (width - STAGE_WIDTH * unit) / 2;
  const top = (height - STAGE_HEIGHT * unit) / 2;
  const slots = Math.max(SLOTS, enemyCount, ownCount);
  const fit = Math.min(1, (ROW_WIDTH - GAP * (slots - 1)) / slots / MEDALLION_LAYOUT.width);
  const scale = unit * fit;
  const medallionWidth = MEDALLION_LAYOUT.width * scale;
  const medallionHeight = MEDALLION_LAYOUT.height * scale;
  const row = (count: number, centerY: number) => {
    const rowWidth = count * medallionWidth + (count - 1) * GAP * unit;
    return Array.from({ length: count }, (_, index) => ({
      x: left + (STAGE_WIDTH * unit - rowWidth) / 2 + index * (medallionWidth + GAP * unit),
      y: top + centerY * unit - medallionHeight / 2,
    }));
  };
  return { scale, enemy: row(enemyCount, ENEMY_ROW_Y), own: row(ownCount, OWN_ROW_Y) };
}
