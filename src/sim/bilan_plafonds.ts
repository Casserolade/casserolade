/**
 * Le plafond de chaque camp : jusqu'où monte son meilleur montage, multiplicateur compris. L'objectif du jeu est que
 * chaque camp puisse monter un politique à 1000/1000 entre les manches 13 et 15, avec les bonnes pièces.
 *
 * Le montage est posé au début de la manche 11, à l'échelon 6, chaque politique à ses stats de carte plus ce qu'un
 * plateau ordinaire a gagné jusque-là. Un script le joue ensuite sans tricher jusqu'à la manche 15 : la vraie boutique,
 * le vrai budget, de vrais combats contre un plateau qui grossit. On lit le plus gros politique équilibré, c'est-à-dire
 * le plus petit de son attaque et de ses PV, en médiane sur plusieurs parties.
 *
 *   node src/sim/bilan_plafonds.ts [--games 24] [--camp rn]
 *
 * Ce n'est pas une mesure d'équilibre : un bot ne monte pas ces montages. C'est ce qu'un joueur qui les connaît peut
 * atteindre, à relire après tout changement d'une clé de voûte ou d'une règle de relance.
 */
import { parseArgs } from 'node:util';
import { applyAction, createGame, resolveRound } from '../engine/game.ts';
import type { Game, Player } from '../engine/game.ts';
import { makeMinion } from '../engine/minion.ts';
import { take, welcome } from '../engine/recruit.ts';
import type { Camp, HandSpell, Minion, PlayerAction } from '../engine/types.ts';
import { CARD_BY_ID } from '../data/cards.ts';
import { CASSEROLE_BY_ID } from '../data/casseroles.ts';
import { SPELL_BY_ID } from '../data/sorts.ts';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '24' },
    /** Un seul camp : le début de son nom, sans accent (`rn`, `eco`, `soc`). */
    camp: { type: 'string', default: '' },
  },
});

/** La manche où le montage est complet : l'échelon 6 vient d'être atteint. */
const START = 11;
const END = 15;
/** Ce que chaque politique du montage a gagné avant, en attaque et en PV : un plateau ordinaire de la manche 11. */
const GROWN = 12;
/** L'adversaire : sept politiques sans effet, à tant de stats par manche passée depuis la huitième. */
const FOE_GROWTH = 10;

interface Setup {
  name: string;
  camps: Camp[];
  /** Le montage, de gauche à droite. */
  board: string[];
  /** La clé de voûte : dorée dans la seconde mesure. */
  keystone: string;
  /** Le politique que le montage fait grossir, s'il y en a un seul. */
  carrier: string;
  note: string;
  /** Ce que la partie a déjà compté avant la manche 11 (actualisations, Tracts, Écologistes joués). */
  before?: (p: Player) => void;
  /** Les Ralliements déjà posés sur le porteur, avant la manche 11. */
  rallied?: string[];
  /** Le recrutement d'une manche, joué par gestes. */
  turn: (game: Game, p: Player, carrier: Minion) => void;
}

const act = (game: Game, action: PlayerAction): boolean => applyAction(game, 0, action).ok;

/** Un choix ouvert prend sa première carte : le script ne s'en sert pas. */
function settle(game: Game, p: Player): void {
  for (let i = 0; p.discover && i < 20; i++) act(game, { t: 'discover', i: 0 });
}

function castTracts(game: Game, p: Player, target: Minion): void {
  for (let i = 0; i < 400; i++) {
    const stack = p.spells.find((s) => s.spellId === 'tract');
    if (!stack || !act(game, { t: 'cast', uid: stack.uid, target: target.uid })) return;
  }
}

/** Achète ce sort s'il est en boutique et que le budget suffit. */
function buySpell(game: Game, p: Player, spellId: string): HandSpell | null {
  const slot = p.shopSpells.indexOf(spellId);
  if (slot < 0 || p.budget < SPELL_BY_ID[spellId].cost || !act(game, { t: 'buy_spell', slot })) return null;
  return [...p.spells].reverse().find((s) => s.spellId === spellId) ?? null;
}

