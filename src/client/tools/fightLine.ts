import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { Fight } from '#src/engine/state.ts';

/** One of a player's last combats, as the table reads it. */
export interface FightLine {
  /** « M12 » */
  round: string;
  outcome: 'Victoire' | 'Défaite' | 'Égalité';
  /** « contre Nicolas Sarkozy », « contre le fantôme de Fabien Roussel » */
  against: string;
  /** What it cost in polls, to it or to its rival: « 7 sondages pris », « 7 sondages perdus »; null when nobody lost any. */
  polls: string | null;
}

const OUTCOMES = { gagne: 'Victoire', perdu: 'Défaite', egalite: 'Égalité' } as const;

function pollsText(count: number, verb: 'pris' | 'perdus'): string | null {
  if (count <= 0) return null;
  return count === 1 ? `1 sondage ${verb === 'pris' ? 'pris' : 'perdu'}` : `${count} sondages ${verb}`;
}

/** Who was faced: a hero by its name, or the ghost that wore its face. */
function rivalName(fight: Fight): string {
  const name = HERO_BY_ID[fight.heroId]?.name ?? null;
  if (fight.against >= 0) return name ?? 'un adversaire';
  return name && fight.heroId !== 'fantome' ? `le fantôme de ${name}` : 'un fantôme';
}

/** A combat of a player's recent history in words: its round, its outcome, its rival, and the polls it moved. */
export function fightLine(fight: Fight): FightLine {
  const polls = fight.result === 'gagne' ? pollsText(fight.dealt, 'pris') : pollsText(fight.lost, 'perdus');
  return { round: `M${fight.round}`, outcome: OUTCOMES[fight.result], against: `contre ${rivalName(fight)}`, polls };
}
