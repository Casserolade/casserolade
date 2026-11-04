import { writeFileSync } from 'node:fs';
import { CARDS } from '../../src/data/cards.ts';

/** Les animateurs qui tiennent la taverne, un par plateau. Liste de travail. */
const ANIMATEURS = [
  ['hanouna', 'Cyril Hanouna'],
  ['praud', 'Pascal Praud'],
  ['ppda', "Patrick Poivre d'Arvor"],
  ['bouleau', 'Gilles Bouleau'],
  ['barthes', 'Yann Barthès'],
  ['lemoine', 'Anne-Élisabeth Lemoine'],
  ['duhamel', 'Benjamin Duhamel'],
  ['salame', 'Léa Salamé'],
  ['ferrari', 'Laurence Ferrari'],
  ['malherbe', 'Apolline de Malherbe'],
  ['aphatie', 'Jean-Michel Aphatie'],
  ['pujadas', 'David Pujadas'],
];

const people = [
  ...CARDS.map((c) => ({ id: c.id, name: c.name, group: c.camp })),
  ...ANIMATEURS.map(([id, name]) => ({ id, name, group: 'animateur' })),
];
writeFileSync(process.argv[2], JSON.stringify(people, null, 1));
console.log(people.length, 'personnes');
