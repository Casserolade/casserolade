/**
 * Ce que chaque multiplicateur d'échelon 5 apporte à un plateau sans légende : Lassalle (Fins de tour), Polony
 * (Annonces), Riner (Héritages). Pour chaque montage, tout à l'échelon 5 ou moins, la partie se joue de la manche 9 à
 * la manche 13, une fois avec le multiplicateur et une fois avec un politique sans effet à sa place : ce que le plateau
 * a gagné pour de bon, en stats, dans les deux cas. Un multiplicateur qui n'ajoute rien n'a pas ses synergies.
 *   node src/sim/bilan_multiplicateurs.ts
 *   node src/sim/bilan_multiplicateurs.ts --games 40
 */
import { parseArgs } from 'node:util';
import { applyAction, createGame, resolveRound } from '../engine/game.ts';
import type { Game, Player } from '../engine/game.ts';
import { makeMinion } from '../engine/minion.ts';
import { take, welcome } from '../engine/recruit.ts';
import type { Camp, Minion, PlayerAction } from '../engine/types.ts';
import { CARD_BY_ID } from '../data/cards.ts';

const { values } = parseArgs({ options: { games: { type: 'string', default: '24' } } });

/** La manche où le montage est posé : l'échelon 5 vient d'être atteint. */
const START = 9;
const END = 13;
/** Ce que chaque politique du montage a gagné avant : un plateau ordinaire de la manche 9. */
const GROWN = 6;
/** L'adversaire : sept politiques sans effet, à tant de stats par manche passée depuis la sixième. */
const FOE_GROWTH = 8;
const TIER = 5;

interface Setup {
  name: string;
  multiplier: 'lassalle' | 'polony' | 'riner';
  camps: Camp[];
  /** Le montage, de gauche à droite, multiplicateur compris. */
  board: string[];
  note: string;
  /** Le recrutement d'une manche, joué par gestes. */
  turn: (game: Game, p: Player) => void;
}

const act = (game: Game, action: PlayerAction): boolean => applyAction(game, 0, action).ok;

function settle(game: Game, p: Player): void {
  for (let i = 0; p.discover && i < 20; i++) act(game, { t: 'discover', i: 0 });
}

/** Toute la pile de Tracts sur le plus gros politique. */
function castTracts(game: Game, p: Player): void {
  const stack = p.spells.find((s) => s.spellId === 'tract');
  const target = [...p.board].sort((a, b) => b.atk + b.hp - a.atk - a.hp)[0];
  if (stack && target) act(game, { t: 'cast', uid: stack.uid, target: target.uid, all: true });
}

/** Achète le premier politique de la boutique qui convient, le pose, puis le renvoie : son Annonce a compté. */
function cycle(game: Game, p: Player, fits: (cardId: string) => boolean): boolean {
  const slot = p.shop.findIndex(fits);
  if (slot < 0 || p.budget < game.params.buyCost || p.board.length >= game.params.boardSize) return false;
  if (!act(game, { t: 'buy', slot, main: true })) return false;
  const bought = p.hand[p.hand.length - 1];
  const target = [...p.board].sort((a, b) => b.atk + b.hp - a.atk - a.hp)[0];
  if (!bought || !act(game, { t: 'play', uid: bought.uid, ...(target ? { target: target.uid } : {}) })) return false;
  settle(game, p);
  if (!bought.golden) act(game, { t: 'sell', uid: bought.uid });
  return true;
}

const annonce = (actions: string[]) => (cardId: string) => (CARD_BY_ID[cardId].effects ?? []).some((e) => e.when === 'annonce' && actions.includes(e.do));

/** Tout le budget à jouer puis renvoyer les Annonces de la boutique, en actualisant quand il n'y en a pas. */
function cycleAll(game: Game, p: Player, fits: (cardId: string) => boolean): void {
  for (let i = 0; i < 40; i++) {
    if (cycle(game, p, fits)) continue;
    if (p.budget < game.params.buyCost + 1 || !act(game, { t: 'roll' })) return;
  }
}

/** Qui tombe pour les Socialistes : un jeton d'abord, puis un petit politique à Retour en politique ou à Héritage. */
function fodder(p: Player): Minion | null {
  const small = (m: Minion) => m.camp === 'socialistes' && !m.token && CARD_BY_ID[m.cardId].tier <= 3;
  return (
    p.board.find((m) => m.token && m.camp === 'socialistes') ??
    p.board.find((m) => small(m) && m.keywords.includes('retour')) ??
    p.board.find((m) => small(m) && m.effects.some((e) => e.when === 'heritage')) ??
    null
  );
}

/**
 * Tout le budget à faire tomber un Socialiste pour les siens : le Fusible de la boutique, sinon Hidalgo, jouée sur un
 * jeton, un Retour en politique ou un Héritage, puis renvoyée. Sans personne à sacrifier, un petit Socialiste de la
 * boutique fait l'affaire. On actualise quand il n'y a rien.
 */