/** Achète le premier politique de la boutique qui convient, le pose, puis le renvoie : son Annonce et « joué » ont compté. */
function cycle(game: Game, p: Player, fits: (cardId: string) => boolean, target?: Minion): boolean {
  const slot = p.shop.findIndex(fits);
  if (slot < 0 || p.budget < game.params.buyCost || p.board.length >= game.params.boardSize) return false;
  if (!act(game, { t: 'buy', slot, main: true })) return false;
  const bought = p.hand[p.hand.length - 1];
  if (!bought || !act(game, { t: 'play', uid: bought.uid, ...(target ? { target: target.uid } : {}) })) return false;
  settle(game, p);
  if (!bought.golden) act(game, { t: 'sell', uid: bought.uid });
  return true;
}

const hasAnnonce = (cardId: string, action: string) => (CARD_BY_ID[cardId].effects ?? []).some((e) => e.when === 'annonce' && e.do === action);

const SETUPS: Setup[] = [
  {
    name: 'Reconquête',
    camps: ['reconquete', 'republicains', 'macronie', 'socialistes', 'insoumis'],
    board: ['zemmour', 'knafo', 'messiha', 'villiers', 'asselineau', 'dupont_aignan', 'lafont'],
    keystone: 'zemmour',
    carrier: 'zemmour',
    note: 'Zemmour ; 25 actualisations faites avant la manche 11 ; tout le budget en actualisations',
    before: (p) => {
      p.counters.actualisations = 25;
    },
    turn: (game, p) => {
      for (let i = 0; i < 80 && (p.freeRolls > 0 || p.budget >= 1); i++) {
        const matinale = buySpell(game, p, 'matinale');
        if (matinale) act(game, { t: 'cast', uid: matinale.uid });
        if (!act(game, { t: 'roll' })) return;
      }
    },
  },
  {
    name: 'Républicains',
    camps: ['republicains', 'reconquete', 'macronie', 'socialistes', 'insoumis'],
    board: ['sarkozy', 'retailleau', 'fillon', 'juppe', 'dati', 'pecresse', 'lisnard'],
    keystone: 'sarkozy',
    carrier: 'retailleau',
    note: 'Sarkozy, Fillon, Juppé ; toutes les casseroles abordables sur Retailleau, le Bracelet dès qu\'il passe',
    turn: (game, p, carrier) => {
      const bracelet = () => {
        const held = carrier.scandal ? buySpell(game, p, 'bracelet_electronique') : null;
        if (held) act(game, { t: 'cast', uid: held.uid });
      };
      for (let i = 0; i < 30; i++) {
        bracelet();
        const offer = p.casseroleOffer ? CASSEROLE_BY_ID[p.casseroleOffer] : null;
        if (offer && p.budget >= offer.cost && act(game, { t: 'buy_casserole' })) {
          const held = p.spells.find((s) => s.casseroleId === offer.id);
          if (held) act(game, { t: 'cast', uid: held.uid, target: carrier.uid });
          settle(game, p);
          continue;
        }
        if (p.budget < 2 || !act(game, { t: 'roll' })) break;
      }
      bracelet();
    },
  },
  {
    name: 'Écologistes',
    camps: ['ecologistes', 'republicains', 'macronie', 'socialistes', 'insoumis'],
    board: ['doucet', 'tondelier', 'jadot', 'cohn_bendit', 'jadot', 'lassalle'],
    keystone: 'cohn_bendit',
    carrier: 'tondelier',
    note: 'Cohn-Bendit entre deux Jadot, Lassalle ; 12 Écologistes joués avant ; une place libre pour jouer puis renvoyer ceux de la boutique',
    before: (p) => {
      p.counters.ecologistes_joues = 12;
    },
    turn: (game, p) => {
      for (let i = 0; i < 30 && p.budget >= 3; i++) {
        const conseil = buySpell(game, p, 'conseil_des_ministres');
        if (conseil) {
          act(game, { t: 'cast', uid: conseil.uid });
          continue;
        }
        if (cycle(game, p, (id) => CARD_BY_ID[id].camp === 'ecologistes')) continue;
        if (p.budget < 4 || !act(game, { t: 'roll' })) return;
      }
    },
  },
  {
    name: 'Insoumis',
    camps: ['insoumis', 'republicains', 'macronie', 'socialistes', 'ecologistes'],
    board: ['melenchon', 'trouve', 'panot', 'ruffin', 'aubry', 'chikirou', 'chirac'],
    keystone: 'melenchon',
    carrier: 'trouve',
    note: 'Chirac, Panot (ses Tracts déjà à +3/+3), Ruffin, Aubry, Chikirou, Mélenchon ; 30 Tracts lancés avant ; tous les Tracts sur Trouvé',
    before: (p) => {
      p.tract = { atk: 3, hp: 3 };
      p.counters.tracts = 30;
    },
    turn: (game, p, carrier) => {
      castTracts(game, p, carrier);
      for (let i = 0; i < 12; i++) {
        const promesse = buySpell(game, p, 'promesse');
        if (promesse) {
          act(game, { t: 'cast', uid: promesse.uid });
          castTracts(game, p, carrier);
          continue;
        }
        const again = buySpell(game, p, 'seconde_deliberation');
        const panot = p.board.find((m) => m.cardId === 'panot');
        if (again && panot) {
          act(game, { t: 'cast', uid: again.uid, target: panot.uid });
          continue;
        }
        if (p.budget < 3 || !act(game, { t: 'roll' })) return;
      }
    },
  },
  {
    name: 'Socialistes',
    camps: ['socialistes', 'republicains', 'macronie', 'insoumis', 'ecologistes'],
    board: ['glucksmann', 'strauss_kahn', 'hollande', 'vallaud', 'faure', 'cazeneuve', 'mitterrand'],
    keystone: 'strauss_kahn',
    carrier: 'strauss_kahn',
    rallied: ['castaner', 'dupond_moretti'],
    note: 'Glucksmann en tête, Strauss-Kahn armé du Cumul de Castaner et de l\'Immunité de Dupond-Moretti, Hollande, Mitterrand ; tout se joue en combat',
    turn: () => {},
  },
  {
    name: 'RN',
    camps: ['rn', 'republicains', 'macronie', 'socialistes', 'ecologistes'],
    board: ['lepen', 'bardella', 'aliot', 'chenu', 'odoul', 'chirac'],
    keystone: 'lepen',
    carrier: 'bardella',
    note: 'Marine Le Pen, Chirac (il rejoue chaque Annonce de débauchage en fin de tour), Aliot, Odoul ; une place libre pour jouer puis renvoyer les débaucheurs de la boutique',
    turn: (game, p, carrier) => {
      for (let i = 0; i < 40; i++) {
        const spell = buySpell(game, p, 'debauchage');
        if (spell) {
          act(game, { t: 'cast', uid: spell.uid, target: carrier.uid });
          continue;
        }
        if (cycle(game, p, (id) => hasAnnonce(id, 'debaucher'), carrier)) continue;
        if (p.budget < 4 || !act(game, { t: 'roll' })) return;
      }
    },
  },
  {
    name: 'Macronie',
    camps: ['macronie', 'republicains', 'rn', 'socialistes', 'ecologistes'],
    board: ['riner', 'macron', 'bayrou', 'maillard', 'lassalle', 'chirac'],
    keystone: 'macron',
    carrier: 'riner',
    note: 'Macron, Chirac (des Darmanin en main à chaque fin de tour), Bayrou, Lassalle, Maillard ; tous les Ralliements sur Riner',
    turn: (game, p, carrier) => {
      const rallyAll = () => {
        for (const m of [...p.hand]) if (m.keywords.includes('ralliement')) act(game, { t: 'play', uid: m.uid, onto: carrier.uid });
        settle(game, p);
      };
      rallyAll();
      for (let i = 0; i < 40; i++) {
        const slot = p.shop.findIndex((id) => (CARD_BY_ID[id].keywords ?? []).includes('ralliement'));
        if (slot >= 0 && p.budget >= game.params.buyCost) {
          if (!act(game, { t: 'buy', slot, main: true })) return;
          rallyAll();
          continue;
        }
        if (p.budget < 4 || !act(game, { t: 'roll' })) return;
      }
    },
  },
];

