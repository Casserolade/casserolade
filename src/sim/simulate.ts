import { applyAction, createGame, resolveRound, viewFor } from '../engine/game.ts';
import type { Game, GameOptions } from '../engine/game.ts';
import type { Hero, Params } from '../engine/types.ts';
import { createBot, decide } from '../bots/bots.ts';
import type { BotLevel, BotState, BotStyle } from '../bots/bots.ts';
import { resolveCombat } from '../engine/combat.ts';
import { addMinionToHand, take } from '../engine/recruit.ts';
import { CASSEROLE_BY_ID } from '../data/casseroles.ts';
import { HEROES } from '../data/heroes.ts';

const MAX_ACTIONS_PER_TURN = 60;
const MAX_ROUNDS = 40;
/** Quasiment tout le monde est encore en vie : une casserole achetée avant reflète peu la survie. */
const EARLY_ROUND = 7;

export interface SeatResult {
  heroId: string;
  level: BotLevel;
  style: string;
  commitment: string | null;
  place: number;
  camp: string | null;
  campCount: number;
  boardSize: number;
  tier: number;
  casseroles: number;
  scandals: number;
  triples: number;
  rank6: number | null;
  /** Nombre d'actions par type : vérifie que le bot fait bien ce qu'on croit. */
  actions: Record<string, number>;
  /** La carte offerte (`RunOptions.gift`) a-t-elle été posée dans sa manche ou la suivante ? Vérifie que le bot la joue. */
  giftPlayed?: boolean;
}

export interface GameResult {
  rounds: number;
  context: string;
  camps: string[];
  seats: SeatResult[];
  combats: number;
  draws: number;
  evenCombats: number;
  evenFirstWins: number;
  initiativeTests: number;
  initiativeWins: number;
  rejected: number;
  truncated: boolean;
  casseroleCounts: Record<string, number>;
  earlyCasserolePlaces: Record<string, number[]>;
  cardsOnWinner: string[];
}

export interface RunOptions {
  seed: number;
  levels: BotLevel[];
  params?: Partial<Params>;
  contextId?: string;
  heroOverrides?: Record<string, Partial<Hero>>;
  heroes?: (string | undefined)[];
  styles?: (BotStyle | undefined)[];
  activeCamps?: GameOptions['activeCamps'];
  /** Mesure d'une carte (bilan_cartes.ts) : elle arrive gratuitement dans la main de ce siège, au début de cette manche. */
  gift?: { seat: number; round: number; cardId: string };
  /** Le camp que vise chaque bot dès le départ, au lieu d'un tirage. */
  commitments?: (string | undefined)[];
}

function dominant(game: Game, seat: number): { camp: string | null; count: number } {
  const counts = new Map<string, number>();
  for (const m of game.players[seat].board) {
    if (!m.token) counts.set(m.camp, (counts.get(m.camp) ?? 0) + 1);
  }
  let camp: string | null = null;
  let count = 0;
  for (const [c, n] of counts) {
    if (n > count) {
      camp = c;
      count = n;
    }
  }
  return { camp, count };
}

/**
 * Rejoue un combat à effectif égal en donnant l'initiative à chaque camp tour à tour.
 * Compare donc deux fois les mêmes plateaux : c'est la vraie mesure de l'avantage d'attaquer en premier.
 */
function initiativeEffect(game: Game, seatA: number, seatB: number): { tests: number; wins: number } {
  const boardOfA = game.players[seatB].seen[0]?.board;
  const boardOfB = game.players[seatA].seen[0]?.board;
  if (!boardOfA || !boardOfB || boardOfA.length !== boardOfB.length || boardOfA.length === 0) return { tests: 0, wins: 0 };
  const run = (hpA: number, hpB: number) =>
    resolveCombat(
      { minions: boardOfA, mods: game.players[seatA].hero.mods, hp: hpA, tier: game.players[seatA].tier },
      { minions: boardOfB, mods: game.players[seatB].hero.mods, hp: hpB, tier: game.players[seatB].tier },
      { params: game.params, ctx: game.ctx, rng: game.rng },
    );
  let tests = 0;
  let wins = 0;
  for (const r of [run(1, 2), run(2, 1)]) {
    if (r.winner === null) continue;
    tests++;
    if (r.winner === r.first) wins++;
  }
  return { tests, wins };
}

