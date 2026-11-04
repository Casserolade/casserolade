import type { Trigger } from '#src/engine/types.ts';

/** Le nom court de chaque déclencheur, pour les bulles du combat. */
export const TRIGGER_LABELS: Record<Trigger, string> = {
  annonce: 'Annonce',
  fin_tour: 'Fin de tour',
  debut_tour: 'Début de tour',
  joue: 'Jeu',
  vente: 'Vente',
  vente_allie: 'Vente',
  sort: 'Sort',
  actualise: 'Actualisation',
  debauche: 'Débauchage',
  rallie: 'Ralliement',
  casserole_recue: 'Casserole',
  depense: 'Dépense',
  celebration: 'Célébration',
  droit_de_reponse: 'Droit de réponse',
  debut_combat: '49.3',
  heritage: 'Héritage',
  riposte: 'Riposte',
  meeting: 'Meeting',
  tue: 'Victime',
  revanche: 'Revanche',
  immunite_perdue: 'Immunité',
  aura: 'Effet',
};
