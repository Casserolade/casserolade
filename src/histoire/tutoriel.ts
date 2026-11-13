import { TUTORIEL } from '../data/histoire/tutoriel.ts';
import type { Condition, Etape, Geste } from '../data/histoire/tutoriel.ts';
import type { Chapitre, Declencheur } from '../data/histoire/chapitres.ts';
import { HEROES } from '../data/heroes.ts';
import { CARD_BY_ID, PARTY_CAMPS } from '../data/cards.ts';
import { PARAMS } from '../data/params.ts';
import { SPELL_BY_ID } from '../data/sorts.ts';
import { lostSpellReason } from '../engine/lostSpellReason.ts';
import type { Camp, Minion, PlayerAction } from '../engine/types.ts';
import type { BotLevel } from '../bots/bots.ts';
import type { GameOptions, PlayerView } from '../engine/game.ts';
import { createRng } from '../engine/rng.ts';
import { creerSuivi } from './campagne.ts';
import type { ResultatCombat } from './campagne.ts';

export interface TableTutoriel {
  sieges: { heroId: string; level: BotLevel | null }[];
  game: Partial<GameOptions>;
}

/** La table du tutoriel : le joueur au siège 0, ses adversaires débutants, la boutique écrite. */
export function composerTutoriel(seed: number): TableTutoriel {
  const rng = createRng(seed * 23 + 5);
  const autres = rng.shuffle(HEROES.map((h) => h.id).filter((id) => id !== TUTORIEL.heros));
  const sieges: TableTutoriel['sieges'] = [
    { heroId: TUTORIEL.heros, level: null },
    ...TUTORIEL.adversaires.map((level, i) => ({ heroId: autres[i], level })),
  ];
  const hero = HEROES.find((h) => h.id === TUTORIEL.heros);
  // La boutique écrite se prend dans la réserve : les camps de ses cartes doivent être en jeu.
  const ecrits = new Set<Camp>();
  for (const ids of Object.values(TUTORIEL.boutique)) {
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
      heroOverrides: { [TUTORIEL.heros]: { armor: (hero?.armor ?? 0) + TUTORIEL.bonusJoueur } },
      script: { seat: 0, boutique: TUTORIEL.boutique, sorts: TUTORIEL.sorts, casseroles: TUTORIEL.casseroles, evenements: TUTORIEL.evenements },
    },
  };
}

/** Le suivi de la carrière sait reconnaître chaque geste depuis la vue : le guide s'en sert. */
function chapitreDeSuivi(quand: Declencheur[]): Chapitre {
  return {
    id: 'tutoriel',
    election: 'Le tutoriel',
    plateaux: [TUTORIEL.plateau],
    decouverte: '',
    adversaires: TUTORIEL.adversaires,
    placeRequise: 3,
    regles: TUTORIEL.regles,
    pouvoirs: true,
    bloque: [],
    objectifs: [],
    dialogues: quand.map((d) => ({ quand: d, qui: 'narrateur', texte: d })),
  };
}

/** Un rappel, entre deux leçons. */
export type Rappel = 'choix' | 'plein' | 'sorts' | 'budget' | 'pret';

/** Ce que le guide affiche : une leçon, ou un rappel. */
export interface Consigne {
  /** La leçon (son déclencheur), ou le rappel. */
  cle: Declencheur | Rappel;
  texte: string;
  /** Les gestes permis. Un rappel laisse tout faire, sauf partir avec du budget. */
  permis: Geste[] | 'tout';
}

// —— Ce que voit le guide ——

const nombreEnBoutique = (view: PlayerView, id: string) => view.shop.filter((x) => x === id).length;
const placeSurLePlateau = (view: PlayerView) => view.board.length < view.boardLimit;
const mainPleine = (view: PlayerView) => view.hand.length + view.spells.length >= view.handLimit;
const peutAcheter = (view: PlayerView) => view.budget >= view.buyCost && !mainPleine(view);
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

function casseroleDisponible(view: PlayerView): boolean {
  const offerte = view.casseroleOffer !== null && view.budget >= (view.casseroleCost ?? Infinity) && !mainPleine(view);
  return offerte || view.spells.some((s) => s.casseroleId);
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

/** La main n'a plus que trois places. */
const mainQuiDeborde = (view: PlayerView) => view.hand.length + view.spells.length >= view.handLimit - 3;

/** Il reste du budget, et de quoi le dépenser : un achat, un échelon, une actualisation, un sort, une casserole. */
export function resteADepenser(view: PlayerView): boolean {
  if (view.budget <= 0) return false;
  if (view.rollCost > 0 && view.budget >= view.rollCost) return true;
  if (peutMonter(view) || (peutAcheter(view) && view.shop.length > 0)) return true;
  if (view.shopSpells.some((id) => sortAchetable(view, id))) return true;
  return view.casseroleOffer !== null && view.budget >= (view.casseroleCost ?? Infinity) && !mainPleine(view);
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
    case 'main':
      return view.hand.length > 0 && placeSurLePlateau(view);
    case 'achat':
      return peutAcheter(view) && view.shop.length > 0;
    case 'actualise':
      return view.budget >= view.rollCost;
    case 'echelon':
      return peutMonter(view);
    case 'budget_vide':
      return !resteADepenser(view);
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
    default:
      return false;
  }
}

