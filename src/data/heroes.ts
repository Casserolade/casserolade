import type { Context, Hero } from '../engine/types.ts';
import { BOSS_SPECIAUX } from './histoire/boss.ts';

export const HEROES: Hero[] = [
  { id: 'lepen', name: 'Marine Le Pen', power: 'TVA à 5,5 %', desc: 'Le premier recrutement de chaque manche coûte 1 de moins.', hpBonus: -2, mods: { firstBuyDiscount: 1 } },
  { id: 'philippe', name: 'Édouard Philippe', power: 'Deux heures de plus', desc: '+1 budget par manche, mais les échelons coûtent 1 de plus.', hpBonus: 2, mods: { budgetPerRound: 1, upgradeDiscount: -1 } },
  { id: 'attal', name: 'Gabriel Attal', power: 'Choc des savoirs', desc: 'Les échelons coûtent 1 de moins.', hpBonus: 8, mods: { upgradeDiscount: 1 } },
  { id: 'zemmour', name: 'Éric Zemmour', power: 'Polémique permanente', desc: 'Votre premier politique a Polémique à chaque combat.', hpBonus: -1, mods: { frontPolemique: true } },
  { id: 'tondelier', name: 'Marine Tondelier', power: 'Première République écologique', desc: 'À chaque fin de recrutement, votre premier politique gagne +1/+1.', hpBonus: -4, mods: { frontGrowth: 1 } },
  { id: 'melenchon', name: 'Jean-Luc Mélenchon', power: 'La rue', desc: 'Au début de chaque manche, ajoutez un Tract à votre main.', hpBonus: -4, mods: { startTracts: 1 } },
  { id: 'sarkozy', name: 'Nicolas Sarkozy', power: 'Casier', desc: 'Les casseroles coûtent 1 de moins, et il en faut une de plus pour faire scandale.', hpBonus: 4, mods: { casseroleDiscount: 1, scandalThresholdDelta: 1 } },
  { id: 'macron', name: 'Emmanuel Macron', power: 'En même temps', desc: 'La première Annonce de chaque manche se déclenche deux fois.', hpBonus: 9, mods: { firstAnnonceTwice: true } },
  { id: 'hollande', name: 'François Hollande', power: 'Le retour', desc: 'Le premier politique à mourir revient à chaque combat.', hpBonus: 0, mods: { firstDeathRetour: true } },
  { id: 'retailleau', name: 'Bruno Retailleau', power: 'L\'ordre', desc: 'Votre premier politique gagne +4 PV à chaque combat.', hpBonus: 5, mods: { frontHp: 4 } },
  { id: 'glucksmann', name: 'Raphaël Glucksmann', power: 'Taxe Zucman', desc: '+2 budget à la manche suivante après une défaite.', hpBonus: 0, mods: { lossBudget: 2 } },
  { id: 'bardella', name: 'Jordan Bardella', power: 'Le dauphin', desc: 'Le premier politique à mourir transmet son attaque au suivant.', hpBonus: 7, mods: { firstDeathTransmit: true } },
  { id: 'lassalle', name: 'Jean Lassalle', power: 'Tour de France à pied', desc: 'Les deux premières actualisations de chaque manche sont gratuites.', hpBonus: 6, mods: { freeRollsPerRound: 2 } },
  { id: 'balkany', name: 'Patrick Balkany', power: 'Blanchiment', desc: 'Renvoyer un politique rapporte 1 de plus.', hpBonus: 6, mods: { sellBonus: 1 } },
  // Les candidats déclarés à la présidentielle de 2027 (liste de Wikipédia, 4 novembre 2026), qui ont déjà leur carte.
  { id: 'roussel', name: 'Fabien Roussel', power: 'Les jours heureux', desc: '+1 budget par manche.', hpBonus: -5, mods: { budgetPerRound: 1 } },
  { id: 'ruffin', name: 'François Ruffin', power: 'Merci patron !', desc: 'Renvoyer un politique rapporte 1 de plus, et +1 budget à la manche suivante après une défaite.', hpBonus: 1, mods: { sellBonus: 1, lossBudget: 1 } },
  { id: 'bertrand', name: 'Xavier Bertrand', power: 'Toujours candidat', desc: 'Les échelons coûtent 1 de moins, et votre premier politique gagne +2 PV à chaque combat.', hpBonus: 3, mods: { upgradeDiscount: 1, frontHp: 2 } },
  { id: 'lisnard', name: 'David Lisnard', power: 'Libérer les énergies', desc: 'Le premier recrutement de chaque manche coûte 1 de moins, et renvoyer un politique rapporte 1 de plus.', hpBonus: -7, mods: { firstBuyDiscount: 1, sellBonus: 1 } },
  { id: 'dupont_aignan', name: 'Nicolas Dupont-Aignan', power: 'Debout la France', desc: 'La première actualisation de chaque manche est gratuite, et votre premier politique gagne +2 PV à chaque combat.', hpBonus: 2, mods: { freeRollsPerRound: 1, frontHp: 2 } },
  { id: 'philippot', name: 'Florian Philippot', power: 'Le Frexit', desc: 'À chaque combat, la première Polémique adverse ne vous tue personne, et les deux premières actualisations de chaque manche sont gratuites.', hpBonus: 3, mods: { firstPolemiqueResist: true, freeRollsPerRound: 2 } },
  { id: 'arthaud', name: 'Nathalie Arthaud', power: 'Travailleuses, travailleurs', desc: 'À chaque fin de recrutement, votre premier politique gagne +1/+1, et +1 budget à la manche suivante après une défaite.', hpBonus: -7, mods: { frontGrowth: 1, lossBudget: 1 } },
  { id: 'asselineau', name: 'François Asselineau', power: 'L\'article 50', desc: 'Les échelons coûtent 1 de moins, et la première actualisation de chaque manche est gratuite.', hpBonus: 0, mods: { upgradeDiscount: 1, freeRollsPerRound: 1 } },
  { id: 'cazeneuve', name: 'Bernard Cazeneuve', power: 'L\'homme d\'État', desc: 'Votre premier politique gagne +2 PV à chaque combat, et il faut une casserole de plus pour faire scandale.', hpBonus: 7, mods: { frontHp: 2, scandalThresholdDelta: 1 } },
  { id: 'bouamrane', name: 'Karim Bouamrane', power: 'Saint-Ouen olympique', desc: 'À chaque fin de recrutement, votre premier politique gagne +1/+1, et +2 PV à chaque combat.', hpBonus: -10, mods: { frontGrowth: 1, frontHp: 2 } },
  { id: 'batho', name: 'Delphine Batho', power: 'La décroissance', desc: 'Votre plateau n\'a que 6 places au lieu de 7, mais vous gagnez +1 budget par manche.', hpBonus: 3, mods: { boardDelta: -1, budgetPerRound: 1 } },
  { id: 'kazib', name: 'Anasse Kazib', power: 'La grève', desc: 'La première actualisation de chaque manche est gratuite, et +1 budget à la manche suivante après une défaite.', hpBonus: 0, mods: { freeRollsPerRound: 1, lossBudget: 1 } },
  { id: 'durif', name: 'Sylvain Durif', power: 'Le Christ cosmique', desc: 'Le premier politique à mourir revient à chaque combat, mais les échelons coûtent 1 de plus.', hpBonus: 8, mods: { firstDeathRetour: true, upgradeDiscount: -1 } },
  { id: 'lalanne', name: 'Francis Lalanne', power: 'On se retrouvera', desc: 'Le premier politique à mourir transmet son attaque au suivant, et +1 budget à la manche suivante après une défaite.', hpBonus: 0, mods: { firstDeathTransmit: true, lossBudget: 1 } },
];

