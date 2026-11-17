import type { CharacterArt, GameManifest } from '#src/client/const/gameManifest.ts';
import { compactStat } from '#src/client/tools/compactStat.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { Camp } from '#src/engine/types.ts';

export interface VictoryPolitician {
  name: string;
  camp: Camp;
  /** Its stats as a medallion writes them: 2400 reads 2,4k. */
  atk: string;
  hp: string;
  golden: boolean;
  art: CharacterArt | null;
}

/** What the victory card shows: the winner, in a few words, and the board that won. */
export interface VictoryCardModel {
  headline: string;
  /** Who won, with which hero. */
  byline: string;
  /** The round the game ended at, and the polls left. */
  facts: string;
  heroName: string;
  hero: CharacterArt | null;
  /** The TV set of the last round, behind everything. */
  backdrop: string | null;
  board: VictoryPolitician[];
  /** The biggest politician of the board, by the smaller of its two stats; none on an empty board. */
  leader: VictoryPolitician | null;
}

/**
 * The victory card of a game won, read from the winner's last view. `pseudo`: the winner's name online; none in a
 * game against bots, where the hero alone is named.
 */
export function victoryCardModel(view: PlayerView, manifest: GameManifest, pseudo: string | null): VictoryCardModel {
  const heroName = HERO_BY_ID[view.heroId]?.name ?? '';
  const polls = Math.max(0, view.hp);
  const board = view.board.map((m) => ({ name: m.name, camp: m.camp, atk: compactStat(m.atk), hp: compactStat(m.hp), golden: m.golden, art: manifest.personnages[m.cardId] ?? null }));
  const biggest = view.board.reduce((best, m, index) => (Math.min(m.atk, m.hp) > Math.min(view.board[best]?.atk ?? -1, view.board[best]?.hp ?? -1) ? index : best), -1);
  return {
    headline: 'Élu !',
    byline: pseudo ? `${pseudo}, avec ${heroName}` : `Avec ${heroName}`,
    facts: `Manche ${view.round} · ${polls} ${polls > 1 ? 'sondages' : 'sondage'}`,
    heroName,
    hero: manifest.personnages[view.heroId] ?? null,
    backdrop: manifest.plateaux[view.plateau.id]?.decor ?? null,
    board,
    leader: board[biggest] ?? null,
  };
}
