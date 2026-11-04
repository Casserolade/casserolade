import type { BotLevel } from '../bots/bots.ts';
import { CHANCE_BOSS_SPECIAL } from '../data/histoire/boss.ts';
import { CHAPITRES, OUTRE_TOMBE } from '../data/histoire/chapitres.ts';
import type { Chapitre, Declencheur, Ligne, Objectif } from '../data/histoire/chapitres.ts';
import { CARD_BY_ID, PARTY_CAMPS } from '../data/cards.ts';
import { CONTEXTS, HEROES, HERO_BY_ID } from '../data/heroes.ts';
import { PARAMS } from '../data/params.ts';
import { PERSONNALITES } from '../data/personnalites.ts';
import { createRng } from '../engine/rng.ts';
import type { GameOptions, PlayerView } from '../engine/game.ts';
import type { Camp, Hero, PlayerAction } from '../engine/types.ts';

export interface CompositionTable {
  /** Le héros et le niveau de chaque siège. Le joueur est au siège 0. */
  sieges: { heroId: string; level: BotLevel | null }[];
  game: Partial<GameOptions>;
  bossId: string | null;
}

/** Le boss de cette campagne : un héros d'un autre, ou le spécial, une fois sur cinq. */
export function tirerBoss(heroId: string, seed: number): string {
  const rng = createRng(seed * 13 + 7);
  if (rng.next() < CHANCE_BOSS_SPECIAL) return 'giscard';
  return rng.pick(HEROES.map((h) => h.id).filter((id) => id !== heroId));
}

function tirerCamps(chapitre: Chapitre, heroId: string, seed: number): Camp[] | undefined {
  if (!chapitre.camps) return undefined;
  const rng = createRng(seed * 17 + 3);
  const prefere = PERSONNALITES[heroId]?.camp ?? null;
  const reste = rng.shuffle(PARTY_CAMPS.filter((c) => c !== prefere));
  const camps = prefere && prefere !== 'civile' ? [prefere, ...reste] : reste;
  return camps.slice(0, chapitre.camps);
}

/**
 * Traduit un chapitre en options de partie : c'est le seul pont avec le moteur.
 * Le bonus de sondages suit la durée du chapitre : -11 sur 12 points ne laisserait aucune chance.
 */
export function composerTable(chapitre: Chapitre, heroId: string, seed: number, bossChoisi?: string): CompositionTable {
  const rng = createRng(seed * 19 + 11);
  const bossId = chapitre.id === OUTRE_TOMBE.id ? 'giscard' : chapitre.boss ? (bossChoisi ?? tirerBoss(heroId, seed)) : null;
  const autres = rng.shuffle(HEROES.map((h) => h.id).filter((id) => id !== heroId && id !== bossId));
  const sieges: CompositionTable['sieges'] = [{ heroId, level: null }];
  chapitre.adversaires.forEach((level, i) => {
    const boss = bossId && i === chapitre.adversaires.length - 1;
    sieges.push({ heroId: boss ? bossId : autres[i % autres.length], level });
  });

  const params = { ...PARAMS, ...chapitre.regles };
  const echelle = params.startHp / PARAMS.startHp;
  const heroOverrides: Record<string, Partial<Hero>> = {};
  for (const { heroId: id } of sieges) {
    const hero: Hero = HERO_BY_ID[id];
    heroOverrides[id] = {
      ...hero,
      hpBonus: id === bossId ? hero.hpBonus : Math.round(hero.hpBonus * echelle),
      mods: chapitre.pouvoirs ? hero.mods : {},
    };
  }
  const contexte = chapitre.contexteId ?? (chapitre.contexte ? rng.pick(CONTEXTS.filter((c) => c.id !== 'normal')).id : undefined);
  const camps = tirerCamps(chapitre, heroId, seed);
  return {
    sieges,
    bossId,
    game: {
      params: chapitre.regles,
      heroes: sieges.map((s) => s.heroId),
      heroOverrides,
      ...(contexte ? { contextId: contexte } : {}),
      ...(camps ? { activeCamps: camps } : {}),
    },
  };
}

export function actionAutorisee(chapitre: Chapitre, action: PlayerAction): boolean {
  return !chapitre.bloque.includes(action.t);
}

export function plateauDuChapitre(chapitre: Chapitre, manche: number): string {
  return chapitre.plateaux[Math.min(manche - 1, chapitre.plateaux.length - 1)];
}

