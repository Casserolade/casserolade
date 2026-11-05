/** What the bestiary lists, in the order of its sections. */
export type BestiaryKind = 'mot_cle' | 'heros' | 'politique' | 'casserole' | 'sort' | 'jeton' | 'contexte';

export const BESTIARY_KINDS: { kind: BestiaryKind; label: string }[] = [
  { kind: 'mot_cle', label: 'Mots-clés' },
  { kind: 'heros', label: 'Héros' },
  { kind: 'politique', label: 'Politiques' },
  { kind: 'casserole', label: 'Casseroles' },
  { kind: 'sort', label: 'Sorts' },
  { kind: 'jeton', label: 'Jetons' },
  { kind: 'contexte', label: 'Contextes' },
];
