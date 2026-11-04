import type { Effect, Spell } from '../engine/types.ts';

/** Un effet de sort : il joue au moment où on le lance. */
function fx(to: Effect['to'], action: Record<string, unknown> & { do: string }): Effect {
  return { when: 'annonce', to, ...action } as Effect;
}

function spell(id: string, name: string, tier: number, cost: number, target: boolean, effects: Effect[], extra: Partial<Spell> = {}): Spell {
  return { id, name, tier, cost, target, effects, ...extra };
}

/**
 * Les sorts (docs/gameplay/cartes.md) : une carte qu'on achète en boutique, qu'on garde en main
 * et qu'on joue quand on veut. Les sorts « gagnés » ne sont jamais en boutique.
 */
export const SPELLS: Spell[] = [
  // Gagnés
  spell('tract', 'Tract', 1, 0, true, [fx('cible', { do: 'jouer_tract' })], { token: true }),
  spell('investiture', 'Investiture', 1, 0, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 1 })], { token: true }),

  // Échelon 1
  spell('sondage_flatteur', 'Sondage flatteur', 1, 1, true, [fx('cible', { do: 'buff', atk: 1, hp: 2 })]),
  spell('elements_de_langage', 'Éléments de langage', 1, 1, true, [fx('cible', { do: 'mot_cle', keyword: 'porte_parole' }), fx('cible', { do: 'buff', atk: 0, hp: 2 })]),
  spell('note_de_frais', 'Note de frais', 1, 1, false, [fx('joueur', { do: 'budget', value: 2, plus_tard: true })]),
  spell('promesse', 'Promesse de campagne', 1, 2, false, [fx('joueur', { do: 'carte', card: 'tract', count: 2 })]),

  // Échelon 2
  spell('primaire', 'Primaire', 2, 1, true, [fx('cible', { do: 'sacrifier', echelon: 0 })]),
  spell('motion_de_synthese', 'Motion de synthèse', 2, 2, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 0 })]),
  spell('matinale', 'Matinale', 2, 1, false, [fx('joueur', { do: 'actualisations_gratuites', value: 2 })]),
  // Le temps de parole que l'Arcom décompte : on le donne à qui ne l'a pas, on le reprend à qui l'a.
  spell('temps_de_parole', 'Temps de parole', 2, 1, true, [fx('cible', { do: 'basculer', keyword: 'porte_parole' })]),
  spell('loi_de_finances', 'Loi de finances', 2, 3, false, [fx('joueur', { do: 'budget_max', value: 1 })]),
  spell('bracelet_electronique', 'Bracelet électronique', 2, 1, false, [fx('joueur', { do: 'oublier' })]),

  // Échelon 3
  spell('immunite_parlementaire', 'Immunité parlementaire', 3, 3, true, [fx('cible', { do: 'mot_cle', keyword: 'immunite' })]),
  spell('debauchage', 'Débauchage', 3, 2, true, [fx('cible', { do: 'debaucher', pick: 'plus_fort' })]),
  spell('campagne_de_terrain', 'Campagne de terrain', 3, 3, false, [fx('allies', { do: 'buff', atk: 1, hp: 1 })]),
  spell('seconde_chance', 'Seconde chance', 3, 2, true, [fx('cible', { do: 'mot_cle', keyword: 'retour' })]),
  spell('ouverture', 'Ouverture', 3, 3, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 0, declencheur: 'annonce' })]),
  spell('testament_politique', 'Testament politique', 3, 3, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 0, declencheur: 'heritage' })]),
  spell('programme', 'Programme', 3, 3, false, [fx('joueur', { do: 'decouvrir', quoi: 'serviteur', echelon: 0, declencheur: 'fin_tour' })]),
  spell('motion_de_censure', 'Motion de censure', 3, 1, false, [fx('joueur', { do: 'pari_defaite', value: 3 })]),

  // Échelon 4
  spell('petite_phrase', 'Petite phrase', 4, 3, true, [fx('cible', { do: 'mot_cle', keyword: 'polemique' })]),
  spell('remaniement', 'Remaniement', 4, 3, true, [fx('cible', { do: 'dorer', maxTier: 3 })], { maxTargetTier: 3 }),
  spell('seconde_deliberation', 'Seconde délibération', 4, 3, true, [fx('cible', { do: 'declencher', trigger: 'annonce' })]),
  spell('tribune_libre', 'Tribune libre', 4, 2, true, [fx('cible', { do: 'declencher', trigger: 'heritage' })]),
  spell('cumul_des_mandats', 'Cumul des mandats', 4, 3, true, [fx('cible', { do: 'mot_cle', keyword: 'cumul' })]),
  spell('congres', 'Congrès', 4, 2, true, [fx('cible', { do: 'congres' })]),

  // Échelon 5
  spell('grand_debat', 'Grand débat national', 5, 4, false, [fx('allies', { do: 'buff', atk: 2, hp: 2 })]),
  spell('conseil_des_ministres', 'Conseil des ministres', 5, 3, false, [fx('allies', { do: 'declencher', trigger: 'fin_tour' })]),
];

export const SPELL_BY_ID: Record<string, Spell> = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

/** Les sorts qui peuvent sortir en boutique ou d'une découverte, jusqu'à cet échelon. */
export function shopSpells(tier: number): Spell[] {
  return SPELLS.filter((s) => !s.token && s.tier <= tier);
}