function serviteursPossedes(view: PlayerView): PlayerView['board'] {
  return [...view.board, ...view.hand];
}

/** Les sorts en main, Tracts empilés compris. Les casseroles n'en sont pas. */
function sortsEnMain(view: PlayerView): number {
  return view.spells.reduce((n, s) => n + (s.spellId ? (s.count ?? 1) : 0), 0);
}

function aUneAnnonce(cardId: string): boolean {
  return CARD_BY_ID[cardId]?.effects?.some((e) => e.when === 'annonce') ?? false;
}

export interface ResultatCombat {
  gagne: boolean;
  perdu: boolean;
}

/** Ce que le joueur a fait, vu uniquement depuis sa vue : la campagne ne regarde jamais l'état complet. */
export interface Suivi {
  observer(view: PlayerView, combat?: ResultatCombat): Ligne[];
  conclure(view: PlayerView, place: number): Bilan;
}

export interface Bilan {
  reussi: boolean;
  place: number;
  objectifs: { objectif: Objectif; texte: string; atteint: boolean }[];
  lignes: Ligne[];
}

export function texteObjectif(o: Objectif): string {
  switch (o.type) {
    case 'manches_max':
      return `Finir en ${o.n} manches ou moins`;
    case 'sans_scandale':
      return 'Aucun scandale';
    case 'scandale':
      return 'Survivre à un scandale';
    case 'triple':
      return 'Obtenir un politique doré';
    case 'casseroles_min':
      return `Poser ${o.n} casseroles`;
    case 'echelon_min':
      return `Atteindre l'échelon ${o.n}`;
    case 'sorts_min':
      return `Jouer ${o.n} sorts`;
    case 'sondages_min':
      return `Finir avec ${o.n} sondages ou plus, socle compris`;
  }
}

/** Dans la même manche, une boutique qui n'a pas seulement perdu une carte achetée : elle a été actualisée. */
function boutiqueRenouvelee(avant: string[], apres: string[]): boolean {
  const meme = apres.length === avant.length && apres.every((id, i) => id === avant[i]);
  if (meme) return false;
  const restes = [...avant];
  const achat = apres.length === avant.length - 1 && apres.every((id) => {
    const i = restes.indexOf(id);
    if (i < 0) return false;
    restes.splice(i, 1);
    return true;
  });
  return !achat;
}

