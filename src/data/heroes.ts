import type { Context, Hero } from '../engine/types.ts';
import { BOSS_SPECIAUX } from './histoire/boss.ts';

export const HEROES: Hero[] = [
  { id: 'lepen', name: 'Marine Le Pen', power: 'TVA à 5,5 %', desc: 'Le premier recrutement de chaque manche coûte 1 de moins.', hpBonus: -1, mods: { firstBuyDiscount: 1 } },
  { id: 'philippe', name: 'Édouard Philippe', power: 'Deux heures de plus', desc: '+1 budget par manche, mais les échelons coûtent 1 de plus.', hpBonus: 1, mods: { budgetPerRound: 1, upgradeDiscount: -1 } },
  { id: 'attal', name: 'Gabriel Attal', power: 'Choc des savoirs', desc: 'Les échelons coûtent 1 de moins.', hpBonus: 6, mods: { upgradeDiscount: 1 } },
  { id: 'zemmour', name: 'Éric Zemmour', power: 'Polémique permanente', desc: 'Votre premier politique a Polémique à chaque combat.', hpBonus: 0, mods: { frontPolemique: true } },
  { id: 'tondelier', name: 'Marine Tondelier', power: 'Première République écologique', desc: 'À chaque fin de recrutement, votre premier politique gagne +1/+1.', hpBonus: -3, mods: { frontGrowth: 1 } },
  { id: 'melenchon', name: 'Jean-Luc Mélenchon', power: 'La rue', desc: 'Au début de chaque manche, ajoutez un Tract à votre main.', hpBonus: -3, mods: { startTracts: 1 } },
  { id: 'sarkozy', name: 'Nicolas Sarkozy', power: 'Casier', desc: 'Les casseroles coûtent 1 de moins, et il en faut une de plus pour faire scandale.', hpBonus: 6, mods: { casseroleDiscount: 1, scandalThresholdDelta: 1 } },
  { id: 'macron', name: 'Emmanuel Macron', power: 'En même temps', desc: 'La première Annonce de chaque manche se déclenche deux fois.', hpBonus: 9, mods: { firstAnnonceTwice: true } },
  { id: 'hollande', name: 'François Hollande', power: 'Le retour', desc: 'Le premier politique à mourir revient à chaque combat.', hpBonus: 2, mods: { firstDeathRetour: true } },
  { id: 'retailleau', name: 'Bruno Retailleau', power: 'L\'ordre', desc: 'Votre premier politique gagne +4 PV à chaque combat.', hpBonus: 8, mods: { frontHp: 4 } },
  { id: 'glucksmann', name: 'Raphaël Glucksmann', power: 'Taxe Zucman', desc: '+2 budget à la manche suivante après une défaite.', hpBonus: 1, mods: { lossBudget: 2 } },
  { id: 'bardella', name: 'Jordan Bardella', power: 'Le dauphin', desc: 'Le premier politique à mourir transmet son attaque au suivant.', hpBonus: 8, mods: { firstDeathTransmit: true } },
  { id: 'lassalle', name: 'Jean Lassalle', power: 'Tour de France à pied', desc: 'Les deux premières actualisations de chaque manche sont gratuites.', hpBonus: 0, mods: { freeRollsPerRound: 2 } },
  { id: 'balkany', name: 'Patrick Balkany', power: 'Blanchiment', desc: 'Renvoyer un politique rapporte 1 de plus.', hpBonus: 7, mods: { sellBonus: 1 } },
  // Les candidats déclarés à la présidentielle de 2027 (liste de Wikipédia, 4 novembre 2026), qui ont déjà leur carte.
  { id: 'roussel', name: 'Fabien Roussel', power: 'Les jours heureux', desc: '+1 budget par manche.', hpBonus: -5, mods: { budgetPerRound: 1 } },
  { id: 'ruffin', name: 'François Ruffin', power: 'Merci patron !', desc: 'Renvoyer un politique rapporte 1 de plus, et +1 budget à la manche suivante après une défaite.', hpBonus: 1, mods: { sellBonus: 1, lossBudget: 1 } },
  { id: 'bertrand', name: 'Xavier Bertrand', power: 'Toujours candidat', desc: 'Les échelons coûtent 1 de moins, et votre premier politique gagne +2 PV à chaque combat.', hpBonus: 4, mods: { upgradeDiscount: 1, frontHp: 2 } },
  { id: 'lisnard', name: 'David Lisnard', power: 'Libérer les énergies', desc: 'Le premier recrutement de chaque manche coûte 1 de moins, et renvoyer un politique rapporte 1 de plus.', hpBonus: -6, mods: { firstBuyDiscount: 1, sellBonus: 1 } },
  { id: 'dupont_aignan', name: 'Nicolas Dupont-Aignan', power: 'Debout la France', desc: 'La première actualisation de chaque manche est gratuite, et votre premier politique gagne +2 PV à chaque combat.', hpBonus: -1, mods: { freeRollsPerRound: 1, frontHp: 2 } },
  { id: 'philippot', name: 'Florian Philippot', power: 'Le Frexit', desc: 'À chaque combat, la première Polémique adverse ne vous tue personne, et les deux premières actualisations de chaque manche sont gratuites.', hpBonus: -2, mods: { firstPolemiqueResist: true, freeRollsPerRound: 2 } },
  { id: 'arthaud', name: 'Nathalie Arthaud', power: 'Travailleuses, travailleurs', desc: 'À chaque fin de recrutement, votre premier politique gagne +1/+1, et +1 budget à la manche suivante après une défaite.', hpBonus: -6, mods: { frontGrowth: 1, lossBudget: 1 } },
  { id: 'asselineau', name: 'François Asselineau', power: 'L\'article 50', desc: 'Les échelons coûtent 1 de moins, et la première actualisation de chaque manche est gratuite.', hpBonus: -3, mods: { upgradeDiscount: 1, freeRollsPerRound: 1 } },
  { id: 'cazeneuve', name: 'Bernard Cazeneuve', power: 'L\'homme d\'État', desc: 'Votre premier politique gagne +2 PV à chaque combat, et il faut une casserole de plus pour faire scandale.', hpBonus: 7, mods: { frontHp: 2, scandalThresholdDelta: 1 } },
  { id: 'bouamrane', name: 'Karim Bouamrane', power: 'Saint-Ouen olympique', desc: 'À chaque fin de recrutement, votre premier politique gagne +1/+1, et +2 PV à chaque combat.', hpBonus: -5, mods: { frontGrowth: 1, frontHp: 2 } },
  { id: 'batho', name: 'Delphine Batho', power: 'La décroissance', desc: 'Votre plateau n\'a que 6 places au lieu de 7, mais vous gagnez +1 budget par manche.', hpBonus: 1, mods: { boardDelta: -1, budgetPerRound: 1 } },
  { id: 'kazib', name: 'Anasse Kazib', power: 'La grève', desc: 'La première actualisation de chaque manche est gratuite, et +1 budget à la manche suivante après une défaite.', hpBonus: -3, mods: { freeRollsPerRound: 1, lossBudget: 1 } },
  { id: 'durif', name: 'Sylvain Durif', power: 'Le Christ cosmique', desc: 'Le premier politique à mourir revient à chaque combat, mais les échelons coûtent 1 de plus.', hpBonus: 8, mods: { firstDeathRetour: true, upgradeDiscount: -1 } },
  { id: 'lalanne', name: 'Francis Lalanne', power: 'On se retrouvera', desc: 'Le premier politique à mourir transmet son attaque au suivant, et +1 budget à la manche suivante après une défaite.', hpBonus: 0, mods: { firstDeathTransmit: true, lossBudget: 1 } },
];

