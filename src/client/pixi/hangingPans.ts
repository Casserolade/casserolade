import { Container, Graphics, Sprite } from 'pixi.js';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import type { CombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';

const { width: W, height: H } = MEDALLION_LAYOUT;
/** The casseroles hang under the medallion, as on the table. */
const PAN = { size: 34, gap: 2, top: 8, string: 12 };

/** A medallion's casseroles, each on its string, in a row under it: the same as on the table. */
export function hangingPans(casseroles: string[], textures: CombatTextures): { row: Container; pans: Container[] } {
  const row = new Container();
  const pans: Container[] = [];
  const span = casseroles.length * PAN.size + Math.max(0, casseroles.length - 1) * PAN.gap;
  casseroles.forEach((id, index) => {
    const texture = textures.pans[CASSEROLE_BY_ID[id]?.kind ?? 'affaire'];
    if (!texture) return;
    const pan = new Container();
    pan.position.set(W / 2 - span / 2 + index * (PAN.size + PAN.gap) + PAN.size / 2, H + PAN.top);
    const string = new Graphics().moveTo(0, -PAN.string).lineTo(0, 2).stroke({ color: '#cccccc', width: 1 });
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0);
    sprite.setSize(PAN.size, PAN.size);
    pan.addChild(string, sprite);
    pans.push(pan);
    row.addChild(pan);
  });
  return { row, pans };
}