/** Pose un politique du montage : pris dans la réserve, avec les gains d'un plateau ordinaire. */
function lay(game: Game, p: Player, cardId: string, golden: boolean): void {
  take(game, cardId);
  const card = CARD_BY_ID[cardId];
  const m = welcome(game, p, makeMinion(card, game.nextUid++));
  if (golden) {
    m.golden = true;
    m.atk += card.atk;
    m.hp += card.hp;
  }
  m.atk += GROWN;
  m.hp += GROWN;
  p.board.push(m);
}

/** Le plus gros politique équilibré du plateau après chaque manche, de la 11 à la 15. */
function play(setup: Setup, seed: number, goldenKeystone: boolean): Record<number, number> {
  const game = createGame({ seed, seats: 2, heroes: ['glucksmann', 'glucksmann'], activeCamps: setup.camps });
  const [p, foe] = game.players;
  game.round = START - 1;
  p.tier = game.params.tierMax;
  foe.tier = game.params.tierMax;
  resolveRound(game);
  for (const cardId of setup.board) lay(game, p, cardId, goldenKeystone && cardId === setup.keystone);
  setup.before?.(p);
  const host = p.board.find((m) => m.cardId === setup.carrier);
  for (const cardId of setup.rallied ?? []) {
    take(game, cardId);
    const rally = welcome(game, p, makeMinion(CARD_BY_ID[cardId], game.nextUid++));
    p.hand.push(rally);
    if (host) act(game, { t: 'play', uid: rally.uid, onto: host.uid });
  }
  const best: Record<number, number> = {};
  for (let round = START; round <= END; round++) {
    // Personne n'est éliminé : la mesure porte sur le plateau, pas sur la partie.
    p.hp = 999;
    foe.hp = 999;
    settle(game, p);
    const carrier = p.board.find((m) => m.cardId === setup.carrier) ?? p.board[0];
    setup.turn(game, p, carrier);
    settle(game, p);
    const size = FOE_GROWTH * (round - 8);
    foe.board = Array.from({ length: game.params.boardSize }, () => makeMinion({ id: 'adversaire', name: 'Adversaire', camp: 'civile', tier: 1, atk: size, hp: size }, game.nextUid++));
    resolveRound(game);
    best[round] = p.board.reduce((top, m) => Math.max(top, Math.min(m.atk, m.hp)), 0);
  }
  return best;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const games = Number(values.games);
const wanted = SETUPS.filter((s) => plain(s.name).startsWith(plain(values.camp)));
console.log(`# Plafond par camp : montage posé au début de la manche ${START}, ${games} parties, médiane du plus gros politique équilibré`);
console.log('  ' + 'camp'.padEnd(14) + 'manche 13'.padStart(10) + 'manche 14'.padStart(10) + 'manche 15'.padStart(10) + '   clé de voûte dorée, manche 15');
for (const setup of wanted) {
  const runs = Array.from({ length: games }, (_, i) => play(setup, 100 + i, false));
  const gilded = Array.from({ length: games }, (_, i) => play(setup, 100 + i, true));
  const at = (round: number) => String(median(runs.map((r) => r[round]))).padStart(10);
  console.log('  ' + setup.name.padEnd(14) + at(13) + at(14) + at(END) + '   ' + median(gilded.map((r) => r[END])));
  console.log('    ' + setup.note);
}
