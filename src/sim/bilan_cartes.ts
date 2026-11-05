import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import fs from 'node:fs';
import { CARDS, CARD_BY_ID, PARTY_CAMPS } from '../data/cards.ts';
import type { Camp } from '../engine/types.ts';
import type { BotLevel, BotStyle } from '../bots/bots.ts';
import { createRng } from '../engine/rng.ts';
import { playGame } from './simulate.ts';

/**
 * La force de chaque carte, mesurée par un cadeau : un bot la reçoit gratuitement au début d'une manche, et sa
 * place finale se compare à celle de la même partie, même graine, sans cadeau. Deux contextes :
 * - `seul` : le bot joue comme d'habitude, la carte doit valoir par elle-même ;
 * - `camp` : le bot vise le camp de la carte dès le départ, la carte peut valoir par ses synergies.
 * Le camp de la carte est toujours en jeu, puisqu'on ne la voit jamais autrement.
 *   node src/sim/bilan_cartes.ts --games 300 --manches 5,9
 *   node src/sim/bilan_cartes.ts --cartes ndiaye,macron --games 600
 */
const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '300' },
    manches: { type: 'string', default: '5,9' },
    contextes: { type: 'string', default: 'seul,camp' },
    cartes: { type: 'string', default: '' },
    niveau: { type: 'string', default: 'difficile' },
    workers: { type: 'string', default: String(Math.max(1, availableParallelism() - 4)) },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: '' },
  },
});

type Context = 'seul' | 'camp';
interface Job { cardId: string | null; camp: Camp; context: Context; round: number; game: number }
interface Outcome { job: Job; place: number; played: boolean }

const SEATS = 8;
/** A worker thread does not see the command line: its settings come with its jobs. */
interface WorkerInput { jobs: Job[]; level: BotLevel; seed: number }
const settings: Omit<WorkerInput, 'jobs'> = isMainThread
  ? { level: values.niveau as BotLevel, seed: Number(values.seed) }
  : (workerData as WorkerInput);
const level = settings.level;

/** The same table for a card and its control: camps, hero and bots come from the game's seed only. */
function setup(job: Job) {
  const seed = settings.seed + job.game * 7919;
  const others = createRng(seed).shuffle(PARTY_CAMPS.filter((c) => c !== job.camp)).slice(0, job.camp === 'civile' ? 5 : 4);
  const activeCamps = job.camp === 'civile' ? others : [job.camp, ...others];
  const styles: (BotStyle | undefined)[] = Array(SEATS).fill(undefined);
  const commitments: (string | undefined)[] = Array(SEATS).fill(undefined);
  if (job.context === 'camp' && job.camp !== 'civile') {
    styles[0] = { pure: true };
    commitments[0] = job.camp;
  }
  return { seed, levels: Array(SEATS).fill(level), activeCamps, styles, commitments };
}

function play(job: Job): Outcome {
  const result = playGame({ ...setup(job), ...(job.cardId ? { gift: { seat: 0, round: job.round, cardId: job.cardId } } : {}) });
  return { job, place: result.seats[0].place, played: result.seats[0].giftPlayed ?? false };
}

if (!isMainThread) {
  parentPort?.postMessage((workerData as WorkerInput).jobs.map(play));
} else {
  await main();
}

async function main(): Promise<void> {
  const games = Number(values.games);
  const rounds = values.manches.split(',').map(Number);
  const contexts = values.contextes.split(',') as Context[];
  const cards = values.cartes ? values.cartes.split(',').map((id) => CARD_BY_ID[id]).filter(Boolean) : CARDS;
  const camps = [...new Set(cards.map((c) => c.camp))];
  const jobs: Job[] = [];
  for (const context of contexts) {
    for (const round of rounds) {
      for (let game = 0; game < games; game++) {
        for (const camp of camps) jobs.push({ cardId: null, camp, context, round, game });
        for (const card of cards) jobs.push({ cardId: card.id, camp: card.camp, context, round, game });
      }
    }
  }
  const started = Date.now();
  const outcomes = await runAll(jobs, Number(values.workers));
  const rows = summarize(outcomes, cards.map((c) => c.id), contexts, rounds);
  print(rows, contexts, rounds, games, (Date.now() - started) / 1000);
  if (values.out) fs.writeFileSync(values.out, JSON.stringify(rows, null, 1));
}

function runAll(jobs: Job[], workers: number): Promise<Outcome[]> {
  const slices = Array.from({ length: workers }, (_, i) => jobs.filter((_, j) => j % workers === i));
  return Promise.all(slices.map((slice) => new Promise<Outcome[]>((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { ...settings, jobs: slice } satisfies WorkerInput });
    worker.once('message', resolve);
    worker.once('error', reject);
  }))).then((parts) => parts.flat());
}

interface Row { id: string; tier: number; camp: string; context: Context; round: number; delta: number; error: number; played: number }

