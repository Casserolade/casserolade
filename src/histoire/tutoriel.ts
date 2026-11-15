import { TUTORIEL } from '../data/histoire/tutoriel.ts';
import type { Condition, Etape, Geste, Lecon, Rappels } from '../data/histoire/tutoriel.ts';
import { HEROES } from '../data/heroes.ts';
import { CARD_BY_ID, PARTY_CAMPS } from '../data/cards.ts';
import { PARAMS } from '../data/params.ts';
import { SPELL_BY_ID } from '../data/sorts.ts';
import { lostSpellReason } from '../engine/lostSpellReason.ts';
import type { Camp, Minion, PlayerAction } from '../engine/types.ts';
import type { BotLevel } from '../bots/bots.ts';
import type { GameOptions, PlayerView } from '../engine/game.ts';
import { createRng } from '../engine/rng.ts';
import { memesPolitiquesAutrement } from './campagne.ts';

export interface TableTutoriel {
  sieges: { heroId: string; level: BotLevel | null }[];
  game: Partial<GameOptions>;
}

/** La table du tutoriel : le joueur au siège 0, ses adversaires débutants, la boutique et la découverte écrites. */
export function composerTutoriel(seed: number): TableTutoriel {
  const rng = createRng(seed * 23 + 5);
  const autres = rng.shuffle(HEROES.map((h) => h.id).filter((id) => id !== TUTORIEL.heros));
  const sieges: TableTutoriel['sieges'] = [
    { heroId: TUTORIEL.heros, level: null },
    ...TUTORIEL.adversaires.map((level, i) => ({ heroId: autres[i], level })),
  ];
  const hero = HEROES.find((h) => h.id === TUTORIEL.heros);
  // Les adversaires gardent leur pouvoir, avec moins de budget à chaque manche.
  const freines = sieges.slice(1).map(({ heroId }) => {
    const mods = HEROES.find((h) => h.id === heroId)?.mods ?? {};
    return [heroId, { mods: { ...mods, budgetPerRound: (mods.budgetPerRound ?? 0) - TUTORIEL.malusAdversaires } }];
  });
  // Les cartes écrites se prennent dans la réserve : leurs camps doivent être en jeu.
  const ecrits = new Set<Camp>();
  for (const ids of [...Object.values(TUTORIEL.boutique), ...Object.values(TUTORIEL.decouvertes)]) {
    for (const id of ids) if (CARD_BY_ID[id] && CARD_BY_ID[id].camp !== 'civile') ecrits.add(CARD_BY_ID[id].camp);
  }
  const nombre = Math.max(ecrits.size, { ...PARAMS, ...TUTORIEL.regles }.activeCamps);
  const activeCamps = [...ecrits, ...rng.shuffle(PARTY_CAMPS.filter((c) => !ecrits.has(c)))].slice(0, nombre);
  return {
    sieges,
    game: {
      activeCamps,
      params: TUTORIEL.regles,
      heroes: sieges.map((s) => s.heroId),
      heroOverrides: { ...Object.fromEntries(freines), [TUTORIEL.heros]: { armor: (hero?.armor ?? 0) + TUTORIEL.bonusJoueur } },
      script: { seat: 0, boutique: TUTORIEL.boutique, sorts: TUTORIEL.sorts, casseroles: TUTORIEL.casseroles, decouvertes: TUTORIEL.decouvertes },
    },
  };
}

/** Un rappel, entre deux leçons. */
export type Rappel = keyof Rappels;

/** Ce que le guide affiche : une leçon, ou un rappel. */
export interface Consigne {
  cle: Lecon | Rappel;
  texte: string;
  /** Les gestes permis, en plus de ceux qui le sont toujours. */
  permis: Geste[] | 'tout';
  /** Un rappel, entre deux leçons. */
  rappel: boolean;
}

// —— Ce que voit le guide ——

const nombreEnBoutique = (view: PlayerView, id: string) => view.shop.filter((x) => x === id).length;
const placeSurLePlateau = (view: PlayerView) => view.board.length < view.boardLimit;
const mainPleine = (view: PlayerView) => view.hand.length + view.spells.length >= view.handLimit;
const peutAcheter = (view: PlayerView) => view.budget >= view.buyCost && !mainPleine(view) && view.shop.length > 0;
/** Actualiser dégèle : une boutique gelée ne s'actualise pas sans perdre ce qu'on y garde. */
const peutActualiser = (view: PlayerView) => !view.frozen && view.rollCost > 0 && view.budget >= view.rollCost;
const casserolesActives = (m: Minion) => m.casseroles.length > m.oublie;

function sortEnMain(view: PlayerView, id: string): boolean {
  return view.spells.some((s) => s.spellId === id);
}

function sortAchetable(view: PlayerView, id: string): boolean {
  const slot = view.shopSpells.indexOf(id);
  return slot >= 0 && view.budget >= (view.shopSpellCosts[slot] ?? Infinity) && !mainPleine(view);
}

