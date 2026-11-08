import type { Cinematique } from '#src/data/histoire/cinematique.ts';

/** The example of the cutscene format: Giscard, back from beyond the grave. It tries every kind of action. */
export const DEMO_CUTSCENE: Cinematique = {
  id: 'demo_giscard',
  heros: 'giscard',
  moment: 'intro',
  style: 'guignol',
  duree: 22,
  decor: 'castelet',
  musique: 'glas',
  distribution: [
    { role: 'vge', personnage: 'giscard' },
    { role: 'mitterrand', personnage: 'mitterrand' },
    { role: 'macron', personnage: 'macron' },
  ],
  accessoires: [{ id: 'chaise', type: 'trone' }, { id: 'urne', type: 'urne' }],
  plans: [
    { a: 0, cadre: 'large', actions: [{ titre: '19 mai 1981', sous_titre: 'Une chaise vide' }, { accessoire: 'chaise', fait: 'apparait', x: 50 }] },
    { a: 3, actions: [{ entre: 'vge', par: 'bas', x: 42 }, { narrateur: 'Quarante-cinq ans plus tard, quelqu\'un se rassoit.' }] },
    { a: 6.5, cadre: { sur: 'vge' }, actions: [{ dit: 'vge', texte: 'Au revoir.', source: 'Allocution télévisée, 19 mai 1981 (INA)' }] },
    { a: 8.5, cadre: 'large', actions: [{ entre: 'mitterrand', par: 'droite', x: 74 }, { visage: 'mitterrand', expression: 'choc', delai: 0.6 }, { bruitage: 'gong', delai: 0.6 }] },
    { a: 10.5, actions: [{ visage: 'mitterrand', expression: 'base' }, { foule: 'Il est revenu ?!' }, { secousse: 2 }] },
    { a: 12.5, actions: [{ entre: 'macron', par: 'gauche', x: 18 }, { dit: 'macron', texte: 'Je suis là pour présider.', invente: true }] },
    { a: 15, actions: [{ tape: 'vge', sur: 'macron' }, { saute: 'mitterrand' }, { bandeau: 'Valéry Giscard d\'Estaing annonce sa candidature depuis l\'au-delà' }] },
    { a: 17, actions: [{ accelere: 2 }, { poursuite: ['macron', 'vge'], tours: 2 }] },
    { a: 20, actions: [{ eclair: true }, { confettis: true }, { narrateur: 'La campagne commence.' }] },
  ],
};