/** Each card against the control of the same game: the gain in places, its standard error, and how often it was played. */
function summarize(outcomes: Outcome[], cardIds: string[], contexts: Context[], rounds: number[]): Row[] {
  const control = new Map<string, number>();
  for (const o of outcomes) if (!o.job.cardId) control.set(`${o.job.camp}|${o.job.context}|${o.job.round}|${o.job.game}`, o.place);
  const rows: Row[] = [];
  for (const id of cardIds) {
    const card = CARD_BY_ID[id];
    for (const context of contexts) {
      for (const round of rounds) {
        const mine = outcomes.filter((o) => o.job.cardId === id && o.job.context === context && o.job.round === round);
        const gains = mine.map((o) => (control.get(`${card.camp}|${context}|${round}|${o.job.game}`) ?? o.place) - o.place);
        const mean = gains.reduce((a, b) => a + b, 0) / gains.length;
        const variance = gains.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, gains.length - 1);
        rows.push({ id, tier: card.tier, camp: card.camp, context, round, delta: mean, error: Math.sqrt(variance / gains.length), played: mine.filter((o) => o.played).length / mine.length });
      }
    }
  }
  return rows;
}

function print(rows: Row[], contexts: Context[], rounds: number[], games: number, seconds: number): void {
  console.log(`# Force des cartes : ${games} parties par mesure, bots ${level}, ${seconds.toFixed(0)} s`);
  console.log('Gain de places du bot qui reçoit la carte, contre la même partie sans elle. Entre parenthèses : posée dans sa manche ou la suivante.');
  const columns = contexts.flatMap((context) => rounds.map((round) => ({ context, round })));
  for (const tier of [...new Set(rows.map((r) => r.tier))].sort()) {
    console.log(`\n## Échelon ${tier}`);
    console.log('  ' + 'carte'.padEnd(18) + 'camp'.padEnd(13) + columns.map((c) => `${c.context} m${c.round}`.padStart(16)).join(''));
    const ids = [...new Set(rows.filter((r) => r.tier === tier).map((r) => r.id))];
    const cell = (id: string, c: { context: Context; round: number }) => rows.find((r) => r.id === id && r.context === c.context && r.round === c.round);
    ids.sort((a, b) => (cell(b, columns[columns.length - 1])?.delta ?? 0) - (cell(a, columns[columns.length - 1])?.delta ?? 0));
    for (const id of ids) {
      console.log('  ' + id.padEnd(18) + CARD_BY_ID[id].camp.padEnd(13) + columns.map((c) => {
        const r = cell(id, c);
        return r ? `${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)} (${Math.round(r.played * 100)}%)`.padStart(16) : ''.padStart(16);
      }).join(''));
    }
    const average = (c: { context: Context; round: number }) => {
      const xs = rows.filter((r) => r.tier === tier && r.context === c.context && r.round === c.round).map((r) => r.delta);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    console.log('  ' + 'moyenne'.padEnd(31) + columns.map((c) => `${average(c) >= 0 ? '+' : ''}${average(c).toFixed(2)}`.padStart(16)).join(''));
  }
  const error = rows.reduce((a, r) => a + r.error, 0) / rows.length;
  console.log(`\nErreur type moyenne d'une mesure : ${error.toFixed(2)} place.`);
  printVerdict(rows, rounds[0]);
}

/**
 * La règle (5 novembre 2026) : une carte d'un échelon plus haut est plus forte que celles du
 * dessous, ou clé dans une synergie. Sa force est donc la meilleure de ses deux mesures, seule ou dans son camp.
 * Signalées : sous la moyenne de l'échelon d'en dessous, ou au-dessus de celle de l'échelon d'au-dessus.
 */
function printVerdict(rows: Row[], round: number): void {
  const force = new Map<string, number>();
  for (const r of rows.filter((x) => x.round === round)) force.set(r.id, Math.max(force.get(r.id) ?? -Infinity, r.delta));
  const tiers = [...new Set(rows.map((r) => r.tier))].sort();
  const mean = (tier: number) => {
    const xs = [...force].filter(([id]) => CARD_BY_ID[id].tier === tier).map(([, f]) => f);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  console.log(`\n## Bilan, manche ${round} : force = la meilleure mesure, seule ou dans son camp`);
  console.log('  ' + tiers.map((t) => `échelon ${t} : ${mean(t)?.toFixed(2)}`).join('   '));
  for (const tier of tiers) {
    const below = mean(tier - 1);
    const above = mean(tier + 1);
    const ids = [...force].filter(([id]) => CARD_BY_ID[id].tier === tier).sort((a, b) => a[1] - b[1]);
    const weak = below === null ? [] : ids.filter(([, f]) => f < below);
    const strong = above === null ? [] : ids.filter(([, f]) => f > above);
    if (weak.length) console.log(`  trop faibles à l'échelon ${tier} (< ${below?.toFixed(2)}) : ${weak.map(([id, f]) => `${id} ${f.toFixed(2)}`).join(', ')}`);
    if (strong.length) console.log(`  trop fortes à l'échelon ${tier} (> ${above?.toFixed(2)}) : ${strong.map(([id, f]) => `${id} ${f.toFixed(2)}`).join(', ')}`);
  }
}
