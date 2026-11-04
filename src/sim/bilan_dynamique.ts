/**
 * La dynamique d'une partie, mesurée sur ce qui fait la profondeur de Battlegrounds :
 * - le rythme : durée, éliminations, courbes de montée d'échelon, sondages ;
 * - l'économie : où va le budget, ce qui reste à la fin du recrutement ;
 * - la croissance des plateaux ;
 * - le hasard du combat : chaque combat réel est rejoué avec d'autres graines ;
 * - la valeur du placement : le même plateau, rangé autrement ;
 * - la boule de neige et les retours ;
 * - les cartes, sorts et casseroles achetés tôt par ceux qui gagnent.
 *
 *   node src/sim/bilan_dynamique.ts --games 300 --mode difficile [--replays 16] [--set startHp=30] [--json fichier]
 */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { applyAction, createGame, finishRound, startCombats, viewFor } from '../engine/game.ts';
import type { Game } from '../engine/game.ts';
import { resolveCombat } from '../engine/combat.ts';
import { createRng } from '../engine/rng.ts';
import type { Minion, Params } from '../engine/types.ts';
import { createBot, decide } from '../bots/bots.ts';
import type { BotLevel } from '../bots/bots.ts';

const MAX_ROUNDS = 40;
const MAX_ACTIONS = 60;
/** Achat « tôt » : avant que la survie ne biaise la mesure. */
const EARLY_ROUND = 7;
/**
 * Une part des combats de milieu et de fin de partie sert à mesurer le placement : le rangement réel et six
 * autres au hasard, rejoués chacun sur les mêmes graines. L'écart entre rangements se compare au bruit attendu.
 */
const POSITION_SAMPLE = 0.25;
const POSITION_ORDERS = 6;
const POSITION_REPLAYS = 48;
const LOBBIES: Record<string, BotLevel[]> = {
  facile: Array(8).fill('facile'),
  moyen: Array(8).fill('moyen'),
  difficile: Array(8).fill('difficile'),
  mixte: ['facile', 'facile', 'facile', 'moyen', 'moyen', 'moyen', 'difficile', 'difficile'],
};
const PHASES = [
  { id: 'début (manches 1 à 5)', from: 1, to: 5 },
  { id: 'milieu (6 à 10)', from: 6, to: 10 },
  { id: 'fin (11 et plus)', from: 11, to: 99 },
];

interface Snapshot {
  round: number;
  seat: number;
  hp: number;
  tier: number;
  stats: number;
  size: number;
  budgetStart: number;
  unspent: number;
}
interface Fight {
  round: number;
  /** Probabilité que A gagne, rejouée (une égalité compte une demie). */
  p: number;
  actual: 0 | 1 | null;
  statsA: number;
  statsB: number;
  damage: number;
  capped: boolean;
  /** Placement : écart type des chances entre rangements, bruit attendu, écart extrême, et rangement réel contre hasard. */
  spread?: number;
  noise?: number;
  range?: number;
  vsRandom?: number;
}
interface Purchase {
  kind: 'carte' | 'sort' | 'casserole' | 'decouverte';
  id: string;
  round: number;
  seat: number;
}
interface GameData {
  rounds: number;
  places: number[];
  eliminations: number[];
  snapshots: Snapshot[];
  fights: Fight[];
  results: Map<number, ('V' | 'D' | 'N')[]>;
  spend: Map<string, number>[];
  purchases: Purchase[];
  triples: number[];
  winnerBoard: string[];
}

const boardStats = (board: readonly Minion[]) => board.reduce((s, m) => s + m.atk + m.hp, 0);

/** La probabilité que A batte B, sur `replays` graines : chaque égalité compte une demie. */
function winChance(game: Game, seatA: number, seatB: number, boardA: Minion[], boardB: Minion[], replays: number, salt: number): number {
  const pa = game.players[seatA];
  const pb = game.players[seatB];
  let score = 0;
  for (let k = 0; k < replays; k++) {
    const r = resolveCombat(
      { minions: boardA, mods: pa.hero.mods, hp: pa.hp, tier: pa.tier, tract: pa.tract, campBuffs: pa.campBuffs },
      { minions: boardB, mods: pb.hero.mods, hp: pb.hp, tier: pb.tier, tract: pb.tract, campBuffs: pb.campBuffs },
      { params: game.params, ctx: game.ctx, rng: createRng(salt * 7919 + k * 104729 + 1) },
    );
    score += r.winner === 0 ? 1 : r.winner === null ? 0.5 : 0;
  }
  return score / replays;
}