export function creerSuivi(chapitre: Chapitre): Suivi {
  const dits = new Set<Declencheur>();
  let scandale = false;
  let triple = false;
  let casseroles = 0;
  let echelonMax = 1;
  let sortsJoues = 0;
  let manche = 0;
  let sondages = 0;
  let avant: { casseroles: number; tier: number; board: number; possedes: number; sorts: number; uids: Set<number>; round: number; shop: string[] } | null = null;

  const dire = (d: Declencheur, sortie: Ligne[], repete = false) => {
    if (dits.has(d) && !repete) return;
    dits.add(d);
    sortie.push(...chapitre.dialogues.filter((l) => l.quand === d));
  };

  const memoriser = (view: PlayerView) => {
    manche = Math.max(manche, view.round);
    sondages = view.hp;
    echelonMax = Math.max(echelonMax, view.tier);
    if (serviteursPossedes(view).some((m) => m.golden)) triple = true;
    if ([...view.board, ...view.hand].some((m) => m.scandal)) scandale = true;
  };

  return {
    observer(view, combat) {
      const sortie: Ligne[] = [];
      memoriser(view);
      dire('debut', sortie);
      const possedes = serviteursPossedes(view);
      // Main comprise : un doré qui passe par la main ne recompte pas ses casseroles.
      const posees = possedes.reduce((s, m) => s + m.casseroles.length, 0);
      const sorts = sortsEnMain(view);
      if (avant) {
        const precedent = avant;
        // Un sort ne quitte la main qu'en étant joué.
        if (sorts < precedent.sorts) {
          sortsJoues += precedent.sorts - sorts;
          dire('premier_sort', sortie);
        }
        if (view.board.some((m) => !precedent.uids.has(m.uid) && aUneAnnonce(m.cardId))) dire('annonce', sortie);
        if (possedes.length > avant.possedes) dire('premier_achat', sortie);
        if (view.board.length > avant.board) dire('premiere_pose', sortie);
        if (posees > avant.casseroles) {
          casseroles += posees - avant.casseroles;
          dire('casserole_posee', sortie);
        }
        if (possedes.some((m) => m.oublie > 0 && !m.scandal)) dire('oubli', sortie);
        if (view.tier > avant.tier) dire('echelon', sortie);
        if (view.round === avant.round && boutiqueRenouvelee(avant.shop, view.shop)) dire('actualise', sortie);
      }
      if (view.board.length >= view.boardLimit) dire('plateau_plein', sortie);
      if (view.casseroleOffer) dire('casserole_offerte', sortie);
      if (view.frozen) dire('gel', sortie);
      if (view.discover) dire('decouvrir', sortie);
      if (possedes.some((m) => m.scandal)) dire('scandale', sortie);
      if (possedes.some((m) => m.golden)) dire('triple', sortie);
      if (combat) dire('combat', sortie);
      if (combat?.gagne) dire('combat_gagne', sortie);
      if (combat?.perdu) dire('combat_perdu', sortie);
      if (view.hp <= 8) dire('sondages_bas', sortie);
      avant = {
        casseroles: posees,
        tier: view.tier,
        board: view.board.length,
        possedes: possedes.length,
        sorts,
        uids: new Set(view.board.map((m) => m.uid)),
        round: view.round,
        shop: [...view.shop],
      };
      return sortie;
    },
    conclure(view, place) {
      memoriser(view);
      const reussi = place <= chapitre.placeRequise;
      const atteint = (o: Objectif): boolean => {
        switch (o.type) {
          case 'manches_max':
            return manche <= o.n;
          case 'sans_scandale':
            return !scandale;
          case 'scandale':
            return scandale;
          case 'triple':
            return triple;
          case 'casseroles_min':
            return casseroles >= o.n;
          case 'echelon_min':
            return echelonMax >= o.n;
          case 'sorts_min':
            return sortsJoues >= o.n;
          case 'sondages_min':
            return sondages >= o.n;
        }
      };
      return {
        reussi,
        place,
        // Un objectif secondaire n'a de sens que si le chapitre est gagné.
        objectifs: chapitre.objectifs.map((objectif) => ({ objectif, texte: texteObjectif(objectif), atteint: reussi && atteint(objectif) })),
        lignes: chapitre.dialogues.filter((l) => l.quand === (reussi ? 'victoire' : 'defaite')),
      };
    },
  };
}

export function remplir(texte: string, heroId: string, adversaireId: string | null): string {
  const nom = (id: string) => HERO_BY_ID[id]?.name ?? id;
  return texte.replaceAll('{heros}', nom(heroId)).replaceAll('{adversaire}', adversaireId ? nom(adversaireId) : 'son adversaire');
}

/** La carrière en cours. Sauvegardée côté client : le solo n'a pas de compte. */
export interface Campagne {
  heroId: string;
  graine: number;
  chapitre: number;
  bossId: string;
  /** Objectifs atteints, par id de chapitre. */
  etoiles: Record<string, number>;
  /** Le second tour est gagné. */
  elu: boolean;
  /** L'épilogue contre Giscard est gagné, ou il a déjà été le boss vaincu. */
  outreTombe: boolean;
}

export function nouvelleCampagne(heroId: string, graine: number): Campagne {
  return { heroId, graine, chapitre: 0, bossId: tirerBoss(heroId, graine), etoiles: {}, elu: false, outreTombe: false };
}

/** Le chapitre à jouer, null si tout est terminé. */
export function chapitreCourant(c: Campagne): Chapitre | null {
  if (c.chapitre < CHAPITRES.length) return CHAPITRES[c.chapitre];
  return c.outreTombe ? null : OUTRE_TOMBE;
}

export function apresChapitre(c: Campagne, chapitre: Chapitre, bilan: Bilan): Campagne {
  const etoiles = bilan.objectifs.filter((o) => o.atteint).length;
  const suite: Campagne = { ...c, etoiles: { ...c.etoiles, [chapitre.id]: Math.max(c.etoiles[chapitre.id] ?? 0, etoiles) } };
  if (!bilan.reussi) return suite;
  if (chapitre.id === OUTRE_TOMBE.id) return { ...suite, outreTombe: true };
  const estFinal = chapitre.id === CHAPITRES[CHAPITRES.length - 1].id;
  return {
    ...suite,
    chapitre: c.chapitre + 1,
    elu: c.elu || estFinal,
    // Battre Giscard au second tour vaut pour l'épilogue : il ne revient pas deux fois de suite.
    outreTombe: c.outreTombe || (estFinal && c.bossId === 'giscard'),
  };
}
