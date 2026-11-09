import { HEROES } from '../data/heroes.ts';
import { CHAPITRES_COMPTES } from '../histoire/carrieres.ts';

/** The names the dashboard shows for the ids it counts: heroes, the generic elections in their order, then each career's. */
export const DASHBOARD_NAMES = {
  heros: Object.fromEntries(HEROES.map((hero) => [hero.id, hero.name])),
  chapitres: CHAPITRES_COMPTES,
};