function shuffled<T>(list: T[], rng: { next(): number }): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function playOne(seed: number, levels: BotLevel[], params: Partial<Params>, replays: number): GameData {
  const game = createGame({ seed, seats: levels.length, params });
  const bots = levels.map((level, i) => createBot(level, seed * 31 + i + 1));
  const sampler = createRng(seed * 13 + 5);
  const data: GameData = {
    rounds: 0, places: [], eliminations: [], snapshots: [], fights: [], results: new Map(), spend: [], purchases: [], triples: [], winnerBoard: [],
  };
  while (game.phase === 'recrutement' && game.round < MAX_ROUNDS) {
    const round = game.round;
    const spend = new Map<string, number>();
    for (const p of game.players) {
      if (!p.alive) continue;
      const budgetStart = p.budget;
      for (let n = 0; n < MAX_ACTIONS; n++) {
        const action = decide(viewFor(game, p.seat), bots[p.seat]);
        if (!action) break;
        const before = p.budget;
        const bought = action.t === 'buy' ? { kind: 'carte' as const, id: p.shop[action.slot] }
          : action.t === 'buy_spell' ? { kind: 'sort' as const, id: p.shopSpells[action.slot] }
            : action.t === 'buy_casserole' ? { kind: 'casserole' as const, id: p.casseroleOffer ?? '' }
              : action.t === 'discover' && p.discover ? { kind: 'decouverte' as const, id: p.discover.options[action.i] ?? '' } : null;
        if (!applyAction(game, p.seat, action).ok) break;
        spend.set(action.t, (spend.get(action.t) ?? 0) + before - p.budget);
        if (bought?.id) data.purchases.push({ ...bought, round, seat: p.seat });
      }
      data.snapshots.push({ round, seat: p.seat, hp: p.hp, tier: p.tier, stats: boardStats(p.board), size: p.board.length, budgetStart, unspent: p.budget });
    }
    data.spend.push(spend);
    const alive = game.players.filter((p) => p.alive).map((p) => p.seat);
    startCombats(game);
    for (const c of game.roundCombats) recordFight(game, data, c, round, replays, sampler);
    for (const seat of alive) if (!game.players[seat].alive) data.eliminations.push(round);
    finishRound(game);
  }
  data.rounds = game.round;
  const standing = game.players.filter((p) => p.alive).sort((a, b) => b.hp - a.hp);
  standing.forEach((p, i) => {
    p.place = i + 1;
  });
  data.places = game.players.map((p) => p.place);
  data.triples = game.players.map((p) => p.stats.triples);
  data.winnerBoard = game.players.find((p) => p.place === 1)?.board.filter((m) => !m.token).map((m) => m.cardId) ?? [];
  return data;
}

function recordFight(game: Game, data: GameData, c: Game['roundCombats'][number], round: number, replays: number, sampler: { next(): number }): void {
  const push = (seat: number, r: 'V' | 'D' | 'N') => data.results.set(seat, [...(data.results.get(seat) ?? []), r]);
  const won = c.result.winner;
  push(c.a, won === null ? 'N' : won === 0 ? 'V' : 'D');
  if (c.b < 0) return;
  push(c.b, won === null ? 'N' : won === 1 ? 'V' : 'D');
  // Les plateaux tels qu'ils ont combattu : chacun l'a vu chez l'autre, copié au moment du combat.
  const boardA = game.players[c.b].seen[0]?.board;
  const boardB = game.players[c.a].seen[0]?.board;
  if (!boardA || !boardB) return;
  const loser = won === 0 ? 1 : won === 1 ? 0 : null;
  const damage = loser === null ? 0 : c.damage[loser];
  // Le coup porté sans plafond : échelon du vainqueur, ses survivants, ses dégâts bonus (hors sondages perdus à la mort).
  const raw = loser === null ? 0
    : game.players[loser === 0 ? c.b : c.a].tier + c.result.survivors[1 - loser] * game.params.damagePerSurvivor + c.result.bonusDamage[1 - loser];
  const fight: Fight = {
    round, actual: won, statsA: boardStats(boardA), statsB: boardStats(boardB), damage,
    capped: loser !== null && damage - c.result.deathPenalty[loser] < raw,
    p: winChance(game, c.a, c.b, boardA, boardB, replays, round * 101 + c.a),
  };
  if (round >= 6 && boardA.length >= 3 && sampler.next() < POSITION_SAMPLE) {
    const orders = [boardA, ...Array.from({ length: POSITION_ORDERS }, () => shuffled(boardA, sampler))];
    const chances = orders.map((board) => winChance(game, c.a, c.b, board, boardB, POSITION_REPLAYS, round * 101 + c.a));
    const average = mean(chances);
    fight.spread = Math.sqrt(mean(chances.map((x) => (x - average) ** 2)));
    fight.noise = Math.sqrt((average * (1 - average)) / POSITION_REPLAYS);
    fight.range = Math.max(...chances) - Math.min(...chances);
    fight.vsRandom = chances[0] - mean(chances.slice(1));
  }
  data.fights.push(fight);
}

