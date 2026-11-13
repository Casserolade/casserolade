import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { PARTY_CAMPS } from '../data/cards.ts';
import { SPELLS, SPELL_BY_ID } from '../data/sorts.ts';
import type { BotLevel } from '../bots/bots.ts';
import { createRng } from '../engine/rng.ts';
import { playGame } from './simulate.ts';

/**
 * La force de chaque sort de la boutique, mesurée comme celle des cartes (bilan_cartes.ts) : un bot le reçoit
 * gratuitement au début d'une manche, et sa place finale se compare à celle de la même partie sans lui. Le sort est
 * offert : son prix n'est pas compté, la colonne « par budget » le rapporte à ce qu'il coûte en boutique.
 *   node src/sim/bilan_sorts.ts --games 600 --manches 5,9
 *   node src/sim/bilan_sorts.ts --sorts primaire,remaniement --games 1000
 */
const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '400' },
    manches: { type: 'string', default: '5,9' },
    sorts: { type: 'string', default: '' },
    niveau: { type: 'string', default: 'moyen' },
    workers: { type: 'string', default: String(Math.max(1, availableParallelism() - 4)) },
    seed: { type: 'string', default: '1' },
  },
});

interface Job { spellId: string | null; round: number; game: number }
interface Outcome { job: Job; place: number; cast: boolean }
interface WorkerInput { jobs: Job[]; level: BotLevel; seed: number }

const SEATS = 8;
const settings: Omit<WorkerInput, 'jobs'> = isMainThread ? { level: values.niveau as BotLevel, seed: Number(values.seed) } : (workerData as WorkerInput);

function play(job: Job): Outcome {
  const seed = settings.seed + job.game * 7919;
  const activeCamps = createRng(seed).shuffle([...PARTY_CAMPS]).slice(0, 5);
  const result = playGame({
    seed, levels: Array(SEATS).fill(settings.level), activeCamps,
    ...(job.spellId ? { gift: { seat: 0, round: job.round, spellId: job.spellId } } : {}),
  });
  return { job, place: result.seats[0].place, cast: result.seats[0].giftPlayed ?? false };
}

if (!isMainThread) parentPort?.postMessage((workerData as WorkerInput).jobs.map(play));
else await main();

async function main(): Promise<void> {
  const games = Number(values.games);
  const rounds = values.manches.split(',').map(Number);
  const spells = values.sorts ? values.sorts.split(',').map((id) => SPELL_BY_ID[id]).filter(Boolean) : SPELLS.filter((s) => !s.token);
  const jobs: Job[] = [];
  for (const round of rounds) {
    for (let game = 0; game < games; game++) {
      jobs.push({ spellId: null, round, game });
      for (const spell of spells) jobs.push({ spellId: spell.id, round, game });
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
  const control = new Map(outcomes.filter((o) => !o.job.spellId).map((o) => [`${o.job.round}|${o.job.game}`, o.place]));
  console.log(`# Force des sorts : ${games} parties par mesure, bots ${settings.level}, ${((Date.now() - started) / 1000).toFixed(0)} s`);
  console.log('Gain de places du bot qui reçoit le sort, contre la même partie sans lui ; entre parenthèses, lancé dans sa manche ou la suivante.');
  console.log('  ' + 'sort'.padEnd(24) + 'éch. prix' + rounds.map((r) => `m${r}`.padStart(14)).join('') + '   par budget');
  const rows = spells.map((spell) => {
    const cells = rounds.map((round) => {
      const mine = outcomes.filter((o) => o.job.spellId === spell.id && o.job.round === round);
      const gain = mine.reduce((s, o) => s + (control.get(`${round}|${o.job.game}`) ?? o.place) - o.place, 0) / mine.length;
      return { gain, cast: mine.filter((o) => o.cast).length / mine.length };
    });
    return { spell, cells, best: Math.max(...cells.map((c) => c.gain)) };
  });
  rows.sort((a, b) => a.spell.tier - b.spell.tier || b.best - a.best);
  for (const { spell, cells, best } of rows) {
    const shown = cells.map((c) => `${c.gain >= 0 ? '+' : ''}${c.gain.toFixed(2)} (${Math.round(c.cast * 100)}%)`.padStart(14)).join('');
    console.log('  ' + spell.id.padEnd(24) + `${spell.tier}    ${spell.cost}   ` + shown + `   ${(best / Math.max(1, spell.cost)).toFixed(2)}`);
  }
}
