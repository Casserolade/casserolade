import type { Effect, Spell } from '../engine/types.ts';

/** Un effet de sort : il joue au moment où on le lance. */
function fx(to: Effect['to'], action: Record<string, unknown> & { do: string }): Effect {
  return { when: 'annonce', to, ...action } as Effect;
}

function spell(id: string, name: string, tier: number, cost: number, target: boolean, effects: Effect[], extra: Partial<Spell> = {}): Spell {
  return { id, name, tier, cost, target, effects, ...extra };
}

/**
 * Les sorts : une carte qu'on achète en boutique, qu'on garde en main
 * et qu'on joue quand on veut. Les sorts « gagnés » ne sont jamais en boutique.
 */
export const SPELLS: Spell[] = [
  // Gagnés
  spell('tract', 'Tract', 1, 0, true, [fx('cible', { do: 'jouer_tract' })], { token: true }),
  spell('investiture', 'Investiture', 1, 0, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 1 })], { token: true }),

  // Les échelons, revus le 13 novembre 2026 : chaque sort à la hauteur de sa force mesurée (node src/sim/bilan_sorts.ts),
  // et des sorts jusqu'à l'échelon 6, comme les politiques. Retirés : Temps de parole, Loi de finances et Tribune libre,
  // qui ne changeaient presque rien à une partie.

  // Échelon 1
  spell('sondage_flatteur', 'Sondage flatteur', 1, 1, true, [fx('cible', { do: 'buff', atk: 1, hp: 2 })]),
  spell('elements_de_langage', 'Éléments de langage', 1, 1, true, [fx('cible', { do: 'mot_cle', keyword: 'porte_parole' }), fx('cible', { do: 'buff', atk: 0, hp: 2 })]),
  spell('note_de_frais', 'Note de frais', 1, 1, false, [fx('joueur', { do: 'budget', value: 2, plus_tard: true })]),
  spell('promesse', 'Promesse de campagne', 1, 2, false, [fx('joueur', { do: 'carte', card: 'tract', count: 2 })]),

  // Échelon 2
  spell('primaire', 'Primaire', 2, 1, true, [fx('cible', { do: 'sacrifier', echelon: 0 })]),
  spell('matinale', 'Matinale', 2, 1, false, [fx('joueur', { do: 'actualisations_gratuites', value: 2 })]),
  spell('bracelet_electronique', 'Bracelet électronique', 2, 1, false, [fx('joueur', { do: 'oublier' })]),
  spell('motion_de_censure', 'Motion de censure', 2, 1, false, [fx('joueur', { do: 'pari_defaite', value: 3 })]),
  // Une fuite, et l'affaire sort : trois casseroles au choix, parmi celles de la partie (13 novembre 2026).
  spell('fuite_dans_la_presse', 'Fuite dans la presse', 2, 1, false, [fx('joueur', { do: 'decouvrir', quoi: 'casserole' })]),

  // Échelon 3
  // 7 novembre 2026 : le débauchage se monte tôt ; il passe de l'échelon 2 au 3 le 13 novembre.
  spell('debauchage', 'Débauchage', 3, 1, true, [fx('cible', { do: 'debaucher', pick: 'plus_fort' })]),
  spell('campagne_de_terrain', 'Campagne de terrain', 3, 3, false, [fx('allies', { do: 'buff', atk: 1, hp: 1 })]),
  spell('seconde_chance', 'Seconde chance', 3, 2, true, [fx('cible', { do: 'mot_cle', keyword: 'retour' })]),
  spell('testament_politique', 'Testament politique', 3, 3, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 0, declencheur: 'heritage' })]),
  // Vos politiques font la une : leurs casseroles d'abord, celles des autres si les vôtres manquent. Sur leur
  // propriétaire, elles donnent leur bonus en plus (13 novembre 2026, à la place du poids des affaires « à la une »).
  spell('a_la_une', 'À la une', 3, 2, false, [fx('joueur', { do: 'decouvrir', quoi: 'casserole', proprietaires: 'vos_politiques' })]),

  // Échelon 4
  spell('motion_de_synthese', 'Motion de synthèse', 4, 2, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 0 })]),
  spell('remaniement', 'Remaniement', 4, 3, true, [fx('cible', { do: 'dorer', maxTier: 3 })], { maxTargetTier: 3 }),
  spell('seconde_deliberation', 'Seconde délibération', 4, 3, true, [fx('cible', { do: 'declencher', trigger: 'annonce' })]),
  spell('cumul_des_mandats', 'Cumul des mandats', 4, 3, true, [fx('cible', { do: 'mot_cle', keyword: 'cumul' })]),
  spell('congres', 'Congrès', 4, 2, true, [fx('cible', { do: 'congres' })]),

  // Échelon 5
  spell('immunite_parlementaire', 'Immunité parlementaire', 5, 3, true, [fx('cible', { do: 'mot_cle', keyword: 'immunite' })]),
  spell('ouverture', 'Ouverture', 5, 3, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 0, declencheur: 'annonce' })]),
  spell('programme', 'Programme', 5, 3, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 0, declencheur: 'fin_tour' })]),
  spell('petite_phrase', 'Petite phrase', 5, 3, true, [fx('cible', { do: 'mot_cle', keyword: 'polemique' })]),
  spell('conseil_des_ministres', 'Conseil des ministres', 5, 3, false, [fx('allies', { do: 'declencher', trigger: 'fin_tour' })]),

  // Échelon 6
  spell('grand_debat', 'Grand débat national', 6, 4, false, [fx('allies', { do: 'buff', atk: 2, hp: 2 })]),
  // Le coup de balai (13 novembre 2026) : les attaques de la cible touchent aussi les voisins de la sienne.
  spell('grand_menage', 'Grand ménage', 6, 3, true, [fx('cible', { do: 'mot_cle', keyword: 'balai' })]),
];

// Les effets d'un sort servent à chaque lancer, dans toutes les parties : figés, rien ne peut les modifier en place.
for (const spell of SPELLS) {
  for (const effect of spell.effects) Object.freeze(effect);
  Object.freeze(spell.effects);
}

export const SPELL_BY_ID: Record<string, Spell> = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

/** Les sorts qui peuvent sortir en boutique ou d'une découverte, jusqu'à cet échelon. */
export function shopSpells(tier: number): Spell[] {
  return SPELLS.filter((s) => !s.token && s.tier <= tier);
}