/** Les boss du mode histoire y figurent pour leur nom, mais ne sont jamais tirés ni proposés : ils sont hors de HEROES. */
export const HERO_BY_ID: Record<string, Hero> = { ...Object.fromEntries(HEROES.map((h) => [h.id, h])), ...BOSS_SPECIAUX };

/** Le contexte qu'on tire au hasard parmi ceux qui ont une règle, au lancement de la partie. */
export const RANDOM_CONTEXT = 'hasard';

/**
 * Les contextes : la règle du jour, comme les Anomalies de Battlegrounds. Ils doivent amuser, pas punir
 * (5 novembre 2026 : « Budget d'austérité est simplement anti-fun »). Le premier, sans règle, sert quand on les désactive.
 */
export const CONTEXTS: Context[] = [
  { id: 'normal', name: 'Vie politique ordinaire', desc: 'Aucune règle spéciale.' },
  { id: 'quoi_qu_il_en_coute', name: 'Quoi qu\'il en coûte', desc: 'Budget maximum à 13 : c\'est l\'État qui paie.', params: { maxBudget: 13 } },
  { id: 'mercato', name: 'Mercato', desc: 'Recruter un politique coûte 2 : les transferts n\'ont jamais été aussi bon marché.', params: { buyCost: 2 } },
  { id: 'tripartition', name: 'Tripartition', desc: 'Trois partis seulement, plus la Société civile : les synergies pleuvent.', params: { activeCamps: 3 } },
  { id: 'prescription', name: 'Prescription', desc: 'Il faut trois casseroles pour faire un scandale. La justice a le temps.', params: { scandalThreshold: 3 } },
  { id: 'ascenseur_social', name: 'Ascenseur social', desc: 'Monter d\'échelon coûte 2 de moins.', params: { tierCost: { 2: 2, 3: 4, 4: 6, 5: 7, 6: 8 } } },
  { id: 'chaine_info', name: 'Chaîne d\'info en continu', desc: 'La boutique propose un politique de plus.', params: { shopSize: { 1: 4, 2: 5, 3: 5, 4: 6, 5: 6, 6: 6 } } },
  { id: 'primaire_ouverte', name: 'Primaire ouverte', desc: 'À la première manche, chacun découvre un politique de l\'échelon 2.', firstRoundDiscover: 2 },
  { id: 'premier_de_cordee', name: 'Premier de cordée', desc: 'À chaque fin de recrutement, votre politique le plus à gauche gagne +1/+1.', firstOfRope: { atk: 1, hp: 1 } },
  { id: 'ruissellement', name: 'Ruissellement', desc: 'À chaque manche, le dernier en sondages reçoit 2 de budget en plus. Il paraît que ça ruisselle.', lastPlaceBudget: 2 },
  { id: 'dissolution', name: 'Dissolution', desc: 'À la manche 8, chaque plateau perd son dernier politique, puis chacun découvre un politique de son échelon.', dissolutionRound: 8, dissolutionDiscover: true },
  { id: 'cohabitation', name: 'Cohabitation', desc: 'La boutique propose deux sorts.', params: { spellSlots: 2 } },
  { id: 'fer_a_cheval', name: 'Théorie du fer à cheval', desc: 'Insoumis, RN et Reconquête comptent comme un même camp.', extremesAllied: true },
  { id: 'remaniement', name: 'Remaniement permanent', desc: 'Les sorts coûtent 1 de moins.', params: { spellDiscount: 1 } },
  { id: 'affaires', name: 'Semaine des affaires', desc: 'Des casseroles en boutique dès la première manche.', params: { casseroleFromRound: 1 } },
];
