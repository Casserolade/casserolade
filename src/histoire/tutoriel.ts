import { TUTORIEL } from '../data/histoire/tutoriel.ts';
import type { Etape } from '../data/histoire/tutoriel.ts';
import type { Chapitre, Declencheur } from '../data/histoire/chapitres.ts';
import { HEROES } from '../data/heroes.ts';
import { CARD_BY_ID, PARTY_CAMPS } from '../data/cards.ts';
import { PARAMS } from '../data/params.ts';
import type { Camp } from '../engine/types.ts';
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
      heroOverrides: { [TUTORIEL.heros]: { hpBonus: (hero?.hpBonus ?? 0) + TUTORIEL.bonusJoueur } },
      script: { seat: 0, boutique: TUTORIEL.boutique, sorts: TUTORIEL.sorts, casseroles: TUTORIEL.casseroles },
    },
  };
}

/** Le suivi de la carrière sait reconnaître chaque geste depuis la vue : le guide s'en sert. */
function chapitreDeSuivi(etapes: Etape[]): Chapitre {
  const quand = [...new Set(etapes.map((e) => e.fini))];
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

export interface Guide {
  /** La consigne à afficher après cette vue : la première pas encore faite. Null : fini. */
  observer(view: PlayerView, combat?: ResultatCombat): Etape | null;
}

/**
 * Le guide du tutoriel. Une étape faite plus tôt que prévu compte : le joueur n'est jamais forcé
 * de suivre l'ordre, et la consigne suivante est toujours la première qui reste.
 */
export function creerGuide(etapes: Etape[] = TUTORIEL.etapes): Guide {
  const faits = new Set<Declencheur>();
  const suivi = creerSuivi(chapitreDeSuivi(etapes));
  return {
    observer(view, combat) {
      for (const ligne of suivi.observer(view, combat)) faits.add(ligne.quand);
      return etapes.find((e) => !faits.has(e.fini)) ?? null;
    },
  };
}