export function playGame(opts: RunOptions): GameResult {
  const gameOpts: GameOptions = {
    seed: opts.seed,
    seats: opts.levels.length,
    params: opts.params,
    contextId: opts.contextId,
    heroOverrides: opts.heroOverrides,
    heroes: opts.heroes,
    activeCamps: opts.activeCamps,
  };
  const game = createGame(gameOpts);
  const bots: BotState[] = opts.levels.map((lvl, i) => createBot(lvl, opts.seed * 31 + i + 1, opts.styles?.[i]));
  opts.commitments?.forEach((camp, i) => {
    if (camp) bots[i].commitment = camp;
  });

  let combats = 0;
  let draws = 0;
  let evenCombats = 0;
  let evenFirstWins = 0;
  let rejected = 0;
  let initiativeTests = 0;
  let initiativeWins = 0;
  const earlyCasseroles = new Map<number, Set<string>>();
  const rank6 = new Map<number, number>();
  const finalBoards = new Map<number, { camp: string | null; count: number; size: number; tier: number }>();
  const casseroleCounts: Record<string, number> = {};
  const actionCounts: Record<string, number>[] = bots.map(() => ({}));
  let giftPlayed = false;

  while (game.phase === 'recrutement' && game.round < MAX_ROUNDS) {
    const gift = opts.gift;
    if (gift && game.round === gift.round && game.players[gift.seat].alive) {
      take(game, gift.cardId);
      addMinionToHand(game, game.players[gift.seat], gift.cardId);
    }
    for (const p of game.players) {
      if (!p.alive) continue;
      const bot = bots[p.seat];
      for (let n = 0; n < MAX_ACTIONS_PER_TURN; n++) {
        const action = decide(viewFor(game, p.seat), bot);
        if (!action) break;
        if (action.t === 'buy_casserole' && p.casseroleOffer) {
          casseroleCounts[p.casseroleOffer] = (casseroleCounts[p.casseroleOffer] ?? 0) + 1;
          if (game.round <= EARLY_ROUND) {
            const set = earlyCasseroles.get(p.seat) ?? new Set<string>();
            set.add(p.casseroleOffer);
            earlyCasseroles.set(p.seat, set);
          }
        }
        const res = applyAction(game, p.seat, action);
        if (!res.ok) {
          rejected++;
          break;
        }
        actionCounts[p.seat][action.t] = (actionCounts[p.seat][action.t] ?? 0) + 1;
      }
    }

    if (gift && (game.round === gift.round || game.round === gift.round + 1)) {
      giftPlayed ||= game.players[gift.seat].board.some((m) => m.cardId === gift.cardId);
    }
    for (const p of game.players) {
      if (p.alive) {
        const d = dominant(game, p.seat);
        finalBoards.set(p.seat, { camp: d.camp, count: d.count, size: p.board.length, tier: p.tier });
      }
    }

    const round = game.round;
    resolveRound(game);
    for (const c of game.roundCombats) {
      combats++;
      if (c.result.winner === null) draws++;
      else if (c.evenBoards) {
        evenCombats++;
        if (c.result.winner === c.result.first) evenFirstWins++;
      }
      if (c.evenBoards && c.b >= 0) {
        const study = initiativeEffect(game, c.a, c.b);
        initiativeTests += study.tests;
        initiativeWins += study.wins;
      }
    }
    if (round === 6) {
      const snapshot = game.hpSnapshot.get(6);
      if (snapshot) {
        const order = snapshot.map((hp, seat) => ({ hp, seat })).sort((a, b) => b.hp - a.hp);
        order.forEach((o, i) => rank6.set(o.seat, i + 1));
      }
    }
  }

  const truncated = game.phase !== 'fini';
  if (truncated) {
    const alive = game.players.filter((p) => p.alive).sort((a, b) => b.hp - a.hp);
    alive.forEach((p, i) => {
      p.place = i + 1;
    });
  }

  const winner = game.players.find((p) => p.place === 1);
  const earlyCasserolePlaces: Record<string, number[]> = {};
  for (const [seat, ids] of earlyCasseroles) {
    for (const id of ids) (earlyCasserolePlaces[id] ??= []).push(game.players[seat].place);
  }
  return {
    rounds: game.round,
    context: game.ctx.id,
    camps: game.camps,
    combats,
    draws,
    evenCombats,
    evenFirstWins,
    initiativeTests,
    initiativeWins,
    rejected,
    truncated,
    casseroleCounts,
    earlyCasserolePlaces,
    cardsOnWinner: winner ? winner.board.filter((m) => !m.token).map((m) => m.cardId) : [],
    seats: game.players.map((p) => {
      const f = finalBoards.get(p.seat);
      return {
        heroId: p.hero.id,
        level: bots[p.seat].level,
        style: opts.styles?.[p.seat]?.pure ? 'pur' : opts.styles?.[p.seat]?.opportunist ? 'opportuniste' : 'libre',
        commitment: bots[p.seat].commitment,
        place: p.place,
        camp: f?.camp ?? null,
        campCount: f?.count ?? 0,
        boardSize: f?.size ?? 0,
        tier: f?.tier ?? 1,
        casseroles: p.stats.casseroles,
        scandals: p.stats.scandals,
        triples: p.stats.triples,
        rank6: rank6.get(p.seat) ?? null,
        actions: actionCounts[p.seat],
        ...(opts.gift?.seat === p.seat ? { giftPlayed } : {}),
      };
    }),
  };
}

