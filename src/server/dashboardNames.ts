import { HEROES } from '../data/heroes.ts';
import { CHAPITRES, OUTRE_TOMBE } from '../data/histoire/chapitres.ts';

/** The names the dashboard shows for the ids it counts: heroes, and the career's elections in their order. */
export const DASHBOARD_NAMES = {
  heros: Object.fromEntries(HEROES.map((hero) => [hero.id, hero.name])),
  chapitres: [...CHAPITRES, OUTRE_TOMBE].map((chapter) => ({ id: chapter.id, nom: chapter.election })),
};
