import type { Camp, Context, Effect, Hero } from '../engine/types.ts';
import { BOSS_SPECIAUX } from './histoire/boss.ts';

/** Un effet de pouvoir activable : il joue quand on l'active, comme un sort (`camp` : seulement sur une cible de ce camp). */
function power(to: Effect['to'], action: Record<string, unknown> & { do: string }, camp?: Camp): Effect {
  return { when: 'annonce', to, ...action, ...(camp ? { camp } : {}) } as Effect;
}

/** L'armure la plus haute qu'un héros puisse recevoir : au-delà, c'est son pouvoir qu'il faut revoir. */
export const MAX_ARMOR = 20;

/**
 * Tous les héros partent avec les mêmes sondages (`PARAMS.startHp`) : seule leur armure, le socle électoral, les
 * départage (13 novembre 2026). Elle se règle par mesure : `node src/sim/balance.ts --tune 3`.
 *
 * Depuis le 26 novembre 2026, dix pouvoirs s'activent (`pouvoir`) : gratuits ou à 1, une fois par manche ou une fois
 * dans la partie, chacun mesuré par simulation (Zemmour, Mélenchon, Hollande, Retailleau,
 * Glucksmann, Balkany, Bertrand, Tondelier, Branco, Polony). Un mot-clé donné à chaque manche ne tient qu'un combat.
 * Les héros des casseroles comptent celles qu'ils posent : Balkany les encaisse, Sarkozy et Macron gagnent un palier. Un mot-clé donné
 * pour un combat redevient durable si une source durable le donne aussi.
 * Attal, héros du tutoriel calé sur sa remise d'échelon, garde son pouvoir passif.
 */
