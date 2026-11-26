import type { Casserole } from '#src/engine/types.ts';

const polls = (n: number) => (n > 1 ? 'sondages' : 'sondage');

/** What a casserole costs while its politician is in a **Scandale**, in the words of the cards. Empty: no défaut. */
export function casseroleDefects(casserole: Casserole): string[] {
  const defects: string[] = [];
  if ((casserole.budgetPerRound ?? 0) < 0) defects.push(`${casserole.budgetPerRound} budget par manche`);
  if (casserole.locked) defects.push('ne bouge plus');
  if (casserole.silence) defects.push('perd ses effets');
  if (casserole.pollsPerRound) defects.push(`-${casserole.pollsPerRound} ${polls(casserole.pollsPerRound)} par manche`);
  if (casserole.noAttack) defects.push('n\'attaque plus');
  if (casserole.hpLossOnDeath) defects.push(`vous perdez ${casserole.hpLossOnDeath} ${polls(casserole.hpLossOnDeath)} à sa mort`);
  if (casserole.splash) defects.push(`éclabousse ses voisins (-${casserole.splash}/-${casserole.splash} en combat)`);
  return defects;
}
