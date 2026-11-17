/**
 * Les rangs du classement des salons. Le MMR d'un joueur bouge à chaque partie de salon jouée contre un autre humain
 * (`src/lobby/mmr.ts`) : il part de 1000, et son rang est le lieu où ce MMR le fait siéger. Un lieu plutôt qu'un
 * titre : il vaut pour tout le monde.
 */
export interface Rang {
  id: string;
  nom: string;
  /** Le MMR à partir duquel on y siège. */
  min: number;
}

/** Du plus bas au plus haut. On commence au Conseil municipal, avec de quoi perdre une partie ou deux sans en sortir. */
export const RANGS: readonly Rang[] = [
  { id: 'salle_des_fetes', nom: 'Salle des fêtes', min: 0 },
  { id: 'conseil_municipal', nom: 'Conseil municipal', min: 950 },
  { id: 'mairie', nom: 'Mairie', min: 1030 },
  { id: 'assemblee', nom: 'Assemblée', min: 1080 },
  { id: 'senat', nom: 'Sénat', min: 1140 },
  { id: 'gouvernement', nom: 'Gouvernement', min: 1210 },
  { id: 'matignon', nom: 'Matignon', min: 1290 },
  { id: 'elysee', nom: 'Élysée', min: 1380 },
];