function peutMonter(view: PlayerView): boolean {
  return view.tier < view.params.tierMax && !view.upgradeLock && view.budget >= view.upgradeCost;
}

function casseroleAchetable(view: PlayerView): boolean {
  return view.casseroleOffer !== null && view.budget >= (view.casseroleCost ?? Infinity) && !mainPleine(view);
}

function casseroleDisponible(view: PlayerView): boolean {
  return casseroleAchetable(view) || view.spells.some((s) => s.casseroleId);
}

/** De quoi faire le triple de cette carte dans la manche : les exemplaires qui manquent sont en boutique, et payables. */
function triplePossible(view: PlayerView, id: string): boolean {
  const possedes = [...view.board, ...view.hand].filter((m) => m.cardId === id && !m.golden).length;
  const manquent = 3 - possedes;
  return manquent > 0 && nombreEnBoutique(view, id) >= manquent && view.budget >= manquent * view.buyCost && view.hand.length + manquent <= view.handLimit;
}

/** Des sorts de la main qui feraient quelque chose maintenant : sur un des politiques, ou sans cible. */
function sortsLancables(view: PlayerView): number {
  const table = { board: view.board, shopSize: view.shop.length, boardLimit: view.boardLimit, relaunched: view.relaunched };
  return view.spells.filter((held) => {
    const spell = held.spellId ? SPELL_BY_ID[held.spellId] : undefined;
    if (!spell) return false;
    if (spell.effects.some((e) => e.do === 'oublier')) return view.board.some((m) => m.scandal);
    const cibles = spell.target ? view.board : [null];
    return cibles.some((cible) => lostSpellReason(spell, cible, table) === null);
  }).length;
}

/**
 * Il reste du budget, et de quoi le dépenser : un achat, un échelon, une actualisation, un sort, une casserole. Gelée,
 * la boutique ne compte plus l'actualisation : on ne force personne à défaire son gel pour partir au combat.
 */
export function resteADepenser(view: PlayerView): boolean {
  if (view.budget <= 0) return false;
  if (peutActualiser(view) || peutMonter(view) || peutAcheter(view)) return true;
  return view.shopSpells.some((id) => sortAchetable(view, id)) || casseroleAchetable(view);
}

function tient(condition: Condition, view: PlayerView): boolean {
  const [nom, id = ''] = condition.split(':');
  switch (nom) {
    case 'carte':
      return (view.shop.includes(id) && peutAcheter(view)) || (view.hand.some((m) => m.cardId === id) && placeSurLePlateau(view));
    case 'boutique':
      return view.shop.includes(id);
    case 'sort':
      return sortEnMain(view, id) || sortAchetable(view, id);
    case 'triple':
      return triplePossible(view, id);
    case 'echelon':
      return view.tier < Number(id) && peutMonter(view);
    case 'main':
      return view.hand.length > 0 && placeSurLePlateau(view);
    case 'achat':
      return peutAcheter(view);
    case 'actualise':
      return peutActualiser(view);
    case 'budget_vide':
      return !resteADepenser(view);
    case 'degelee':
      return !view.frozen;
    case 'gelee':
      return view.frozen;
    case 'dore':
      return view.discover !== null || sortEnMain(view, 'investiture') || (view.hand.some((m) => m.golden) && placeSurLePlateau(view));
    case 'casserole':
      return casseroleDisponible(view) && view.board.length > 0;
    case 'deuxieme_casserole':
      return casseroleDisponible(view) && view.board.some(casserolesActives);
    case 'scandale':
      return view.board.some((m) => m.scandal);
    case 'cadenas':
      return view.board.some((m) => m.locked) && view.board.filter((m) => !m.locked).length >= 2;
    case 'plateau_plein':
      return !placeSurLePlateau(view);
    default:
      return false;
  }
}

function visible(etape: Etape, view: PlayerView): boolean {
  return (etape.si ?? []).every((c) => tient(c, view));
}

/** Le programme d'une manche : au-delà de la dernière écrite, la dernière. */
function programme(round: number): Lecon[] {
  const manches = Object.keys(TUTORIEL.programme).map(Number);
  const derniere = Math.max(...manches);
  return TUTORIEL.programme[Math.min(round, derniere)] ?? [];
}

/**
 * Entre deux leçons, toujours sur les rails : le choix ouvert, le politique à poser, le plateau plein, le budget qui
 * reste et la seule façon de le dépenser, puis Prêt. Aucun rappel ne propose de geler : seule la leçon du gel le fait,
 * là où la boutique gelée est gardée.
 */
function rappel(view: PlayerView): Consigne {
  const dire = (cle: Rappel, permis: Geste[]): Consigne => ({ cle, texte: TUTORIEL.rappels[cle].replace('{budget}', String(view.budget)), permis, rappel: true });
  if (view.discover) return dire('choix', []);
  if (view.hand.length > 0) return placeSurLePlateau(view) ? dire('pose', []) : dire('plein', ['renvoi']);
  if (resteADepenser(view)) {
    if (peutAcheter(view)) return dire('budget_achat', peutActualiser(view) ? ['achat', 'actualise'] : ['achat']);
    if (peutActualiser(view)) return dire('budget', ['actualise']);
    return dire('depense', ['echelon', 'sort', 'casserole']);
  }
  return sortsLancables(view) > 0 ? dire('sorts', ['pret']) : dire('pret', ['pret']);
}

