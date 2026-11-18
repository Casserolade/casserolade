import type { PastKeyword } from '#src/data/misesAJour.ts';
import type { Keyword } from '#src/engine/types.ts';

/** Les mots-clés : toujours le même mot, toujours en gras, et leur règle au survol. */
export const KEYWORD_RULES: Record<Keyword, { label: string; rule: string }> = {
  immunite: { label: 'Immunité', rule: 'Annule les premiers dégâts reçus, d\'une attaque ou d\'un effet, puis tombe.' },
  porte_parole: { label: 'Porte-parole', rule: 'Les ennemis doivent l\'attaquer en priorité.' },
  cumul: { label: 'Cumul des mandats', rule: 'Attaque deux fois.' },
  polemique: { label: 'Polémique', rule: 'Détruit le premier politique qu\'il blesse, puis se perd.' },
  retour: { label: 'Retour en politique', rule: 'Meurt, puis se réincarne une fois à sa place, comme sa carte nue avec 1 PV : après son Héritage, s\'il reste de la place. Détruit au recrutement, il revient de même.' },
  ni_droite_ni_gauche: { label: 'Ni droite ni gauche', rule: 'Compte comme un politique de chaque camp, sauf la Société civile.' },
  ralliement: { label: 'Ralliement', rule: 'Depuis la main, peut se poser sur un allié : il fusionne avec lui et lui donne ses stats, ses mots-clés et ses effets.' },
  balai: { label: 'Coup de balai', rule: 'Ses attaques touchent aussi les voisins de sa cible.' },
};

/**
 * Les mots-clés retirés du jeu : ils ne se lisent plus que sur les cartes des anciennes versions, à la page des mises
 * à jour, qui montre chaque carte telle qu'elle était.
 */
export const RETIRED_KEYWORD_RULES: Record<Exclude<PastKeyword, Keyword>, { label: string; rule: string }> = {
  vedette: { label: 'Vedette', rule: 'Mot-clé retiré le 18 novembre 2026. Après une victoire, la Vedette survivante la plus à gauche prononçait sa petite phrase.' },
};

/** Le mot d'un mot-clé, d'aujourd'hui ou d'une ancienne version. */
export function keywordLabel(keyword: PastKeyword): string {
  return keyword in KEYWORD_RULES ? KEYWORD_RULES[keyword as Keyword].label : RETIRED_KEYWORD_RULES[keyword as Exclude<PastKeyword, Keyword>].label;
}

/** Les autres mots en gras du texte des cartes, avec leur règle. */
export const TERM_RULES: Record<string, string> = {
  Annonce: 'Quand on le joue depuis la main.',
  Héritage: 'À sa mort, en combat ou au recrutement.',
  'Fin de tour': 'À la fin du recrutement.',
  Vente: 'Quand on le renvoie.',
  '49.3': 'Au début du combat.',
  Célébration: 'Après un combat gagné, s\'il a survécu. Chaque Célébration joue.',
  'Droit de réponse': 'Après une défaite. Chaque Droit de réponse joue, même mort au combat ; le plus à gauche prend la parole.',
  Tract: 'Un sort gratuit : +1/+1 à un politique, plus les améliorations de vos Tracts. Joué par un effet, même en combat, il compte comme un sort lancé.',
  découvrez: 'Choisissez une carte parmi trois. Elle va en main. Né d\'une Fin de tour, le choix attend le recrutement suivant.',
  débauchez: 'Retirez un politique de la boutique et prenez ses stats.',
  Scandale: 'Deux casseroles pas encore oubliées sur le même politique : pendant deux manches, leurs défauts s\'appliquent. Puis le peuple oublie : les défauts s\'en vont, les avantages restent.',
};