// Les statistiques.

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}
function spearman(pairs: [number, number][]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(xs.length);
    order.forEach(([, i], k) => {
      r[i] = k;
    });
    return r;
  };
  const rx = rank(pairs.map((p) => p[0]));
  const ry = rank(pairs.map((p) => p[1]));
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < pairs.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const pct = (x: number) => `${Math.round(x * 100)} %`;

function report(games: GameData[]): string[] {
  const out: string[] = [];
  const all = games.flatMap((g, gi) => g.snapshots.map((s) => ({ ...s, place: g.places[s.seat], game: gi })));
  const roundsSeen = [...new Set(all.map((s) => s.round))].sort((a, b) => a - b).filter((r) => r <= 16);

  out.push('## Le rythme');
  const firstOut = games.map((g) => Math.min(...g.eliminations));
  const fourLeft = games.map((g) => [...g.eliminations].sort((a, b) => a - b)[3] ?? g.rounds);
  out.push(`Manches par partie : moyenne ${f1(mean(games.map((g) => g.rounds)))}, médiane ${quantile(games.map((g) => g.rounds), 0.5)}, de ${quantile(games.map((g) => g.rounds), 0.05)} à ${quantile(games.map((g) => g.rounds), 0.95)} (5 à 95 %)`);
  out.push(`Première élimination : manche ${quantile(firstOut, 0.5)} (médiane). Il en reste quatre à la manche ${quantile(fourLeft, 0.5)}.`);
  out.push('Échelon atteint (médiane de la manche où il est atteint, ceux qui l\'atteignent) :');
  for (const group of [{ id: 'tous', keep: () => true }, { id: '1ers', keep: (p: number) => p === 1 }, { id: '5e à 8e', keep: (p: number) => p >= 5 }]) {
    const cells = [2, 3, 4, 5, 6].map((tier) => {
      const reached = new Map<string, number>();
      for (const s of all) if (group.keep(s.place) && s.tier >= tier && !reached.has(`${s.game}:${s.seat}`)) reached.set(`${s.game}:${s.seat}`, s.round);
      const players = new Set(all.filter((s) => group.keep(s.place)).map((s) => `${s.game}:${s.seat}`)).size;
      return `${tier} : ${reached.size ? quantile([...reached.values()], 0.5) : '–'} (${pct(reached.size / Math.max(1, players))})`;
    });
    out.push(`  ${group.id.padEnd(8)} ${cells.join('  ')}`);
  }
  out.push('Sondages avant le combat (médiane) selon la place finale :');
  out.push(`  manche   ${roundsSeen.map((r) => String(r).padStart(4)).join('')}`);
  for (const place of [1, 2, 4, 6, 8]) {
    out.push(`  ${`${place}e`.padEnd(8)} ${roundsSeen.map((r) => String(quantile(all.filter((s) => s.round === r && s.place === place).map((s) => s.hp), 0.5)).padStart(4)).join('')}`);
  }

  out.push('', '## L\'économie');
  out.push('Budget par joueur et par manche (moyennes) : disponible, dépensé par usage, perdu');
  out.push('  manche  dispo  achats  actual.  échelon  sorts  casser.  vente  perdu');
  for (const r of roundsSeen.slice(0, 14)) {
    const snaps = all.filter((s) => s.round === r);
    const n = Math.max(1, snaps.length);
    const spent = (t: string) => games.reduce((s, g) => s + (g.spend[r - 1]?.get(t) ?? 0), 0) / n;
    out.push(`  ${String(r).padStart(6)} ${f1(mean(snaps.map((s) => s.budgetStart))).padStart(6)} ${f1(spent('buy')).padStart(7)} ${f1(spent('roll')).padStart(8)} ${f1(spent('upgrade')).padStart(8)} ${f1(spent('buy_spell')).padStart(6)} ${f1(spent('buy_casserole')).padStart(8)} ${f1(spent('sell')).padStart(6)} ${f1(mean(snaps.map((s) => s.unspent))).padStart(6)}`);
  }

  out.push('', '## Les plateaux');
  out.push('Somme des stats du plateau avant le combat (médiane ; 1ers ; 90e centile) et nombre de politiques :');
  for (const r of roundsSeen) {
    const snaps = all.filter((s) => s.round === r);
    out.push(`  manche ${String(r).padStart(2)} : ${String(quantile(snaps.map((s) => s.stats), 0.5)).padStart(4)} ; ${String(quantile(snaps.filter((s) => s.place === 1).map((s) => s.stats), 0.5)).padStart(4)} ; ${String(quantile(snaps.map((s) => s.stats), 0.9)).padStart(4)}   ${f1(mean(snaps.map((s) => s.size)))} politiques`);
  }

  out.push('', '## Le combat : hasard, favori, placement');
  const fights = games.flatMap((g) => g.fights);
  for (const phase of PHASES) {
    const fs = fights.filter((f) => f.round >= phase.from && f.round <= phase.to);
    if (fs.length === 0) continue;
    const decided = fs.filter((f) => f.actual !== null);
    const favorite = decided.filter((f) => f.p !== 0.5);
    const upsets = favorite.filter((f) => (f.p > 0.5 ? f.actual === 1 : f.actual === 0)).length;
    const bigger = decided.filter((f) => f.statsA !== f.statsB);
    const biggerWins = bigger.filter((f) => (f.statsA > f.statsB ? f.actual === 0 : f.actual === 1)).length;
    const losses = fs.filter((f) => f.actual !== null);
    out.push(`${phase.id} : ${fs.length} combats, ${pct(1 - decided.length / fs.length)} d'égalités`);
    out.push(`  joué d'avance (le favori gagne 9 fois sur 10 ou plus) : ${pct(fs.filter((f) => Math.abs(f.p - 0.5) >= 0.4).length / fs.length)} ; pile ou face (35 à 65 %) : ${pct(fs.filter((f) => Math.abs(f.p - 0.5) <= 0.15).length / fs.length)}`);
    out.push(`  le favori perd : ${pct(upsets / Math.max(1, favorite.length))} ; le plus gros plateau gagne : ${pct(biggerWins / Math.max(1, bigger.length))}`);
    out.push(`  dégâts du perdant : ${f1(mean(losses.map((f) => f.damage)))} en moyenne, plafonnés ${pct(losses.filter((f) => f.capped).length / Math.max(1, losses.length))}`);
    const placed = fs.filter((f) => f.spread !== undefined);
    if (placed.length) {
      const spread = mean(placed.map((f) => f.spread as number)) * 100;
      const noise = mean(placed.map((f) => f.noise as number)) * 100;
      out.push(`  placement (${placed.length} combats, ${POSITION_ORDERS + 1} rangements, ${POSITION_REPLAYS} rejeux) : écart type entre rangements ${f1(spread)} points, dont bruit ${f1(noise)} ; un rangement change l'issue de 25 points ou plus dans ${pct(placed.filter((f) => (f.range as number) >= 0.25).length / placed.length)} des combats ; le rangement des bots vaut ${f1(mean(placed.map((f) => f.vsRandom as number)) * 100)} points de plus que le hasard`);
    }
  }

  out.push('', '## Boule de neige et retours');
  let ww = 0;
  let w = 0;
  let lw = 0;
  let l = 0;
  for (const g of games) {
    for (const seq of g.results.values()) {
      for (let i = 0; i + 1 < seq.length; i++) {
        if (seq[i] === 'N' || seq[i + 1] === 'N') continue;
        if (seq[i] === 'V') {
          w++;
          if (seq[i + 1] === 'V') ww++;
        } else {
          l++;
          if (seq[i + 1] === 'V') lw++;
        }
      }
    }
  }
  out.push(`Gagner la manche suivante : ${pct(ww / Math.max(1, w))} après une victoire, ${pct(lw / Math.max(1, l))} après une défaite`);
  for (const r of [5, 8]) {
    const at = all.filter((s) => s.round === r);
    const byGame = new Map<number, typeof at>();
    for (const s of at) byGame.set(s.game, [...(byGame.get(s.game) ?? []), s]);
    let last = 0;
    let lastTop4 = 0;
    const hpPairs: [number, number][] = [];
    const statPairs: [number, number][] = [];
    for (const list of byGame.values()) {
      const sorted = [...list].sort((a, b) => a.hp - b.hp);
      for (const s of sorted.slice(0, 2)) {
        last++;
        if (s.place <= 4) lastTop4++;
      }
      for (const s of list) {
        hpPairs.push([-s.hp, s.place]);
        statPairs.push([-s.stats, s.place]);
      }
    }
    out.push(`Manche ${r} : les deux plus bas en sondages finissent dans les quatre premiers ${pct(lastTop4 / Math.max(1, last))} du temps (le hasard : 50 %). Corrélation avec la place : sondages ${f2(spearman(hpPairs))}, stats du plateau ${f2(spearman(statPairs))}`);
  }

  out.push('', '## Triples et achats');
  const players = games.length * (games[0]?.places.length ?? 8);
  out.push(`Triples par joueur : ${f2(games.reduce((s, g) => s + g.triples.reduce((a, b) => a + b, 0), 0) / Math.max(1, players))} ; vainqueurs : ${f2(mean(games.map((g) => g.triples[g.places.indexOf(1)] ?? 0)))}`);
  for (const kind of ['carte', 'sort', 'casserole', 'decouverte'] as const) {
    const buys = games.flatMap((g) => g.purchases.filter((p) => p.kind === kind).map((p) => ({ ...p, place: g.places[p.seat] })));
    out.push(`${kind} : ${f1(buys.length / Math.max(1, players))} par joueur`);
  }
  return out;
}

