import { SUCCES } from '../data/succes.ts';
import type { Condition, StatPartie, Succes } from '../data/succes.ts';
import { PARAMS } from '../data/params.ts';
import type { PlayerView } from '../engine/game.ts';

/** Ce que le navigateur garde du joueur : pas de compte, seulement ces chiffres. */
export interface Progres {
  parties: number;
  victoires: number;
  /** Les succès obtenus, dans l'ordre. */
  obtenus: string[];
}

export function progresVierge(): Progres {
  return { parties: 0, victoires: 0, obtenus: [] };
}

/** Une partie finie, ou un pas de carrière : ce qui peut débloquer un succès. */
export interface Resultat {
  /** La place finale ; absente pour un événement hors partie. */
  place?: number;
  stats?: PlayerView['stats'];
  /** Un chapitre de carrière réussi. */
  chapitre?: string;
  tutoriel?: boolean;
}

const STAT: Record<StatPartie, keyof PlayerView['stats']> = {
  casseroles: 'casseroles',
  scandales: 'scandals',
  oublis: 'forgotten',
  triples: 'triples',
  sorts: 'spells',
};

function atteint(c: Condition, p: Progres, r: Resultat): boolean {
  const stat = (s: StatPartie) => r.stats?.[STAT[s]] ?? 0;
  const gagne = r.place === 1;
  switch (c.type) {
    case 'victoires':
      return p.victoires >= c.n;
    case 'parties':
      return p.parties >= c.n;
    case 'place':
      return r.place !== undefined && r.place <= c.place;
    case 'partie':
      return r.stats !== undefined && stat(c.stat) >= c.n;
    case 'victoire_sans':
      return gagne && r.stats !== undefined && stat(c.stat) <= c.max;
    case 'victoire_avec':
      return gagne && r.stats !== undefined && stat(c.stat) >= c.n;
    case 'chapitre':
      return r.chapitre === c.id;
    case 'tutoriel':
      return r.tutoriel === true;
  }
}

/**
 * Compte le résultat et rend la nouvelle progression, avec les succès débloqués à l'instant, dans
 * l'ordre du tableau. Une partie compte si elle a une place ; un chapitre ou le tutoriel, non.
 */
export function apresResultat(avant: Progres, r: Resultat): { progres: Progres; nouveaux: Succes[] } {
  const partie = r.place !== undefined;
  const progres: Progres = {
    parties: avant.parties + (partie ? 1 : 0),
    victoires: avant.victoires + (r.place === 1 ? 1 : 0),
    obtenus: [...avant.obtenus],
  };
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

/** Une progression lue du navigateur peut être vieille ou abîmée : on n'en garde que le sûr. */
export function progresValide(brut: unknown): Progres {
  if (typeof brut !== 'object' || brut === null) return progresVierge();
  const r = brut as Record<string, unknown>;
  const entier = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
  const connus = new Set(SUCCES.map((s) => s.id));
  const obtenus = Array.isArray(r.obtenus) ? r.obtenus.filter((id): id is string => typeof id === 'string' && connus.has(id)) : [];
  return { parties: entier(r.parties), victoires: entier(r.victoires), obtenus: [...new Set(obtenus)] };
}
