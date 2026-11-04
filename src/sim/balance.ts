import { parseArgs } from 'node:util';
import { playGame } from './simulate.ts';
import type { GameResult } from './simulate.ts';
import type { BotLevel, BotStyle } from '../bots/bots.ts';
import type { Hero } from '../engine/types.ts';
import { HEROES } from '../data/heroes.ts';

/**
 * Mesure l'équilibre avec des bots qui s'engagent : la moitié reste mono-camp, ce qui
 * répartit les plateaux entre les camps au lieu de suivre la formule de valeur.
 * --tune cherche aussi les bonus de sondages qui ramènent chaque héros vers la moyenne.
 */
const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '1500' },
    level: { type: 'string', default: 'moyen' },
    tune: { type: 'string', default: '0' },
    /** Chaque bot joue le personnage de son héros : c'est ce qu'on affronte à table. */
    personnages: { type: 'boolean', default: false },
  },
});

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const PERSONNAGES: BotStyle[] = Array(8).fill({ personnage: true });
const MESURE: BotStyle[] = [{ pure: true }, {}, { pure: true }, {}, { pure: true }, {}, { pure: true }, {}];
const STYLES = values.personnages ? PERSONNAGES : MESURE;
const level = values.level as BotLevel;

function run(games: number, overrides: Record<string, Partial<Hero>>, seed: number, lvl = level, styles = STYLES): GameResult[] {
  const out: GameResult[] = [];
  for (let i = 0; i < games; i++) {
    out.push(playGame({ seed: seed + i * 7919, levels: Array(8).fill(lvl), styles, heroOverrides: overrides }));
  }
  return out;
}

function table(rows: { key: string | null; place: number }[]): { id: string; place: number; win: number; n: number }[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.key) continue;
    groups.set(r.key, [...(groups.get(r.key) ?? []), r.place]);
  }
  return [...groups.entries()]
    .map(([id, p]) => ({
      id,
      place: p.reduce((a, b) => a + b, 0) / p.length,
      win: p.filter((x) => x === 1).length / p.length,
      n: p.length,
    }))
    .sort((a, b) => a.place - b.place);
}

const games = Number(values.games);
const overrides: Record<string, Partial<Hero>> = {};
const bonus: Record<string, number> = Object.fromEntries(HEROES.map((h) => [h.id, h.hpBonus]));

/** Le réglage se fait sur quatre tables : une seule table corrige trop le héros qui lui convient. */
function tableaux(pass: number): { key: string; place: number }[] {
  const seed = 1000 * (pass + 1);
  const dur = Math.max(100, Math.round(games / 8));
  const tables: [BotLevel, number, BotStyle[]][] = [
    ['moyen', games, MESURE],
    ['moyen', games, PERSONNAGES],
    ['difficile', dur, MESURE],
    ['difficile', dur, PERSONNAGES],
  ];
  const parTable = tables.map(([lvl, n, styles]) => {
    const seats = run(n, overrides, seed, lvl, styles).flatMap((r) => r.seats);
    return table(seats.map((x) => ({ key: x.heroId, place: x.place })));
  });
  return HEROES.map((h) => {
    const places = parTable.map((t) => t.find((x) => x.id === h.id)?.place ?? 4.5);
    return { key: h.id, place: mean(places) };
  });
}

for (let pass = 0; pass < Number(values.tune); pass++) {
  for (const h of tableaux(pass)) {
    bonus[h.key] = Math.max(-12, Math.min(16, bonus[h.key] + Math.round((h.place - 4.5) * 4)));
    overrides[h.key] = { hpBonus: bonus[h.key] };
  }
}

const results = run(games, overrides, 1);
const seats = results.flatMap((r) => r.seats);
const pct = (x: number) => `${(x * 100).toFixed(1)} %`;

console.log(`Niveau ${level}, ${games} parties, ${mean(results.map((r) => r.rounds)).toFixed(1)} manches`);
console.log('Camps (bots mono-camp uniquement) :');
for (const c of table(seats.filter((s) => s.style === 'pur').map((s) => ({ key: s.camp, place: s.place })))) {
  console.log(`  ${c.id.padEnd(14)} place ${c.place.toFixed(2)}  victoires ${pct(c.win)}  (${c.n})`);
}
console.log('Camps visés, plateaux mixtes autorisés (bots libres) :');
for (const c of table(seats.filter((s) => s.style === 'libre').map((s) => ({ key: s.commitment, place: s.place })))) {
  console.log(`  ${c.id.padEnd(14)} place ${c.place.toFixed(2)}  victoires ${pct(c.win)}  (${c.n})`);
}
console.log('Héros :');
for (const h of table(seats.map((s) => ({ key: s.heroId, place: s.place })))) {
  const b = overrides[h.id]?.hpBonus ?? HEROES.find((x) => x.id === h.id)?.hpBonus ?? 0;
  console.log(`  ${h.id.padEnd(14)} place ${h.place.toFixed(2)}  victoires ${pct(h.win)}  bonus ${b}`);
}
const places = table(seats.map((s) => ({ key: s.style, place: s.place })));
console.log('Styles :', places.map((p) => `${p.id} ${p.place.toFixed(2)}`).join('  '));
