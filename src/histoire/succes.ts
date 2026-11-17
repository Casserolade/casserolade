import { HEROES } from '../data/heroes.ts';
import { SUCCES } from '../data/succes.ts';
import type { Borne, Condition, Fait, Niveau, Succes } from '../data/succes.ts';
import type { Faits } from './bilanDePartie.ts';

const NIVEAUX: Niveau[] = ['facile', 'moyen', 'difficile'];
/** Une table en ligne compte comme telle à partir de deux humains : seul avec des bots, c'est une partie rapide. */
const HUMAINS_EN_LIGNE = 2;

/** La même place plusieurs parties de suite ; `niveau` : le plus faible des bots affrontés, null hors partie rapide. */
export interface Serie {
  place: number;
  n: number;
  niveau: Niveau | null;
}

/** Ce que le navigateur garde du joueur : pas de compte, seulement ces chiffres. */
export interface Progres {
  parties: number;
  victoires: number;
  /** Les victoires en partie rapide, par niveau des bots. */
  victoiresParNiveau: Record<Niveau, number>;
  /** Les parties en ligne, à une table d'au moins deux humains, et celles gagnées. */
  partiesEnLigne: number;
  victoiresEnLigne: number;
  /** Les héros avec qui une partie a été gagnée. */
  herosVainqueurs: string[];
  /** La série en cours. */
  serie: Serie | null;
  /** Le tutoriel a été ouvert au moins une fois, même quitté en route : l'accueil ne le met plus en avant. */
  tutoriel: boolean;
  /** Les succès obtenus, dans l'ordre. */
  obtenus: string[];
}

export function progresVierge(): Progres {
  return { parties: 0, victoires: 0, victoiresParNiveau: { facile: 0, moyen: 0, difficile: 0 }, partiesEnLigne: 0, victoiresEnLigne: 0, herosVainqueurs: [], serie: null, tutoriel: false, obtenus: [] };
}

/** Une partie finie, ou un pas de carrière : ce qui peut débloquer un succès. */
export interface Resultat {
  /** Les faits de la partie, sa place comprise ; absents pour un événement hors partie. */
  faits?: Faits;
  /** Le niveau des bots, en partie rapide. */
  niveau?: Niveau;
  /** Le héros joué. */
  heros?: string;
  /** Un chapitre de carrière réussi, et la carrière (un politique) quand ce n'est pas la carrière ordinaire. */
  chapitre?: string;
  carriere?: string;
  /** Le tutoriel, ouvert : il ne compte ni comme partie ni pour un succès. */
  tutoriel?: boolean;
}

function rang(niveau: Niveau | null | undefined): number {
  return niveau ? NIVEAUX.indexOf(niveau) + 1 : 0;
}

function tient(valeur: number, borne: Borne): boolean {
  return (borne.min === undefined || valeur >= borne.min) && (borne.max === undefined || valeur <= borne.max);
}

/** Les victoires contre des bots de ce niveau ou plus forts. */
function victoiresAuNiveau(p: Progres, niveau: Niveau): number {
  return NIVEAUX.filter((n) => rang(n) >= rang(niveau)).reduce((somme, n) => somme + p.victoiresParNiveau[n], 0);
}

function atteint(c: Condition, p: Progres, r: Resultat): boolean {
  switch (c.type) {
    case 'victoires':
      if (c.enLigne) return p.victoiresEnLigne >= c.n;
      return (c.niveau ? victoiresAuNiveau(p, c.niveau) : p.victoires) >= c.n;
    case 'parties':
      return (c.enLigne ? p.partiesEnLigne : p.parties) >= c.n;
    case 'serie':
      return p.serie !== null && p.serie.place === c.place && p.serie.n >= c.n && rang(p.serie.niveau) >= rang(c.niveau);
    case 'heros':
      return p.herosVainqueurs.length >= (c.n === 'tous' ? HEROES.length : c.n);
    case 'partie': {
      const faits = r.faits;
      if (!faits || rang(r.niveau) < rang(c.niveau) || (c.heros !== undefined && r.heros !== c.heros)) return false;
      return (Object.entries(c.faits) as [Fait, Borne][]).every(([fait, borne]) => tient(faits[fait], borne));
    }
    case 'chapitre':
      return r.chapitre === c.id && (c.carriere === undefined || r.carriere === c.carriere);
  }
}