export interface Report {
  games: number;
  avgRounds: number;
  truncated: number;
  rejected: number;
  drawRate: number;
  /** Mêmes plateaux joués dans les deux sens : l'avantage réel d'attaquer en premier. */
  initiativeWinRate: number;
  firstWinRateEven: number;
  evenCombats: number;
  rank6Spearman: number;
  monoWinnerShare: number;
  heroes: { id: string; avgPlace: number; winRate: number; n: number }[];
  camps: { id: string; avgPlace: number; winRate: number; n: number }[];
  levels: { id: string; avgPlace: number; winRate: number; n: number }[];
  styles: { id: string; avgPlace: number; winRate: number; n: number }[];
  casseroles: { id: string; bought: number; avgPlaceWith: number }[];
  avgCasserolesPerPlayer: number;
  scandalsPerGame: number;
  triplesPerPlayer: number;
  finalTier: number;
  cardsOnWinner: { id: string; n: number }[];
  contexts: { id: string; avgRounds: number; n: number }[];
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function spearman(pairs: [number, number][]): number {
  if (pairs.length < 2) return 0;
  const mx = mean(pairs.map((p) => p[0]));
  const my = mean(pairs.map((p) => p[1]));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

function groupStats(rows: { key: string | null; place: number }[]): { id: string; avgPlace: number; winRate: number; n: number }[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.key) continue;
    const g = groups.get(r.key) ?? [];
    g.push(r.place);
    groups.set(r.key, g);
  }
  return [...groups.entries()]
    .map(([id, places]) => ({
      id,
      avgPlace: mean(places),
      winRate: places.filter((p) => p === 1).length / places.length,
      n: places.length,
    }))
    .sort((a, b) => a.avgPlace - b.avgPlace);
}

export function buildReport(results: GameResult[]): Report {
  const seats = results.flatMap((r) => r.seats);
  const combats = results.reduce((s, r) => s + r.combats, 0);
  const evenCombats = results.reduce((s, r) => s + r.evenCombats, 0);
  const evenFirst = results.reduce((s, r) => s + r.evenFirstWins, 0);
  const winners = seats.filter((s) => s.place === 1);
  const mono = winners.filter((w) => w.boardSize > 0 && w.campCount >= Math.max(1, w.boardSize - 1));

  const casserolesBought: Record<string, number> = {};
  const earlyPlaces: Record<string, number[]> = {};
  for (const r of results) {
    for (const [id, n] of Object.entries(r.casseroleCounts)) casserolesBought[id] = (casserolesBought[id] ?? 0) + n;
    for (const [id, places] of Object.entries(r.earlyCasserolePlaces)) (earlyPlaces[id] ??= []).push(...places);
  }
  const initiativeTests = results.reduce((s, r) => s + r.initiativeTests, 0);
  const initiativeWins = results.reduce((s, r) => s + r.initiativeWins, 0);

  const onWinner: Record<string, number> = {};
  for (const r of results) for (const id of r.cardsOnWinner) onWinner[id] = (onWinner[id] ?? 0) + 1;

  const contexts = new Map<string, number[]>();
  for (const r of results) {
    const list = contexts.get(r.context) ?? [];
    list.push(r.rounds);
    contexts.set(r.context, list);
  }

  return {
    games: results.length,
    avgRounds: mean(results.map((r) => r.rounds)),
    truncated: results.filter((r) => r.truncated).length,
    rejected: results.reduce((s, r) => s + r.rejected, 0),
    drawRate: combats ? results.reduce((s, r) => s + r.draws, 0) / combats : 0,
    initiativeWinRate: initiativeTests ? initiativeWins / initiativeTests : 0,
    firstWinRateEven: evenCombats ? evenFirst / evenCombats : 0,
    evenCombats,
    rank6Spearman: spearman(seats.filter((s) => s.rank6 !== null).map((s) => [s.rank6 as number, s.place])),
    monoWinnerShare: winners.length ? mono.length / winners.length : 0,
    heroes: groupStats(seats.map((s) => ({ key: s.heroId, place: s.place }))),
    camps: groupStats(seats.filter((s) => s.campCount >= 3).map((s) => ({ key: s.camp, place: s.place }))),
    levels: groupStats(seats.map((s) => ({ key: s.level, place: s.place }))),
    styles: groupStats(seats.map((s) => ({ key: s.style, place: s.place }))),
    casseroles: Object.entries(casserolesBought)
      .map(([id, bought]) => ({ id, bought, avgPlaceWith: mean(earlyPlaces[id] ?? []) }))
      .sort((a, b) => a.avgPlaceWith - b.avgPlaceWith),
    avgCasserolesPerPlayer: mean(seats.map((s) => s.casseroles)),
    scandalsPerGame: seats.reduce((s, x) => s + x.scandals, 0) / Math.max(1, results.length),
    triplesPerPlayer: mean(seats.map((s) => s.triples)),
    finalTier: mean(seats.map((s) => s.tier)),
    cardsOnWinner: Object.entries(onWinner)
      .map(([id, n]) => ({ id, n }))
      .sort((a, b) => b.n - a.n),
    contexts: [...contexts.entries()].map(([id, rounds]) => ({ id, avgRounds: mean(rounds), n: rounds.length })),
  };
}

