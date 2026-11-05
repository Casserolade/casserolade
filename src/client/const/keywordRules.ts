import type { Keyword } from '#src/engine/types.ts';

/** Les mots-clés : toujours le même mot, toujours en gras, et leur règle au survol. */
export const KEYWORD_RULES: Record<Keyword, { label: string; rule: string }> = {
  immunite: { label: 'Immunité', rule: 'Annule le premier coup reçu, puis tombe.' },
  porte_parole: { label: 'Porte-parole', rule: 'Les ennemis doivent l\'attaquer en priorité.' },
  cumul: { label: 'Cumul des mandats', rule: 'Attaque deux fois.' },
  polemique: { label: 'Polémique', rule: 'Détruit le premier politique qu\'il blesse, puis se perd.' },
  retour: { label: 'Retour en politique', rule: 'Revient une fois avec 1 PV.' },
  ni_droite_ni_gauche: { label: 'Ni droite ni gauche', rule: 'Compte comme un politique de chaque camp, sauf la Société civile.' },
  ralliement: { label: 'Ralliement', rule: 'Depuis la main, peut se poser sur un allié : il fusionne avec lui et lui donne ses stats, ses mots-clés et ses effets.' },
  vedette: { label: 'Vedette', rule: 'Après une victoire, la Vedette survivante la plus à gauche prononce sa petite phrase.' },
};

/** Les autres mots en gras du texte des cartes, avec leur règle. */
export const TERM_RULES: Record<string, string> = {
  Annonce: 'Quand on le joue depuis la main.',
  Héritage: 'À sa mort, en combat ou au recrutement.',
  'Fin de tour': 'À la fin du recrutement.',
  Vente: 'Quand on le renvoie.',
  '49.3': 'Au début du combat.',
  Célébration: 'Après un combat gagné, s\'il a survécu. Chaque Célébration joue ; la Vedette prend la parole.',
  'Droit de réponse': 'Après une défaite. Chaque Droit de réponse joue, même mort au combat ; le plus à gauche prend la parole.',
  Tract: 'Un sort gratuit : +1/+1 à un politique, plus les améliorations de vos Tracts.',
  découvrez: 'Choisissez une carte parmi trois. Elle va en main.',
  débauchez: 'Retirez un politique de la boutique et prenez ses stats.',
  Scandale: 'Deux casseroles pas encore oubliées sur le même politique : pendant deux manches, leurs défauts s\'appliquent. Puis le peuple oublie : les défauts s\'en vont, les avantages restent.',
};
