import type { Camp, Minion } from './types.ts';

const EXTREMES: ReadonlySet<Camp> = new Set(['insoumis', 'rn', 'reconquete']);

/**
 * Ce serviteur compte-t-il comme un membre de ce camp ? Ni droite ni gauche compte pour tous les camps,
 * sauf la Société civile, qui n'est pas un camp. `extremes` : contexte du fer à cheval.
 */
export function isCamp(m: Pick<Minion, 'camp' | 'keywords'>, camp: Camp, extremes = false): boolean {
  if (camp === 'civile') return m.camp === 'civile';
  if (m.camp === camp) return true;
  if (m.keywords.includes('ni_droite_ni_gauche')) return true;
  return extremes && EXTREMES.has(m.camp) && EXTREMES.has(camp);
}
