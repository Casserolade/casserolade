import type { Keyword, Minion } from '../engine/types.ts';
import { keywordFit } from './keywordFit.ts';

const size = (m: Minion) => m.atk + m.hp;

/** Ce que ce Ralliement apporte à cet hôte, au-delà de ses stats : ses mots-clés, et son « Quand il attaque ». */
function fit(rallying: Minion, host: Minion): number {
  const keywords = rallying.keywords.reduce((sum, k) => sum + keywordFit(k, host), 0);
  const teachesAttack = rallying.effects.some((e) => e.when === 'meeting');
  return keywords + (teachesAttack ? Math.min(host.atk, 40) / 2 + (host.keywords.includes('cumul') ? 15 : 0) : 0);
}

function best(hosts: Minion[], score: (m: Minion) => number): Minion | null {
  let chosen: Minion | null = null;
  for (const m of hosts) if (!chosen || score(m) > score(chosen) || (score(m) === score(chosen) && size(m) > size(chosen))) chosen = m;
  return chosen;
}

/** Les mots-clés qu'un Ralliement donne à son hôte, et qui se perdent si l'hôte les a déjà. */
const GIVEN: Keyword[] = ['polemique', 'immunite', 'cumul', 'balai', 'retour', 'porte_parole'];

/**
 * L'hôte d'un Ralliement, pour un bot qui joue comme un joueur : jamais un jeton. Null : mieux vaut le poser.
 * - Quand un allié compte les Ralliements reçus par un même politique (Bayrou, Macron), ils s'empilent sur celui qui
 *   en a déjà le plus : c'est ce nombre qui fait grandir l'hôte.
 * - Sinon, le Ralliement va là où ses mots-clés servent, et la Polémique pas sur le plus gros (13 novembre 2026 : le
 *   bot empilait les Peltier, Polémique comprise, sur son plus gros politique).
 * - Jamais deux fois le même mot-clé sur le même politique, sauf s'il ne reste aucune autre cible et que le plateau
 *   est plein : il ne donne alors que ses stats, au plus gros. S'il reste une place, il se pose.
 * - Un Ralliement sans mot-clé à donner rejoint le plus gros.
 */
export function rallyHost(board: Minion[], rallying: Minion, boardFull: boolean): Minion | null {
  const hosts = board.filter((m) => !m.token && m.uid !== rallying.uid);
  if (hosts.length === 0) return null;
  const countsRallies = board.some((m) => m.effects.some((e) => e.do === 'buff_par_ralliement'));
  if (countsRallies) return best(hosts, (m) => m.rallied.length * 1000 + fit(rallying, m));
  const gives = rallying.keywords.some((k) => GIVEN.includes(k)) || rallying.effects.some((e) => e.when === 'meeting');
  if (!gives) return best(hosts, size);
  const fitted = best(hosts, (m) => fit(rallying, m));
  if (fitted && fit(rallying, fitted) > 0) return fitted;
  return boardFull ? best(hosts, size) : null;
}
