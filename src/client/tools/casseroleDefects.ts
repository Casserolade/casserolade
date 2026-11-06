import type { Casserole } from '#src/engine/types.ts';

/** What a casserole costs while its politician is in a **Scandale**, in the words of the cards. Empty: no défaut. */
export function casseroleDefects(casserole: Casserole): string[] {
  const defects: string[] = [];
  if ((casserole.budgetPerRound ?? 0) < 0) defects.push(`${casserole.budgetPerRound} budget par manche`);
  if (casserole.locked) defects.push('ne bouge plus');
  if (casserole.silence) defects.push('perd ses effets');
  if (casserole.hpLossOnDeath) defects.push(`vous perdez ${casserole.hpLossOnDeath} sondages à sa mort`);
  return defects;
}
