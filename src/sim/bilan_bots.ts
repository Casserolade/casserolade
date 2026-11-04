import { parseArgs } from 'node:util';
import type { BotLevel, BotStyle } from '../bots/bots.ts';
import { playGame } from './simulate.ts';
import type { GameResult, SeatResult } from './simulate.ts';

/**
 * Le bilan des bots de jeu : force relative, style tenu, et vérification qu'un bot fait ce qu'on croit.
 *   node src/sim/bilan_bots.ts --games 1000
 *   node src/sim/bilan_bots.ts --seulement force,pur,perso
 */
const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '600' },
    dur: { type: 'string', default: '200' },
    seed: { type: 'string', default: '1' },
    seulement: { type: 'string', default: '' },
  },
});


const N = Number(values.games);
const NH = Number(values.dur);
const seed = Number(values.seed);
const only = values.seulement.split(',').filter(Boolean);
const veut = (s: string) => only.length === 0 || only.includes(s);
const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function table(levels: BotLevel[], games: number, styles?: (BotStyle | undefined)[]): GameResult[] {
  const out: GameResult[] = [];
  for (let i = 0; i < games; i++) out.push(playGame({ seed: seed + i * 7919, levels, styles }));
  return out;
}

function ligne(titre: string, seats: SeatResult[]): void {
  const places = seats.map((s) => s.place);
  console.log(`  ${titre.padEnd(34)} place ${mean(places).toFixed(2)}  victoires ${pct(places.filter((p) => p === 1).length / Math.max(1, places.length))}  (${places.length})`);
}

function face(titre: string, seul: BotLevel, autres: BotLevel, games: number, premier?: BotStyle): void {
  const styles = premier ? [premier, ...(Array(7).fill({}) as BotStyle[])] : undefined;
  const r = table([seul, ...Array(7).fill(autres)] as BotLevel[], games, styles);
  ligne(titre, r.map((x) => x.seats[0]));
}

if (veut('force')) {
  console.log('Force relative');
  const mixte = table(['facile', 'facile', 'facile', 'moyen', 'moyen', 'moyen', 'difficile', 'difficile'], NH).flatMap((r) => r.seats);
  for (const l of ['facile', 'moyen', 'difficile']) ligne(`Table mixte, ${l}`, mixte.filter((s) => s.level === l));
  face('1 débutant contre 7 faciles', 'debutant', 'facile', N);
  face('1 débutant qui place contre 7 faciles', 'debutant', 'facile', N, { place: true });
  face('1 débutant qui place contre 7 moyens', 'debutant', 'moyen', N, { place: true });
  face('1 facile contre 7 moyens', 'facile', 'moyen', N);
  face('1 moyen contre 7 faciles', 'moyen', 'facile', N);
  face('1 difficile contre 7 moyens', 'difficile', 'moyen', NH);
}

if (veut('pur')) {
  console.log('Pur contre libre (la moitié de chaque)');
  const mix: BotStyle[] = [{ pure: true }, {}, { pure: true }, {}, { pure: true }, {}, { pure: true }, {}];
  for (const level of ['moyen', 'difficile'] as BotLevel[]) {
    const seats = table(Array(8).fill(level), level === 'moyen' ? N : NH, mix).flatMap((r) => r.seats);
    const purs = seats.filter((s) => s.style === 'pur');
    ligne(`${level}, purs`, purs);
    ligne(`${level}, libres`, seats.filter((s) => s.style !== 'pur'));
    const part = purs.filter((s) => s.boardSize > 0 && s.camp === s.commitment);
    console.log(`  vérif. : ${pct(part.length / purs.length)} des purs ont leur camp en tête, ${mean(part.map((s) => s.campCount)).toFixed(1)} serviteurs du camp sur ${mean(part.map((s) => s.boardSize)).toFixed(1)}`);
  }
}

if (veut('perso')) {
  console.log('Tables de personnages');
  for (const level of ['facile', 'moyen', 'difficile'] as BotLevel[]) {
    const games = level === 'difficile' ? NH : N;
    const results = table(Array(8).fill(level), games, Array(8).fill({ personnage: true }));
    const seats = results.flatMap((r) => r.seats);
    const winners = seats.filter((s) => s.place === 1);
    const mono = winners.filter((w) => w.boardSize > 0 && w.campCount >= Math.max(1, w.boardSize - 1));
    console.log(`  ${level} : ${mean(results.map((r) => r.rounds)).toFixed(1)} manches, vainqueurs mono-camp ${pct(mono.length / Math.max(1, winners.length))}, refus ${results.reduce((s, r) => s + r.rejected, 0)}`);
    if (level !== 'moyen') continue;
    const heros = [...new Set(seats.map((s) => s.heroId))].sort();
    console.log('  héros          place  vict.   camp tête      ventes actual. gels casseroles scandales');
    for (const h of heros) {
      const mine = seats.filter((s) => s.heroId === h);
      const camps = new Map<string, number>();
      for (const s of mine) if (s.camp) camps.set(s.camp, (camps.get(s.camp) ?? 0) + 1);
      const tete = [...camps.entries()].sort((a, b) => b[1] - a[1])[0];
      const act = (t: string) => mean(mine.map((s) => s.actions[t] ?? 0)).toFixed(1);
      console.log(
        `  ${h.padEnd(13)} ${mean(mine.map((s) => s.place)).toFixed(2)}  ${pct(mine.filter((s) => s.place === 1).length / mine.length).padStart(6)}  ${(tete?.[0] ?? '').padEnd(13)} ${pct((tete?.[1] ?? 0) / mine.length).padStart(7)}  ${act('sell').padStart(5)} ${act('roll').padStart(6)} ${act('freeze').padStart(4)} ${mean(mine.map((s) => s.casseroles)).toFixed(1).padStart(8)} ${mean(mine.map((s) => s.scandals)).toFixed(2).padStart(7)}`,
      );
    }
  }
}