/** Les boss du mode histoire y figurent pour leur nom, mais ne sont jamais tirés ni proposés : ils sont hors de HEROES. */
export const HERO_BY_ID: Record<string, Hero> = { ...Object.fromEntries(HEROES.map((h) => [h.id, h])), ...BOSS_SPECIAUX };

export const CONTEXTS: Context[] = [
  { id: 'normal', name: 'Vie politique ordinaire', desc: 'Aucune règle spéciale.' },
  { id: 'dissolution', name: 'Dissolution', desc: 'À la manche 8, chaque plateau perd son dernier politique.', dissolutionRound: 8 },
  { id: 'cohabitation', name: 'Cohabitation', desc: 'La boutique propose deux sorts.', params: { spellSlots: 2 } },
  { id: 'austerite', name: 'Budget d\'austérité', desc: 'Budget maximum à 8.', params: { maxBudget: 8 } },
  { id: 'fer_a_cheval', name: 'Théorie du fer à cheval', desc: 'Insoumis, RN et Reconquête comptent comme un même camp.', extremesAllied: true },
  { id: 'remaniement', name: 'Remaniement permanent', desc: 'Les sorts coûtent 1 de moins.', params: { spellDiscount: 1 } },
  { id: 'affaires', name: 'Semaine des affaires', desc: 'Des casseroles en boutique dès la première manche.', params: { casseroleFromRound: 1 } },
];
