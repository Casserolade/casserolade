import { casseroleDefects } from '#src/client/tools/casseroleDefects.ts';
import { describeOwnerBonus } from '#src/client/tools/describeOwnerBonus.ts';
import type { WornCasserole } from '#src/client/tools/wornCasserole.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import type { Casserole } from '#src/engine/types.ts';

/** Asleep or forgotten, said for a casserole with a défaut, then for one without. In bold, only what the glossary explains. */
const STATE_LINES = {
  dormant: ['Son défaut dort : il ne joue qu\'en **Scandale**.', 'Sans défaut, mais elle compte pour le **Scandale**.'],
  forgotten: ['Oubliée : son défaut ne jouera plus, son avantage reste.', 'Oubliée : elle ne compte plus pour le **Scandale**.'],
} as const;

/**
 * What a casserole of the board does now, beside its card: its défaut asleep, playing or forgotten, then whether
 * the owner bonus printed on the card was given.
 */
export function wornCasseroleLines(casserole: Casserole, worn: WornCasserole): string[] {
  const hasDefect = casseroleDefects(casserole).length > 0;
  const rounds = worn.scandalLeft > 1 ? `${worn.scandalLeft} manches` : 'une manche';
  const scandal = hasDefect ? `En **Scandale** : son défaut joue encore ${rounds}.` : 'Sans défaut : le **Scandale** en cours ne lui coûte rien.';
  const state = worn.state === 'scandal' ? scandal : STATE_LINES[worn.state][hasDefect ? 0 : 1];
  const owner = CARD_BY_ID[casserole.owner]?.name;
  if (!owner || describeOwnerBonus(casserole) === null) return [state];
  return [state, worn.owned ? `Posée sur ${owner} : le bonus en plus est acquis.` : `Pas posée sur ${owner} : pas de bonus en plus.`];
}
