import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { CARD_BY_ID } from '../data/cards.ts';
import { HERO_BY_ID } from '../data/heroes.ts';
import { ARCHIVE_FORMAT } from '../server/gameArchive.ts';
import type { ArchivedGame, ArchivedSeat } from '../server/gameArchive.ts';
import { replayRoom } from '../server/replayRoom.ts';
import { groupStats } from './simulate.ts';

/**
 * Les parties en ligne allées au bout, telles que le serveur les garde (src/server/gameArchive.ts) : ce que les
 * humains en font, à côté des bots, pour l'équilibrage.
 *
 *   tools/parties.sh                               rapatrie les parties du serveur dans data/serveur/parties
 *   node src/sim/bilan_salons.ts                   toutes les parties rapatriées
 *   node src/sim/bilan_salons.ts --version 0.3e    une version du jeu seulement
 *   node src/sim/bilan_salons.ts --rejouer         vérifie aussi que chaque partie se rejoue avec le moteur courant
 *
 * Une partie qui ne se rejoue pas vient d'un autre moteur : son commit est dans l'archive
 * (`git worktree add /tmp/v <commit>`).
 */
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    version: { type: 'string' },
    rejouer: { type: 'boolean', default: false },
  },
});

/** Un humain allé au bout de sa partie, sans bot à sa place : ce qu'il a fait dit quelque chose du jeu. */
const isPlayer = (seat: ArchivedSeat): boolean => seat.niveau === null && !seat.repris;
const CAMP_FROM = 3;

function archiveFiles(paths: string[]): string[] {
  return paths.flatMap((path) => {
    if (!existsSync(path)) return [];
    if (!statSync(path).isDirectory()) return [path];
    return readdirSync(path).filter((name) => name.endsWith('.jsonl')).sort().map((name) => join(path, name));
  });
}

function readGames(files: string[]): ArchivedGame[] {
  const games: ArchivedGame[] = [];
  for (const file of files) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const game = JSON.parse(line) as ArchivedGame;
      if (game.format === ARCHIVE_FORMAT && (!values.version || game.version === values.version)) games.push(game);
    }
  }
  return games;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number): string => `${(x * 100).toFixed(0)} %`;
/** A mean to show: a dash when there is nothing to average. */
const shown = (xs: number[], digits = 1): string => (xs.length ? mean(xs).toFixed(digits) : '—');

function placeLines(title: string, rows: { key: string | null; place: number }[], name: (id: string) => string = (id) => id): string[] {
  const groups = groupStats(rows);
  if (groups.length === 0) return [];
  return [title, ...groups.map((g) => `  ${name(g.id).padEnd(24)} place ${g.avgPlace.toFixed(2)}  victoires ${pct(g.winRate)}  (${g.n})`)];
}

/** Les actions par partie, en moyenne, d'un groupe de sièges : achète-t-on, relance-t-on, monte-t-on comme les bots ? */
function actionLines(title: string, seats: ArchivedSeat[]): string[] {
  if (seats.length === 0) return [];
  const kinds = [...new Set(seats.flatMap((seat) => Object.keys(seat.actions)))].sort();
  const cells = kinds.map((kind) => `${kind} ${mean(seats.map((seat) => seat.actions[kind] ?? 0)).toFixed(1)}`);
  return [`${title} (${seats.length} sièges) : ${cells.join('  ')}`];
}

/** Rejoue chaque partie avec le moteur courant : la même graine et le même journal doivent donner les mêmes places. */
function replayLines(games: ArchivedGame[]): string[] {
  let same = 0;
  const diverging = new Map<string, number>();
  for (const game of games) {
    let replayed = false;
    try {
      const result = replayRoom(game);
      replayed = result.phase === 'fini' && game.joueurs.every((seat) => result.players[seat.siege].place === seat.place);
    } catch {
      replayed = false;
    }
    if (replayed) same++;
    else diverging.set(game.commit ?? 'inconnu', (diverging.get(game.commit ?? 'inconnu') ?? 0) + 1);
  }
  const others = [...diverging].map(([commit, n]) => `${commit} (${n})`).join(', ');
  return [`Rejeu avec le moteur courant : ${same} / ${games.length} identiques${others ? ` ; divergent, par commit : ${others}` : ''}`];
}