export interface Guide {
  /** La consigne à afficher après cette vue : la première leçon de la manche pas encore faite, sinon un rappel. */
  observer(view: PlayerView): Consigne;
}

/**
 * Le guide du tutoriel. Chaque manche a ses leçons, dans l'ordre : la première pas encore faite s'affiche, si ce dont
 * elle parle est là. Une leçon affichée est faite quand ce qu'elle demandait n'est plus à faire ; on ne revient jamais
 * à une leçon d'avant, et une leçon dont la manche est passée est perdue de vue. Entre deux leçons, un rappel.
 */
export function creerGuide(): Guide {
  let manche = 0;
  let faites = new Set<Lecon>();
  let courante: Lecon | null = null;
  let ordre: number[] = [];
  return {
    observer(view) {
      if (view.round !== manche) {
        manche = view.round;
        faites = new Set();
        courante = null;
      }
      const lecons = programme(manche);
      const deplace = memesPolitiquesAutrement(ordre, view.board.map((m) => m.uid));
      ordre = view.board.map((m) => m.uid);
      if (courante) {
        const etape = TUTORIEL.etapes[courante];
        if (etape.geste === 'deplace' ? deplace : !visible(etape, view)) faites.add(courante);
      }
      const suivante = lecons.findIndex((cle) => !faites.has(cle) && visible(TUTORIEL.etapes[cle], view));
      // Les leçons d'avant sont closes : celle qu'on a passée sans la voir ne revient pas interrompre la suite.
      for (const cle of lecons.slice(0, Math.max(0, suivante))) faites.add(cle);
      courante = lecons[suivante] ?? null;
      if (!courante) return rappel(view);
      const etape = TUTORIEL.etapes[courante];
      return { cle: courante, texte: etape.texte, permis: etape.permis ?? [], rappel: false };
    },
  };
}

// —— Les rails ——

/** Le sort ou la casserole de la main que vise ce geste. */
function carteLancee(view: PlayerView, uid: number) {
  return view.spells.find((s) => s.uid === uid);
}

/**
 * Ce qui passe toujours : poser un politique de la main, le déplacer, choisir une carte offerte, lancer un sort déjà en
 * main. Rien de tout cela ne coûte ni ne défait ce que le tutoriel a préparé. Une casserole en main suit sa leçon.
 */
function toujoursPermis(action: PlayerAction, view: PlayerView): boolean {
  if (action.t === 'play' || action.t === 'move' || action.t === 'discover' || action.t === 'hero') return true;
  return action.t === 'cast' && carteLancee(view, action.uid)?.spellId !== undefined;
}

/** Le geste est-il l'un de ceux que la consigne permet ? */
function permet(geste: Geste, action: PlayerAction, view: PlayerView): boolean {
  const [nom, id] = geste.split(':');
  switch (action.t) {
    case 'buy':
      return nom === 'achat' && (id === undefined || view.shop[action.slot] === id);
    case 'buy_spell':
      return nom === 'sort' && (id === undefined || view.shopSpells[action.slot] === id);
    case 'buy_casserole':
      return nom === 'casserole' || nom === 'deuxieme_casserole';
    case 'cast': {
      // Une casserole : la première se pose où l'on veut, la deuxième sur le politique qui porte déjà la première.
      if (nom === 'casserole') return true;
      const cible = view.board.find((m) => m.uid === action.target);
      return nom === 'deuxieme_casserole' && cible !== undefined && casserolesActives(cible);
    }
    case 'roll':
      return nom === 'actualise';
    case 'upgrade':
      return nom === 'echelon';
    case 'freeze':
      return nom === 'gel';
    case 'sell':
      return nom === 'renvoi';
    default:
      return false;
  }
}

/**
 * Les rails du tutoriel : pourquoi ce geste est refusé, ou null s'il passe. Ce qui ne coûte rien passe toujours ; le
 * reste, seulement si la consigne le permet. Prêt attend que la leçon soit faite et que tout le budget soit dépensé.
 */
export function refusTutoriel(consigne: Consigne | null, view: PlayerView, action: PlayerAction | 'pret'): string | null {
  if (!consigne) return null;
  if (action === 'pret') {
    if (resteADepenser(view)) return TUTORIEL.refus.budget.replace('{budget}', String(view.budget));
    const libre = consigne.permis === 'tout' || consigne.permis.includes('pret');
    return libre ? null : TUTORIEL.refus.geste;
  }
  if (toujoursPermis(action, view) || consigne.permis === 'tout') return null;
  return consigne.permis.some((geste) => permet(geste, action, view)) ? null : TUTORIEL.refus.geste;
}