/** Les cartes, sorts et casseroles achetés tôt : place moyenne de l'acheteur, à au moins `min` achats. */
function purchaseTable(games: GameData[], kind: Purchase['kind'], min: number): string[] {
  const byId = new Map<string, number[]>();
  for (const g of games) {
    const seen = new Set<string>();
    for (const p of g.purchases) {
      if (p.kind !== kind || p.round > EARLY_ROUND || seen.has(`${p.seat}:${p.id}`)) continue;
      seen.add(`${p.seat}:${p.id}`);
      byId.set(p.id, [...(byId.get(p.id) ?? []), g.places[p.seat]]);
    }
  }
  const rows = [...byId.entries()].filter(([, places]) => places.length >= min).map(([id, places]) => ({ id, n: places.length, place: mean(places) })).sort((a, b) => a.place - b.place);
  const line = (r: { id: string; n: number; place: number }) => `  ${r.id.padEnd(24)} ${f2(r.place)}  (${r.n})`;
  const head = `${kind}s achetés avant la manche ${EARLY_ROUND + 1}, place moyenne de l'acheteur (au moins ${min} achats ; ${rows.length} retenus) :`;
  if (rows.length <= 16) return [head, ...rows.map(line)];
  return [head, '  les meilleurs', ...rows.slice(0, 8).map(line), '  les pires', ...rows.slice(-8).map(line)];
}

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '300' },
    seed: { type: 'string', default: '1' },
    mode: { type: 'string', default: 'difficile' },
    replays: { type: 'string', default: '16' },
    set: { type: 'string', multiple: true, default: [] },
    json: { type: 'string' },
  },
});
const levels = LOBBIES[values.mode];
if (!levels) throw new Error(`Mode inconnu : ${values.mode}`);
const params: Partial<Params> = {};
for (const entry of values.set) {
  // Un nombre, ou une valeur JSON pour les règles en tableau : --set 'damageCaps=[[1,5],[4,8],[8,15]]'.
  const [key, value] = [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)];
  (params as Record<string, unknown>)[key] = /^[[{]/.test(value) ? JSON.parse(value) : Number(value);
}
const start = Date.now();
const games: GameData[] = [];
for (let i = 0; i < Number(values.games); i++) games.push(playOne(Number(values.seed) + i * 7919, levels, params, Number(values.replays)));
const minBuys = Math.max(10, Math.round(games.length / 10));
const lines = [
  `# Dynamique de partie : ${games.length} parties, bots ${values.mode}, ${values.replays} rejeux par combat${values.set.length ? `, ${values.set.join(' ')}` : ''} (${((Date.now() - start) / 1000).toFixed(0)} s)`,
  '',
  ...report(games),
  '',
  ...purchaseTable(games, 'carte', minBuys),
  ...purchaseTable(games, 'sort', minBuys),
  ...purchaseTable(games, 'casserole', minBuys),
];
console.log(lines.join('\n'));
if (values.json) writeFileSync(values.json, JSON.stringify(games.map((g) => ({ ...g, results: Object.fromEntries(g.results), spend: g.spend.map((s) => Object.fromEntries(s)) }))));