export const HEROES: Hero[] = [
  { id: 'lepen', name: 'Marine Le Pen', power: 'TVA à 5,5 %', desc: 'Le premier recrutement de chaque manche coûte 1 de moins.', armor: 3, mods: { firstBuyDiscount: 1 } },
  { id: 'philippe', name: 'Édouard Philippe', power: 'Deux heures de plus', desc: '+1 budget par manche, mais les échelons coûtent 1 de plus.', armor: 8, mods: { budgetPerRound: 1, upgradeDiscount: -1 } },
  { id: 'attal', name: 'Gabriel Attal', power: 'Choc des savoirs', desc: 'Les échelons coûtent 1 de moins.', armor: 14, mods: { upgradeDiscount: 1 } },
  { id: 'zemmour', name: 'Éric Zemmour', power: 'Ben voyons', desc: 'Une fois par manche, gratuit : donne Polémique à un politique, jusqu\'à la fin du prochain combat.', armor: 12, mods: {}, pouvoir: { cost: 0, frequency: 'manche', target: true, temporaire: true, effects: [power('cible', { do: 'mot_cle', keyword: 'polemique' })] } },
  { id: 'tondelier', name: 'Marine Tondelier', power: 'La veste verte', desc: 'Une fois par manche, gratuit : +1/+1 à un politique, +2/+2 si c\'est un Écologiste.', armor: 1, mods: {}, pouvoir: { cost: 0, frequency: 'manche', target: true, effects: [power('cible', { do: 'buff', atk: 1, hp: 1 }), power('cible', { do: 'buff', atk: 1, hp: 1 }, 'ecologistes')] } },
  { id: 'melenchon', name: 'Jean-Luc Mélenchon', power: 'Ma personne est sacrée', desc: 'Une fois par partie, gratuit : donne Immunité à un politique, pour de bon.', armor: 13, mods: {}, pouvoir: { cost: 0, frequency: 'partie', target: true, effects: [power('cible', { do: 'mot_cle', keyword: 'immunite' })] } },
  { id: 'sarkozy', name: 'Nicolas Sarkozy', power: 'Casier', desc: 'Les casseroles coûtent 1 de moins (jamais moins de 1), et il en faut une de plus pour faire scandale. À partir de la 6e casserole posée, chacune donne aussi +2/+2 au politique qui la reçoit.', armor: 11, mods: { casseroleDiscount: 1, scandalThresholdDelta: 1 }, palier: { casseroles: 6, mods: { casseroleBonus: { atk: 2, hp: 2 } } } },
  { id: 'macron', name: 'Emmanuel Macron', power: 'En même temps', desc: 'La première Annonce de chaque manche se déclenche deux fois. À partir de la 5e casserole posée, la première casserole de chaque manche donne ses stats deux fois.', armor: 12, mods: { firstAnnonceTwice: true }, palier: { casseroles: 5, mods: { firstCasseroleTwice: true } } },
  { id: 'hollande', name: 'François Hollande', power: 'Moi président', desc: 'Une fois par partie, gratuit : un politique d\'échelon 4 ou moins devient doré.', armor: 12, mods: {}, pouvoir: { cost: 0, frequency: 'partie', target: true, maxTargetTier: 4, effects: [power('cible', { do: 'dorer', maxTier: 4 })] } },
  { id: 'retailleau', name: 'Bruno Retailleau', power: 'L\'ordre', desc: 'Une fois par manche, gratuit : +0/+2 à un politique, et Porte-parole jusqu\'à la fin du prochain combat.', armor: 8, mods: {}, pouvoir: { cost: 0, frequency: 'manche', target: true, temporaire: true, effects: [power('cible', { do: 'mot_cle', keyword: 'porte_parole' }), power('cible', { do: 'buff', atk: 0, hp: 2 })] } },
  { id: 'glucksmann', name: 'Raphaël Glucksmann', power: 'Taxe Zucman', desc: 'Une fois par manche, pour 1 : le politique le plus fort de la boutique est taxé, il part, et un de vos politiques prend ses stats.', armor: 6, mods: {}, pouvoir: { cost: 1, frequency: 'manche', target: true, effects: [power('cible', { do: 'debaucher', pick: 'plus_fort' })] } },
  { id: 'bardella', name: 'Jordan Bardella', power: 'Le dauphin', desc: 'Le premier politique à mourir transmet son attaque au suivant.', armor: 14, mods: { firstDeathTransmit: true } },
  { id: 'lassalle', name: 'Jean Lassalle', power: 'Tour de France à pied', desc: 'Les deux premières actualisations de chaque manche sont gratuites.', armor: 12, mods: { freeRollsPerRound: 2 } },
  { id: 'balkany', name: 'Patrick Balkany', power: 'Villa Pamplemousse', desc: 'Une fois par partie, gratuit : gagnez 1 budget par casserole posée cette partie.', armor: 16, mods: {}, pouvoir: { cost: 0, frequency: 'partie', target: false, effects: [power('joueur', { do: 'budget_compteur', compteur: 'casseroles', value: 1 })] } },
  // Les candidats déclarés à la présidentielle de 2027 (liste de Wikipédia, 4 novembre 2026), qui ont déjà leur carte.
  { id: 'roussel', name: 'Fabien Roussel', power: 'Les jours heureux', desc: '+1 budget par manche.', armor: 0, mods: { budgetPerRound: 1 } },
  { id: 'ruffin', name: 'François Ruffin', power: 'Merci patron !', desc: 'Renvoyer un politique rapporte 1 de plus, et +1 budget à la manche suivante après une défaite.', armor: 6, mods: { sellBonus: 1, lossBudget: 1 } },
  { id: 'bertrand', name: 'Xavier Bertrand', power: 'Toujours candidat', desc: 'Une fois par manche, pour 1 : si vous perdez le prochain combat, gagnez 3 budget.', armor: 15, mods: {}, pouvoir: { cost: 1, frequency: 'manche', target: false, effects: [power('joueur', { do: 'pari_defaite', value: 3 })] } },
  { id: 'lisnard', name: 'David Lisnard', power: 'Libérer les énergies', desc: 'Le premier recrutement de chaque manche coûte 1 de moins, et renvoyer un politique rapporte 1 de plus.', armor: 0, mods: { firstBuyDiscount: 1, sellBonus: 1 } },
  { id: 'dupont_aignan', name: 'Nicolas Dupont-Aignan', power: 'Debout la France', desc: 'La première actualisation de chaque manche est gratuite, et votre premier politique gagne +2 PV à chaque combat.', armor: 10, mods: { freeRollsPerRound: 1, frontHp: 2 } },
  { id: 'philippot', name: 'Florian Philippot', power: 'Le Frexit', desc: 'À chaque combat, la première Polémique adverse ne vous tue personne, et les deux premières actualisations de chaque manche sont gratuites.', armor: 12, mods: { firstPolemiqueResist: true, freeRollsPerRound: 2 } },
  { id: 'arthaud', name: 'Nathalie Arthaud', power: 'Travailleuses, travailleurs', desc: 'À chaque fin de recrutement, votre premier politique gagne +1/+1, et +1 budget à la manche suivante après une défaite.', armor: 0, mods: { frontGrowth: 1, lossBudget: 1 } },
  { id: 'asselineau', name: 'François Asselineau', power: 'L\'article 50', desc: 'Les échelons coûtent 1 de moins, et la première actualisation de chaque manche est gratuite.', armor: 3, mods: { upgradeDiscount: 1, freeRollsPerRound: 1 } },
  { id: 'cazeneuve', name: 'Bernard Cazeneuve', power: 'L\'homme d\'État', desc: 'Votre premier politique gagne +2 PV à chaque combat, et il faut une casserole de plus pour faire scandale.', armor: 14, mods: { frontHp: 2, scandalThresholdDelta: 1 } },
  { id: 'bouamrane', name: 'Karim Bouamrane', power: 'Saint-Ouen olympique', desc: 'À chaque fin de recrutement, votre premier politique gagne +1/+1, et +2 PV à chaque combat.', armor: 2, mods: { frontGrowth: 1, frontHp: 2 } },
  { id: 'batho', name: 'Delphine Batho', power: 'La décroissance', desc: 'Votre plateau n\'a que 6 places au lieu de 7, mais vous gagnez +1 budget par manche.', armor: 6, mods: { boardDelta: -1, budgetPerRound: 1 } },
  { id: 'kazib', name: 'Anasse Kazib', power: 'La grève', desc: 'La première actualisation de chaque manche est gratuite, et +1 budget à la manche suivante après une défaite.', armor: 4, mods: { freeRollsPerRound: 1, lossBudget: 1 } },
  { id: 'durif', name: 'Sylvain Durif', power: 'Le Christ cosmique', desc: 'À chaque combat, le premier politique à mourir se réincarne (comme sa carte, avec 1 PV), mais les échelons coûtent 1 de plus.', armor: 20, mods: { firstDeathRetour: true, upgradeDiscount: -1 } },
  { id: 'lalanne', name: 'Francis Lalanne', power: 'On se retrouvera', desc: 'Le premier politique à mourir transmet son attaque au suivant, et +1 budget à la manche suivante après une défaite.', armor: 5, mods: { firstDeathTransmit: true, lossBudget: 1 } },
  // Candidat le 9 novembre 2026. « C'est un candidat… de poids » (Édouard Philippe, BFMTV, le jour même) ; « tomber,
  // se relever toujours » (sa vidéo de candidature).
  { id: 'riner', name: 'Teddy Riner', power: 'Candidat de poids', desc: 'Votre premier politique gagne +2 PV à chaque combat, et le premier politique à mourir se réincarne (comme sa carte, avec 1 PV).', armor: 9, mods: { frontHp: 2, firstDeathRetour: true } },
  // Candidat le 19 décembre 2025 (Radio Sud), avec Les Ruches. Son pamphlet « Crépuscule » (2019) étalait les réseaux
  // du pouvoir : il déterre une affaire à chaque manche (pouvoir activable du 26 novembre 2026).
  { id: 'branco', name: 'Juan Branco', power: 'Crépuscule', desc: 'Une fois par manche, pour 1 : découvrez une casserole de votre échelon ou moins.', armor: 6, mods: {}, pouvoir: { cost: 1, frequency: 'manche', target: false, effects: [power('joueur', { do: 'decouvrir', quoi: 'casserole' })] } },
  // Candidate le 14 octobre 2026 (France Inter), slogan « Nous sommes la France » : un rassemblement qui grandit avec
  // chaque camp du plateau.
  { id: 'polony', name: 'Natacha Polony', power: 'Nous sommes la France', desc: 'Une fois par manche, gratuit : +1/+1 à un politique par camp différent sur votre plateau.', armor: 0, mods: {}, pouvoir: { cost: 0, frequency: 'manche', target: true, effects: [power('cible', { do: 'buff_par_camp', atk: 1, hp: 1 })] } },
  // Candidat le 20 novembre 2026 (Maison de l'Amérique latine, Paris). « Le Pouvoir de dire non » est son livre de
  // 2025 : le non à la guerre en Irak, à l'ONU, le 14 février 2003. Il dit non à la première Polémique, et aux scandales.
  { id: 'villepin', name: 'Dominique de Villepin', power: 'Le pouvoir de dire non', desc: 'À chaque combat, la première Polémique adverse ne vous tue personne, et il faut une casserole de plus pour faire scandale.', armor: 16, mods: { firstPolemiqueResist: true, scandalThresholdDelta: 1 } },
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