function visible(etape: Etape, view: PlayerView): boolean {
  return (etape.si ?? []).every((c) => tient(c, view));
}

/** Le programme d'une manche : au-delà de la dernière écrite, la dernière. */
function programme(round: number): Declencheur[] {
  const manches = Object.keys(TUTORIEL.programme).map(Number);
  const derniere = Math.max(...manches);
  return TUTORIEL.programme[Math.min(round, derniere)] ?? [];
}

/** Entre deux leçons : le choix ouvert, le plateau plein, la main qui déborde, le budget qui reste, ou Prêt. */
function rappel(view: PlayerView): Consigne {
  if (view.discover) return { cle: 'choix', texte: TUTORIEL.rappels.choix, permis: [] };
  if (view.hand.length > 0 && !placeSurLePlateau(view)) return { cle: 'plein', texte: TUTORIEL.rappels.plein, permis: 'tout' };
  if (mainQuiDeborde(view) && sortsLancables(view) > 0) return { cle: 'sorts', texte: TUTORIEL.rappels.sorts, permis: 'tout' };
  if (resteADepenser(view)) return { cle: 'budget', texte: TUTORIEL.rappels.budget.replace('{budget}', String(view.budget)), permis: 'tout' };
  return { cle: 'pret', texte: TUTORIEL.rappels.pret, permis: 'tout' };
}

export interface Guide {
  /** La consigne à afficher après cette vue : la première leçon de la manche pas encore faite, sinon un rappel. */
  observer(view: PlayerView, combat?: ResultatCombat): Consigne;
}

/**
 * Le guide du tutoriel. Chaque manche a ses leçons, dans l'ordre : la première pas encore faite s'affiche, si ce dont
 * elle parle est là. Une leçon faite plus tôt compte, une leçon dont la manche est passée est perdue de vue. Entre deux
 * leçons, un rappel : le budget à dépenser, ou Prêt.
 */
export function creerGuide(): Guide {
  const faits = new Set<Declencheur>();
  const toutes = [...new Set(Object.values(TUTORIEL.programme).flat())];
  const suivi = creerSuivi(chapitreDeSuivi(toutes));
  return {
    observer(view, combat) {
      for (const ligne of suivi.observer(view, combat)) faits.add(ligne.quand);
      // Le choix ouvert par l'Investiture : sa leçon reste à l'écran jusqu'à ce qu'il soit fait.
      const lecon = TUTORIEL.etapes.decouvrir;
      if (view.discover && lecon && programme(view.round).includes('decouvrir')) return { cle: 'decouvrir', texte: lecon.texte, permis: [] };
      for (const cle of programme(view.round)) {
        const etape = TUTORIEL.etapes[cle];
        if (!etape || faits.has(cle) || !visible(etape, view)) continue;
        return { cle, texte: etape.texte, permis: etape.permis ?? [] };
      }
      return rappel(view);
    },
  };
}

// —— Les rails ——

/** Le sort ou la casserole de la main que vise ce geste. */
function carteLancee(view: PlayerView, uid: number) {
  return view.spells.find((s) => s.uid === uid);
}

/** Le geste est-il l'un de ceux que la consigne permet ? */
function permet(geste: Geste, action: PlayerAction, view: PlayerView): boolean {
  const [nom, id] = geste.split(':');
  switch (action.t) {
    case 'buy':
      return nom === 'achat' && (id === undefined || view.shop[action.slot] === id);
    case 'buy_spell':
      return nom === 'sort' && view.shopSpells[action.slot] === id;
    case 'buy_casserole':
      return nom === 'casserole' || nom === 'deuxieme_casserole';
    case 'cast': {
      const carte = carteLancee(view, action.uid);
      if (!carte) return false;
      if (carte.spellId) return nom === 'sort' && carte.spellId === id;
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
    case 'move':
      return nom === 'deplace';
    case 'sell':
      return nom === 'renvoi';
    default:
      return false;
  }
}

/**
 * Les rails du tutoriel : pourquoi ce geste est refusé, ou null s'il passe. Poser un politique de la main et choisir une
 * carte offerte passent toujours ; le reste, seulement si la consigne le permet. Prêt attend que la leçon soit faite et
 * que tout le budget soit dépensé.
 */
export function refusTutoriel(consigne: Consigne | null, view: PlayerView, action: PlayerAction | 'pret'): string | null {
  if (!consigne) return null;
  if (action === 'pret') {
    if (resteADepenser(view)) return TUTORIEL.refus.budget.replace('{budget}', String(view.budget));
    const libre = consigne.permis === 'tout' || consigne.permis.includes('pret');
    return libre ? null : TUTORIEL.refus.geste;
  }
  if (action.t === 'play' || action.t === 'discover' || action.t === 'hero') return null;
  if (consigne.permis === 'tout') return null;
  return consigne.permis.some((geste) => permet(geste, action, view)) ? null : TUTORIEL.refus.geste;
}
