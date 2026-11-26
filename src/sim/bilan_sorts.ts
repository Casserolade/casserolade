import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { PARTY_CAMPS } from '../data/cards.ts';
import { SPELLS, SPELL_BY_ID } from '../data/sorts.ts';
import { CASSEROLES, CASSEROLE_BY_ID } from '../data/casseroles.ts';
import type { BotLevel } from '../bots/bots.ts';
import { createRng } from '../engine/rng.ts';
import { playGame } from './simulate.ts';

/**
 * La force de chaque sort de la boutique, mesurée comme celle des cartes (bilan_cartes.ts) : un bot le reçoit
 * gratuitement au début d'une manche, et sa place finale se compare à celle de la même partie sans lui. Le sort est
 * offert : son prix n'est pas compté, la colonne « par budget » le rapporte à ce qu'il coûte en boutique.
 * Avec --casseroles, la même mesure pour chaque casserole (une casserole se lance comme un sort) ; la colonne donne leur
 * genre et leur grade, et elles sont rangées par grade, puis par prix.
 *   node src/sim/bilan_sorts.ts --games 600 --manches 5,9
 *   node src/sim/bilan_sorts.ts --sorts primaire,remaniement --games 1000
 *   node src/sim/bilan_sorts.ts --casseroles --games 400 --manches 4,8,12
 */
const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '400' },
    manches: { type: 'string', default: '5,9' },
    sorts: { type: 'string', default: '' },
    casseroles: { type: 'boolean', default: false },
    niveau: { type: 'string', default: 'moyen' },
    workers: { type: 'string', default: String(Math.max(1, availableParallelism() - 4)) },
    seed: { type: 'string', default: '1' },
  },
});

interface Job { id: string | null; round: number; game: number }
interface Outcome { job: Job; place: number; cast: boolean }
interface WorkerInput { jobs: Job[]; level: BotLevel; seed: number; casseroles: boolean }
/** Ce qui se mesure : un sort, ou une casserole (`tier` donne alors son genre). */
interface Item { id: string; tier: number | string; cost: number; grade?: number }

const SEATS = 8;
const settings: Omit<WorkerInput, 'jobs'> = isMainThread
  ? { level: values.niveau as BotLevel, seed: Number(values.seed), casseroles: values.casseroles }
  : (workerData as WorkerInput);

function play(job: Job): Outcome {
  const seed = settings.seed + job.game * 7919;
  const activeCamps = createRng(seed).shuffle([...PARTY_CAMPS]).slice(0, 5);
  const result = playGame({
    seed, levels: Array(SEATS).fill(settings.level), activeCamps,
    ...(job.id ? { gift: { seat: 0, round: job.round, ...(settings.casseroles ? { casseroleId: job.id } : { spellId: job.id }) } } : {}),
  });
  return { job, place: result.seats[0].place, cast: result.seats[0].giftPlayed ?? false };
}

if (!isMainThread) parentPort?.postMessage((workerData as WorkerInput).jobs.map(play));
else await main();

async function main(): Promise<void> {
  const games = Number(values.games);
  const rounds = values.manches.split(',').map(Number);
  const asked = values.sorts ? values.sorts.split(',') : null;
  const items: Item[] = values.casseroles
    ? (asked ? asked.map((id) => CASSEROLE_BY_ID[id]).filter(Boolean) : CASSEROLES).map((c) => ({ id: c.id, tier: `${c.kind === 'affaire' ? 'aff' : 'rid'} ${c.echelon}`, cost: c.cost, grade: c.echelon }))
    : (asked ? asked.map((id) => SPELL_BY_ID[id]).filter(Boolean) : SPELLS.filter((s) => !s.token)).map((s) => ({ id: s.id, tier: s.tier, cost: s.cost }));
  const jobs: Job[] = [];
  for (const round of rounds) {
    for (let game = 0; game < games; game++) {
      jobs.push({ id: null, round, game });
      for (const item of items) jobs.push({ id: item.id, round, game });
    }
  }
  const started = Date.now();
  const workers = Number(values.workers);
  const slices = Array.from({ length: workers }, (_, i) => jobs.filter((_, j) => j % workers === i));
  const outcomes = (await Promise.all(slices.map((slice) => new Promise<Outcome[]>((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { ...settings, jobs: slice } satisfies WorkerInput });
    worker.once('message', resolve);
    worker.once('error', reject);
  })))).flat();
  const control = new Map(outcomes.filter((o) => !o.job.id).map((o) => [`${o.job.round}|${o.job.game}`, o.place]));
  const what = values.casseroles ? 'casserole' : 'sort';
  console.log(`# Force des ${what}s : ${games} parties par mesure, bots ${settings.level}, ${((Date.now() - started) / 1000).toFixed(0)} s`);
  console.log(`Gain de places du bot qui reçoit ${values.casseroles ? 'la' : 'le'} ${what}, contre la même partie sans lui ; entre parenthèses, lancé dans sa manche ou la suivante.`);
  console.log('  ' + what.padEnd(24) + (values.casseroles ? 'genre prix' : 'éch. prix') + rounds.map((r) => `m${r}`.padStart(14)).join('') + '   par budget');
  const byJob = new Map<string, Outcome[]>();
  for (const o of outcomes) {
    if (!o.job.id) continue;
    const key = `${o.job.id}|${o.job.round}`;
    byJob.set(key, [...(byJob.get(key) ?? []), o]);
  }
  const rows = items.map((item) => {
    const cells = rounds.map((round) => {
      const mine = byJob.get(`${item.id}|${round}`) ?? [];
      const gain = mine.reduce((s, o) => s + (control.get(`${round}|${o.job.game}`) ?? o.place) - o.place, 0) / Math.max(1, mine.length);
      return { gain, cast: mine.filter((o) => o.cast).length / Math.max(1, mine.length) };
    });
    return { item, cells, best: Math.max(...cells.map((c) => c.gain)) };
  });
  rows.sort((a, b) => (values.casseroles ? (a.item.grade ?? 0) - (b.item.grade ?? 0) || a.item.cost - b.item.cost : Number(a.item.tier) - Number(b.item.tier)) || b.best - a.best);
  for (const { item, cells, best } of rows) {
    const shown = cells.map((c) => `${c.gain >= 0 ? '+' : ''}${c.gain.toFixed(2)} (${Math.round(c.cast * 100)}%)`.padStart(14)).join('');
    console.log('  ' + item.id.padEnd(24) + `${String(item.tier).padEnd(5)}${item.cost}   ` + shown + `   ${(best / Math.max(1, item.cost)).toFixed(2)}`);
  }
}