function sacrificeAll(game: Game, p: Player): void {
  for (let i = 0; i < 40; i++) {
    const victim = fodder(p);
    if (!victim) {
      const slot = p.shop.findIndex((id) => CARD_BY_ID[id].camp === 'socialistes' && CARD_BY_ID[id].tier <= 2);
      const room = p.board.length < game.params.boardSize - 1;
      if (slot >= 0 && room && p.budget >= game.params.buyCost + 2 && act(game, { t: 'buy', slot, main: true })) {
        act(game, { t: 'play', uid: p.hand[p.hand.length - 1].uid });
        continue;
      }
    } else {
      const spell = p.shopSpells.indexOf('fusible');
      if (spell >= 0 && act(game, { t: 'buy_spell', slot: spell })) {
        act(game, { t: 'cast', uid: p.spells[p.spells.length - 1].uid, target: victim.uid });
        continue;
      }
      const slot = p.shop.indexOf('hidalgo');
      if (slot >= 0 && p.budget >= game.params.buyCost && p.board.length < game.params.boardSize && act(game, { t: 'buy', slot, main: true })) {
        const hidalgo = p.hand[p.hand.length - 1];
        if (act(game, { t: 'play', uid: hidalgo.uid, target: victim.uid }) && !hidalgo.golden) act(game, { t: 'sell', uid: hidalgo.uid });
        continue;
      }
    }
    if (p.budget < game.params.buyCost + 1 || !act(game, { t: 'roll' })) return;
  }
}

const SETUPS: Setup[] = [
  {
    name: 'Fins de tour, Écologistes',
    multiplier: 'lassalle',
    camps: ['ecologistes', 'republicains', 'macronie', 'socialistes', 'insoumis'],
    board: ['doucet', 'piolle', 'lassalle', 'tondelier', 'rousseau', 'batho', 'jadot'],
    note: 'Tondelier et Rousseau font grossir le camp, Batho la boutique, Jadot rejoue ses voisins ; rien d\'autre à faire',
    turn: () => {},
  },
  {
    name: 'Fins de tour, Insoumis',
    multiplier: 'lassalle',
    camps: ['insoumis', 'republicains', 'macronie', 'socialistes', 'ecologistes'],
    board: ['trouve', 'portes', 'lassalle', 'bompard', 'ruffin', 'tache'],
    note: 'Portes, Taché et Bompard jouent des Tracts, Ruffin en donne ; la pile part sur le plus gros',
    turn: (game, p) => castTracts(game, p),
  },
  {
    name: 'Fins de tour, Société civile',
    multiplier: 'lassalle',
    camps: ['macronie', 'republicains', 'rn', 'socialistes', 'ecologistes'],
    board: ['durif', 'durif', 'lassalle', 'polony', 'oudea', 'doucet'],
    note: 'Durif, Polony, Oudéa-Castéra et Doucet grandissent seuls en fin de tour',
    turn: () => {},
  },
  {
    name: 'Annonces, Insoumis',
    multiplier: 'polony',
    camps: ['insoumis', 'republicains', 'macronie', 'socialistes', 'ecologistes'],
    board: ['trouve', 'polony', 'panot', 'ruffin', 'roussel'],
    note: 'tout le budget à jouer puis renvoyer les Annonces à Tracts de la boutique ; la pile part sur le plus gros',
    turn: (game, p) => {
      cycleAll(game, p, annonce(['carte', 'jouer_tract', 'tract_bonus']));
      castTracts(game, p);
    },
  },
  {
    name: 'Annonces, RN',
    multiplier: 'polony',
    camps: ['rn', 'republicains', 'macronie', 'socialistes', 'ecologistes'],
    board: ['odoul', 'polony', 'bardella', 'chenu', 'aliot'],
    note: 'tout le budget à jouer puis renvoyer les débaucheurs de la boutique',
    turn: (game, p) => cycleAll(game, p, annonce(['debaucher'])),
  },
  {
    name: 'Annonces, Société civile',
    multiplier: 'polony',
    camps: ['macronie', 'republicains', 'rn', 'socialistes', 'ecologistes'],
    board: ['arthaud', 'polony', 'philippe', 'attal', 'poutou'],
    note: 'tout le budget à jouer puis renvoyer Arthaud (la boutique grossit) et Philippe (il dore)',
    turn: (game, p) => cycleAll(game, p, annonce(['boutique_buff', 'dorer'])),
  },
  {
    name: 'Héritages, Socialistes',
    multiplier: 'riner',
    camps: ['socialistes', 'republicains', 'macronie', 'insoumis', 'ecologistes'],
    board: ['bouamrane', 'cazeneuve', 'riner', 'faure', 'vallaud', 'glucksmann'],
    note: 'Bouamrane et Cazeneuve laissent des Suppléants, dont la chute fait grossir les Socialistes par Faure ; tout se joue en combat',
    turn: () => {},
  },
  {
    name: 'Héritages, Socialistes, sacrifices',
    multiplier: 'riner',
    camps: ['socialistes', 'republicains', 'macronie', 'insoumis', 'ecologistes'],
    board: ['bouamrane', 'cazeneuve', 'riner', 'faure', 'vallaud', 'glucksmann'],
    note: 'le même, plus le Fusible et Hidalgo au recrutement : Bouamrane et Cazeneuve tombent pour les leurs, leurs Suppléants ensuite',
    turn: (game, p) => sacrificeAll(game, p),
  },
  {
    name: 'Annonces, Socialistes, sacrifices',
    multiplier: 'polony',
    camps: ['socialistes', 'republicains', 'macronie', 'insoumis', 'ecologistes'],
    board: ['bouamrane', 'thevenoud', 'polony', 'faure', 'vallaud', 'glucksmann'],
    note: 'Hidalgo jouée puis renvoyée sur un Suppléant, un Retour en politique ou un Héritage : son Annonce compte deux fois',
    turn: (game, p) => sacrificeAll(game, p),
  },
  {
    name: 'Héritages, RN',
    multiplier: 'riner',
    camps: ['rn', 'republicains', 'macronie', 'socialistes', 'ecologistes'],
    board: ['mc_lepen', 'marechal', 'jmlp', 'riner', 'bardella', 'aliot'],
    note: 'Marion Maréchal et Jean-Marie Le Pen lèguent pour de bon à l\'allié suivant ; tout se joue en combat',
    turn: () => {},
  },
  {
    name: 'Héritages, Insoumis',
    multiplier: 'riner',
    camps: ['insoumis', 'republicains', 'macronie', 'socialistes', 'ecologistes'],
    board: ['delogu', 'delogu', 'riner', 'trouve', 'panot', 'ruffin'],
    note: 'Delogu laisse un Tract en tombant ; la pile part sur le plus gros',
    turn: (game, p) => castTracts(game, p),
  },
];