export function formatReport(r: Report): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
  const lines: string[] = [];
  lines.push(`Parties : ${r.games}  |  Manches : ${r.avgRounds.toFixed(1)}  |  Parties tronquées : ${r.truncated}  |  Actions refusées : ${r.rejected}`);
  lines.push(`Égalités : ${pct(r.drawRate)}  |  Avantage réel de l'initiative : ${pct(r.initiativeWinRate)}  |  1er attaquant observé à effectif égal : ${pct(r.firstWinRateEven)}`);
  lines.push(`Rang manche 6 / place finale : ${r.rank6Spearman.toFixed(2)}  |  Vainqueurs mono-camp : ${pct(r.monoWinnerShare)}  |  Échelon final : ${r.finalTier.toFixed(1)}`);
  lines.push(`Casseroles/joueur : ${r.avgCasserolesPerPlayer.toFixed(2)}  |  Scandales/partie : ${r.scandalsPerGame.toFixed(2)}  |  Triples/joueur : ${r.triplesPerPlayer.toFixed(2)}`);
  lines.push('');
  lines.push('Niveaux de bot :');
  for (const l of r.levels) lines.push(`  ${l.id.padEnd(12)} place ${l.avgPlace.toFixed(2)}  victoires ${pct(l.winRate)}  (${l.n})`);
  if (r.styles.length > 1) {
    lines.push('Styles :');
    for (const l of r.styles) lines.push(`  ${l.id.padEnd(12)} place ${l.avgPlace.toFixed(2)}  victoires ${pct(l.winRate)}  (${l.n})`);
  }
  lines.push('Héros :');
  for (const h of r.heroes) lines.push(`  ${h.id.padEnd(12)} place ${h.avgPlace.toFixed(2)}  victoires ${pct(h.winRate)}  (${h.n})`);
  lines.push('Camps (au moins 3 serviteurs en fin de partie) :');
  for (const c of r.camps) lines.push(`  ${c.id.padEnd(12)} place ${c.avgPlace.toFixed(2)}  victoires ${pct(c.winRate)}  (${c.n})`);
  lines.push('Casseroles (place moyenne si achetée avant la manche 8) :');
  for (const c of r.casseroles) lines.push(`  ${(CASSEROLE_BY_ID[c.id]?.name ?? c.id).padEnd(30)} place ${c.avgPlaceWith.toFixed(2)}  achats ${c.bought}`);
  lines.push('Cartes les plus présentes chez les vainqueurs :');
  for (const c of r.cardsOnWinner.slice(0, 8)) lines.push(`  ${c.id.padEnd(16)} ${c.n}`);
  return lines.join('\n');
}

export const ALL_HERO_IDS = HEROES.map((h) => h.id);