const files = archiveFiles(positionals.length ? positionals : ['data/serveur/parties']);
const games = readGames(files);
if (games.length === 0) {
  console.log(`Aucune partie archivée${values.version ? ` en version ${values.version}` : ''} (${files.length} fichier${files.length > 1 ? 's' : ''} lu${files.length > 1 ? 's' : ''}). Rapatriez-les avec tools/parties.sh.`);
  process.exit(0);
}

const seats = games.flatMap((game) => game.joueurs);
const players = seats.filter(isPlayer);
const bots = seats.filter((seat) => seat.niveau !== null);
const heroName = (id: string): string => HERO_BY_ID[id]?.name ?? id;
const versions = [...new Set(games.map((game) => game.version))].join(', ');
const winners = seats.filter((seat) => seat.place === 1);
const onWinners = new Map<string, number>();
for (const seat of winners) for (const minion of seat.plateau) onWinners.set(minion.carte, (onWinners.get(minion.carte) ?? 0) + 1);

const lines = [
  `Parties en ligne allées au bout : ${games.length} (versions ${versions}), du ${games[0].fin.slice(0, 10)} au ${games.at(-1)?.fin.slice(0, 10)}`,
  `Manches : ${mean(games.map((g) => g.manches)).toFixed(1)}  |  Durée : ${(mean(games.map((g) => g.dureeMs)) / 60_000).toFixed(0)} min  |  Publiques : ${games.filter((g) => g.publique).length}  |  Minutées : ${games.filter((g) => g.minuteur).length}`,
  `Humains par table : ${mean(games.map((g) => g.joueurs.filter((s) => s.niveau === null).length)).toFixed(1)}  |  Sièges repris par un bot : ${seats.filter((s) => s.repris).length}`,
  `Échelon final : humains ${shown(players.map((s) => s.echelon))}, bots ${shown(bots.map((s) => s.echelon))}  |  Casseroles : humains ${shown(players.map((s) => s.casseroles), 2)}, bots ${shown(bots.map((s) => s.casseroles), 2)}  |  Triples : humains ${shown(players.map((s) => s.triples), 2)}, bots ${shown(bots.map((s) => s.triples), 2)}`,
  ...(values.rejouer ? replayLines(games) : []),
  '',
  ...placeLines('Humains et bots, à la même table :', seats.map((s) => ({ key: s.niveau === null ? (s.repris ? 'humain repris' : 'humain') : `bot ${s.niveau}`, place: s.place }))),
  ...placeLines('Héros des humains :', players.map((s) => ({ key: s.heros, place: s.place })), heroName),
  ...placeLines('Héros, tous les sièges :', seats.map((s) => ({ key: s.heros, place: s.place })), heroName),
  ...placeLines(`Camps des humains (${CAMP_FROM} politiques du camp au moins) :`, players.filter((s) => s.campCount >= CAMP_FROM).map((s) => ({ key: s.camp, place: s.place }))),
  ...placeLines(`Camps, tous les sièges :`, seats.filter((s) => s.campCount >= CAMP_FROM).map((s) => ({ key: s.camp, place: s.place }))),
  ...placeLines('Contextes (place des humains) :', games.flatMap((g) => g.joueurs.filter(isPlayer).map((s) => ({ key: g.contexte, place: s.place })))),
  '',
  ...actionLines('Actions des humains, par partie', players),
  ...actionLines('Actions des bots, par partie', bots),
  '',
  'Cartes les plus présentes chez les vainqueurs :',
  ...[...onWinners].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, n]) => `  ${(CARD_BY_ID[id]?.name ?? id).padEnd(24)} ${n}`),
];
console.log(lines.join('\n'));
