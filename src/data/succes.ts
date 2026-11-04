/**
 * Le tableau des succès : une ligne de données par succès, comme une carte. Ils se gagnent en
 * solo, au tutoriel et en carrière, et se gardent dans le navigateur, sans compte. Les parties en
 * ligne restent à armes égales : une récompense n'y change rien.
 */

/** Ce que le joueur a fait dans une partie, vu depuis sa vue. */
export type StatPartie = 'casseroles' | 'scandales' | 'oublis' | 'triples' | 'sorts';

export type Condition =
  /** Parties gagnées (première place), toutes parties comptées. */
  | { type: 'victoires'; n: number }
  /** Parties finies, toutes parties comptées. */
  | { type: 'parties'; n: number }
  /** Finir une partie à cette place ou mieux. */
  | { type: 'place'; place: number }
  /** Atteindre ce chiffre dans une seule partie. */
  | { type: 'partie'; stat: StatPartie; n: number }
  /** Gagner une partie avec ce chiffre au plus (0 : sans jamais). */
  | { type: 'victoire_sans'; stat: StatPartie; max: number }
  /** Gagner une partie avec ce chiffre au moins. */
  | { type: 'victoire_avec'; stat: StatPartie; n: number }
  /** Réussir ce chapitre de la carrière. */
  | { type: 'chapitre'; id: string }
  /** Aller au bout du tutoriel. */
  | { type: 'tutoriel' };

export type Recompense =
  /** Un héros de plus proposé au choix, en solo et en carrière. */
  | { type: 'heros_en_plus' }
  /** Un titre, à côté du pseudo. */
  | { type: 'titre'; titre: string };

export interface Succes {
  id: string;
  nom: string;
  description: string;
  condition: Condition;
  recompense?: Recompense;
}

export const SUCCES: Succes[] = [
  { id: 'bizuth', nom: 'Bizuth', description: 'Aller au bout du tutoriel.', condition: { type: 'tutoriel' }, recompense: { type: 'titre', titre: 'Le Stagiaire' } },
  { id: 'premier_meeting', nom: 'Premier meeting', description: 'Finir une partie.', condition: { type: 'parties', n: 1 } },
  { id: 'second_tour', nom: 'Qualifié pour le second tour', description: 'Finir une partie dans les deux premiers.', condition: { type: 'place', place: 2 } },
  { id: 'premier_mandat', nom: 'Premier mandat', description: 'Gagner une partie.', condition: { type: 'victoires', n: 1 }, recompense: { type: 'heros_en_plus' } },
  { id: 'cumul', nom: 'Cumul des mandats', description: 'Gagner dix parties.', condition: { type: 'victoires', n: 10 }, recompense: { type: 'heros_en_plus' } },
  { id: 'vieux_routier', nom: 'Vieux routier', description: 'Finir cinquante parties.', condition: { type: 'parties', n: 50 }, recompense: { type: 'titre', titre: 'Le Baron' } },
  { id: 'casserolade', nom: 'Casserolade', description: 'Poser huit casseroles dans une partie.', condition: { type: 'partie', stat: 'casseroles', n: 8 }, recompense: { type: 'titre', titre: 'Le Batteur de casseroles' } },
  { id: 'affaire_d_etat', nom: 'Affaire d\'État', description: 'Trois scandales dans une partie.', condition: { type: 'partie', stat: 'scandales', n: 3 } },
  { id: 'le_peuple_oublie', nom: 'Le peuple oublie toujours', description: 'Gagner une partie après trois oublis du peuple.', condition: { type: 'victoire_avec', stat: 'oublis', n: 3 }, recompense: { type: 'titre', titre: 'Le Blanchi' } },
  { id: 'mains_propres', nom: 'Mains propres', description: 'Gagner une partie sans poser une seule casserole.', condition: { type: 'victoire_sans', stat: 'casseroles', max: 0 }, recompense: { type: 'titre', titre: 'Monsieur Propre' } },
  { id: 'trois_fois_rien', nom: 'Trois fois rien', description: 'Trois triples dans une partie.', condition: { type: 'partie', stat: 'triples', n: 3 } },
  { id: 'elements_de_langage', nom: 'Éléments de langage', description: 'Lancer quinze sorts dans une partie.', condition: { type: 'partie', stat: 'sorts', n: 15 } },
  { id: 'elu', nom: 'Élu', description: 'Gagner le second tour de la carrière.', condition: { type: 'chapitre', id: 'second_tour' }, recompense: { type: 'titre', titre: 'Président de la République' } },
  { id: 'outre_tombe', nom: 'Au revoir', description: 'Battre Valéry Giscard d\'Estaing, d\'outre-tombe.', condition: { type: 'chapitre', id: 'outre_tombe' }, recompense: { type: 'titre', titre: 'Celui qui a vu Giscard' } },
];

export const SUCCES_BY_ID: Record<string, Succes> = Object.fromEntries(SUCCES.map((s) => [s.id, s]));