/** La série après une partie de plus : la même place la prolonge, une autre la recommence. */
function serieApres(avant: Serie | null, place: number, niveau: Niveau | null): Serie {
  if (!avant || avant.place !== place) return { place, n: 1, niveau };
  return { place, n: avant.n + 1, niveau: rang(niveau) < rang(avant.niveau) ? niveau : avant.niveau };
}

/** La progression après une partie : ses compteurs, sa série, le héros s'il a gagné. */
function apresPartie(avant: Progres, r: Resultat, faits: Faits): Progres {
  const gagne = faits.place === 1;
  const enLigne = faits.humains >= HUMAINS_EN_LIGNE;
  const heros = gagne && r.heros && !avant.herosVainqueurs.includes(r.heros) ? [...avant.herosVainqueurs, r.heros] : avant.herosVainqueurs;
  return {
    ...avant,
    parties: avant.parties + 1,
    victoires: avant.victoires + (gagne ? 1 : 0),
    victoiresParNiveau: gagne && r.niveau ? { ...avant.victoiresParNiveau, [r.niveau]: avant.victoiresParNiveau[r.niveau] + 1 } : avant.victoiresParNiveau,
    partiesEnLigne: avant.partiesEnLigne + (enLigne ? 1 : 0),
    victoiresEnLigne: avant.victoiresEnLigne + (enLigne && gagne ? 1 : 0),
    herosVainqueurs: heros,
    serie: serieApres(avant.serie, faits.place, r.niveau ?? null),
  };
}

/**
 * Compte le résultat et rend la nouvelle progression, avec les succès débloqués à l'instant, dans l'ordre du
 * tableau. Une partie compte si elle a ses faits ; un chapitre ou le tutoriel, non.
 */
export function apresResultat(avant: Progres, r: Resultat): { progres: Progres; nouveaux: Succes[] } {
  const compte = r.faits ? apresPartie(avant, r, r.faits) : avant;
  const progres: Progres = { ...compte, tutoriel: compte.tutoriel || r.tutoriel === true, obtenus: [...compte.obtenus] };
  const nouveaux = SUCCES.filter((s) => !progres.obtenus.includes(s.id) && atteint(s.condition, progres, r));
  progres.obtenus.push(...nouveaux.map((s) => s.id));
  return { progres, nouveaux };
}

/** Les titres gagnés, du plus ancien au plus récent : le joueur choisit celui qu'il affiche. */
export function titres(p: Progres): string[] {
  return p.obtenus.flatMap((id) => {
    const r = SUCCES.find((s) => s.id === id)?.recompense;
    return r?.type === 'titre' ? [r.titre] : [];
  });
}

/** Le tutoriel donnait un succès, « Bizuth », jusqu'au 17 novembre 2026 : qui l'avait est passé par le tutoriel. */
const ANCIEN_SUCCES_DU_TUTORIEL = 'bizuth';

function serieValide(brut: unknown): Serie | null {
  if (typeof brut !== 'object' || brut === null) return null;
  const { place, n, niveau } = brut as Record<string, unknown>;
  if (!Number.isInteger(place) || !Number.isInteger(n) || (place as number) < 1 || (n as number) < 1) return null;
  return { place: place as number, n: n as number, niveau: NIVEAUX.includes(niveau as Niveau) ? (niveau as Niveau) : null };
}

/** Une progression lue du navigateur peut être vieille ou abîmée : on n'en garde que le sûr. */
export function progresValide(brut: unknown): Progres {
  if (typeof brut !== 'object' || brut === null) return progresVierge();
  const r = brut as Record<string, unknown>;
  const entier = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
  const textes = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : []);
  const connus = new Set(SUCCES.map((s) => s.id));
  const heros = new Set(HEROES.map((h) => h.id));
  const parNiveau = (typeof r.victoiresParNiveau === 'object' && r.victoiresParNiveau !== null ? r.victoiresParNiveau : {}) as Record<string, unknown>;
  return {
    parties: entier(r.parties),
    victoires: entier(r.victoires),
    victoiresParNiveau: { facile: entier(parNiveau.facile), moyen: entier(parNiveau.moyen), difficile: entier(parNiveau.difficile) },
    partiesEnLigne: entier(r.partiesEnLigne),
    victoiresEnLigne: entier(r.victoiresEnLigne),
    herosVainqueurs: textes(r.herosVainqueurs).filter((id) => heros.has(id)),
    serie: serieValide(r.serie),
    tutoriel: r.tutoriel === true || textes(r.obtenus).includes(ANCIEN_SUCCES_DU_TUTORIEL),
    obtenus: textes(r.obtenus).filter((id) => connus.has(id)),
  };
}
