import type { Hero } from '../../engine/types.ts';

/**
 * Le boss spécial du débat : il n'est pas proposé en boutique ni au choix des héros.
 * Ses avantages sont annoncés et visibles : rien n'est caché au joueur.
 * Faits vérifiés le 2 novembre 2026 :
 * - « Au revoir ! » conclut son allocution du 19 mai 1981 (texte publié par l'Élysée), plan final sur la chaise vide (INA).
 * - « Vous n'avez pas le monopole du cœur », débat du 10 mai 1974, réplique préparée à l'avance (Public Sénat).
 * - « L'homme du passif » : la réponse de Mitterrand au débat du 5 mai 1981.
 * - Diamants de Bokassa : révélés par Le Canard enchaîné le 10 octobre 1979. Il dit en avoir versé le produit à des œuvres. Aucune preuve de corruption n'a été apportée.
 * - Petit-déjeuner avec des éboueurs à l'Élysée et dîners chez des Français, décembre 1974. L'accordéon.
 * Mort le 2 décembre 2020 : le ressort est le retour d'outre-tombe, jamais sa santé.
 */
export const GISCARD: Hero = {
  id: 'giscard',
  name: 'Valéry Giscard d\'Estaing',
  power: 'Au revoir',
  desc: 'D\'outre-tombe. Son premier politique à mourir revient à chaque combat, et il a +1 budget par manche : les diamants. Mais il est mort, et ça coûte 8 points de sondage.',
  hpBonus: -8,
  mods: { firstDeathRetour: true, budgetPerRound: 1 },
};

export const BOSS_SPECIAUX: Record<string, Hero> = { giscard: GISCARD };

/** Une campagne sur cinq finit contre lui. Il revient de toute façon après une première victoire. */
export const CHANCE_BOSS_SPECIAL = 0.2;
