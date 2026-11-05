import { CONTEXTS, RANDOM_CONTEXT } from '#src/data/heroes.ts';

/** What a game can be played with: a context drawn at random, none, or one in particular. */
export const CONTEXT_CHOICES: { value: string; label: string; desc: string }[] = [
  { value: RANDOM_CONTEXT, label: 'Au hasard', desc: 'Une règle du jour tirée au lancement, comme une Anomalie de Battlegrounds.' },
  { value: CONTEXTS[0].id, label: 'Sans contexte', desc: CONTEXTS[0].desc },
  ...CONTEXTS.slice(1).map((c) => ({ value: c.id, label: c.name, desc: c.desc })),
];