/** Pose un politique du montage. Sans le multiplicateur : un politique de mêmes stats, sans effet, à sa place. */
function lay(game: Game, p: Player, cardId: string, plain: boolean): void {
  take(game, cardId);
  const card = CARD_BY_ID[cardId];
  const m: Minion = welcome(game, p, makeMinion(plain ? { id: card.id, name: card.name, camp: card.camp, tier: card.tier, atk: card.atk, hp: card.hp } : card, game.nextUid++));
  m.atk += GROWN;
  m.hp += GROWN;
  p.board.push(m);
}

const stats = (p: Player) => p.board.reduce((sum, m) => sum + m.atk + m.hp, 0);

/** Les stats du plateau gagnées de la manche 9 à la manche 13, et son plus gros politique équilibré à la fin. */
function play(setup: Setup, seed: number, withMultiplier: boolean): { gained: number; biggest: number } {
  const game = createGame({ seed, seats: 2, heroes: ['glucksmann', 'glucksmann'], activeCamps: setup.camps });
  const [p, foe] = game.players;
  game.round = START - 1;
  p.tier = TIER;
  foe.tier = TIER;
  resolveRound(game);
  for (const cardId of setup.board) lay(game, p, cardId, !withMultiplier && cardId === setup.multiplier);
  const start = stats(p);
  for (let round = START; round <= END; round++) {
    p.hp = 999;
    foe.hp = 999;
    settle(game, p);
    setup.turn(game, p);
    settle(game, p);
    const size = FOE_GROWTH * (round - 6);
    foe.board = Array.from({ length: game.params.boardSize }, () => makeMinion({ id: 'adversaire', name: 'Adversaire', camp: 'civile', tier: 1, atk: size, hp: size }, game.nextUid++));
    resolveRound(game);
  }
  return { gained: stats(p) - start, biggest: p.board.reduce((top, m) => Math.max(top, Math.min(m.atk, m.hp)), 0) };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const games = Number(values.games);
console.log(`# Les multiplicateurs d'échelon 5 : montage posé à la manche ${START}, joué jusqu'à la manche ${END}, ${games} parties, médianes`);
console.log('  ' + 'montage'.padEnd(30) + 'stats gagnées, sans'.padStart(20) + 'avec'.padStart(8) + 'rapport'.padStart(9) + 'plus gros, sans'.padStart(17) + 'avec'.padStart(7));
for (const setup of SETUPS) {
  const without = Array.from({ length: games }, (_, i) => play(setup, 100 + i, false));
  const withIt = Array.from({ length: games }, (_, i) => play(setup, 100 + i, true));
  const [a, b] = [median(without.map((r) => r.gained)), median(withIt.map((r) => r.gained))];
  const ratio = a > 0 ? (b / a).toFixed(2) : '—';
  console.log('  ' + setup.name.padEnd(30) + String(a).padStart(20) + String(b).padStart(8) + String(ratio).padStart(9) + String(median(without.map((r) => r.biggest))).padStart(17) + String(median(withIt.map((r) => r.biggest))).padStart(7));
  console.log('    ' + setup.note);
}
