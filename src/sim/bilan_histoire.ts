import { parseArgs } from 'node:util';
import type { BotLevel, BotStyle } from '../bots/bots.ts';
import { CHAPITRES, OUTRE_TOMBE } from '../data/histoire/chapitres.ts';
import { HEROES } from '../data/heroes.ts';
import { composerTable } from '../histoire/campagne.ts';
import { CARRIERE_PAR_HEROS, chapitresDeCarriere } from '../histoire/carrieres.ts';
import { playGame } from './simulate.ts';

/**
 * La difficulté de chaque chapitre, jouée par des bots à la place du joueur :
 *   débutant      plus grosses stats, pas de placement
 *   débutant+     groupe aussi ses camps
 *   facile, moyen, difficile
 * Avec `--carriere durif`, les chapitres de sa carrière, joués avec son héros, ses rivaux, son boss et ses règles.
 */
const { values } = parseArgs({ options: { games: { type: 'string', default: '200' }, carriere: { type: 'string' } } });
const N = Number(values.games);
const carriere = values.carriere ? CARRIERE_PAR_HEROS[values.carriere] : undefined;
if (values.carriere && !carriere) throw new Error(`pas de carrière pour « ${values.carriere} »`);
const chapitres = carriere ? (chapitresDeCarriere(carriere.heros) ?? []) : [...CHAPITRES, OUTRE_TOMBE];

const JOUEURS: { nom: string; level: BotLevel; style: BotStyle }[] = [
  { nom: 'débutant', level: 'debutant', style: {} },
  { nom: 'débutant+', level: 'debutant', style: { place: true } },
  { nom: 'moyen', level: 'moyen', style: { personnage: true } },
  { nom: 'difficile', level: 'difficile', style: { personnage: true } },
];

console.log(`${'chapitre'.padEnd(16)} ${'sièges'.padEnd(6)} ${'manches'.padEnd(8)} ${JOUEURS.map((j) => j.nom.padEnd(11)).join('')}`);
for (const chapitre of chapitres) {
  const cellules: string[] = [];
  let manches = 0;
  let parties = 0;
  let refus = 0;
  for (const joueur of JOUEURS) {
    let ok = 0;
    const games = joueur.level === 'difficile' ? Math.ceil(N / 2) : N;
    for (let i = 0; i < games; i++) {
      const seed = 11 + i * 7919;
      const heroId = carriere?.heros ?? HEROES[i % HEROES.length].id;
      const t = composerTable(chapitre, heroId, seed, carriere?.boss);
      const levels: BotLevel[] = [joueur.level, ...chapitre.adversaires];
      const styles: BotStyle[] = [joueur.style, ...chapitre.adversaires.map(() => ({ personnage: true }))];
      const r = playGame({ seed, levels, styles, params: t.game.params, heroes: t.game.heroes, heroOverrides: t.game.heroOverrides, contextId: t.game.contextId, activeCamps: t.game.activeCamps, script: t.game.script });
      manches += r.rounds;
      parties++;
      refus += r.rejected;
      if (r.seats[0].place <= chapitre.placeRequise) ok++;
    }
    cellules.push(`${((100 * ok) / games).toFixed(0)} %`.padEnd(11));
  }
  console.log(`${chapitre.id.padEnd(16)} ${String(chapitre.adversaires.length + 1).padEnd(6)} ${(manches / parties).toFixed(1).padEnd(8)} ${cellules.join('')}${refus ? ` refus ${refus}` : ''}`);
}
