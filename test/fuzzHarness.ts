import assert from 'node:assert/strict';
import { applyAction, chooseRemainingHeroes, combatViewFor, createGame, finishRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game, GameOptions, Player } from '../src/engine/game.ts';
import { applyCombatEvent } from '../src/engine/replay.ts';
import type { CombatSides } from '../src/engine/replay.ts';
import { addMinionToHand, boardLimit, returnToPool, take } from '../src/engine/recruit.ts';
import { census, invariantViolations } from '../src/engine/invariants.ts';
import { createRng } from '../src/engine/rng.ts';
import type { Camp, CombatEvent, Effect, Keyword, Minion, Params, PlayerAction, Rng } from '../src/engine/types.ts';
import { createBot, decide } from '../src/bots/bots.ts';
import type { BotLevel, BotState } from '../src/bots/bots.ts';
import { CARDS, CARD_BY_ID, PARTY_CAMPS, TOKENS } from '../src/data/cards.ts';
import { CASSEROLES, CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { CONTEXTS, HEROES } from '../src/data/heroes.ts';
import { SPELLS, SPELL_BY_ID } from '../src/data/sorts.ts';

/**
 * Le banc du fuzz (test/fuzz.test.ts) : des parties à graine où des sièges jouent n'importe quoi
 * (cibles, uids et places valides ou non) à côté de bots, avec des cartes, sorts et casseroles
 * forcés en boutique et en main. Après chaque action et chaque manche, on vérifie les invariants :
 * refus sans effet, budget, tailles, exemplaires, uids, scandale et oubli, fusions, combat rejoué,
 * vue sans fuite, fin de partie.
 *
 * Par défaut, la suite reste courte. Pour la nuit : FUZZ_GAMES=2000 node --test test/fuzz.test.ts
 * (FUZZ_SEED décale les graines).
 */
export const MAX_ROUNDS = 45;
const KEYWORDS: Keyword[] = ['immunite', 'porte_parole', 'cumul', 'polemique', 'retour', 'ni_droite_ni_gauche', 'ralliement', 'vedette'];
const VIEW_KEYS = [
  'seat', 'round', 'phase', 'plateau', 'animateur', 'heroOffers', 'alive', 'place', 'hp', 'tier', 'budget', 'maxBudget', 'nextBudget', 'upgradeCost', 'buyCost',
  'rollCost', 'freeRolls', 'boardLimit', 'scandalThreshold', 'heroId', 'mods', 'board', 'hand', 'spells', 'handLimit', 'shop', 'shopGains',
  'shopSpells', 'shopSpellCosts', 'frozen', 'casseroleOffer', 'casseroleCost', 'discover', 'discoverKind', 'tract', 'counters', 'stats', 'camps',
  'contextId', 'params', 'seen', 'table',
].sort();
const TABLE_KEYS = ['seat', 'heroId', 'hp', 'tier', 'alive', 'boardSize', 'place', 'triples'].sort();

/** Ce que le fuzz a fait passer par le moteur, toutes parties confondues. */
export interface Coverage {
  played: Set<string>;
  cast: Set<string>;
  casseroles: Set<string>;
  bought: Set<string>;
  combatCaps: number;
  combats: number;
  botRefusals: string[];
  stalls: string[];
  /** Combien de fois chaque situation délicate s'est produite : le fuzz la vérifie-t-il vraiment ? */
  events: Record<string, number>;
}

export function newCoverage(): Coverage {
  return { played: new Set(), cast: new Set(), casseroles: new Set(), bought: new Set(), combatCaps: 0, combats: 0, botRefusals: [], stalls: [], events: {} };
}

// L'état, pour comparer.

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return [...value.entries()];
  if (value instanceof Set) return [...value];
  return value;
}

function snapshotPlayer(game: Game, p: Player, rngCalls: number): string {
  return JSON.stringify([p, [...game.pool], game.nextUid, game.phase, game.round, rngCalls], replacer);
}

function snapshotGame(game: Game): string {
  const { rng: _rng, ...rest } = game;
  return JSON.stringify(rest, replacer);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Compte chaque tirage : une action refusée ne doit pas en consommer. */
function countingRng(base: Rng): { rng: Rng; calls: () => number } {
  let n = 0;
  return {
    calls: () => n,
    rng: {
      next: () => (n++, base.next()),
      int: (k) => (n++, base.int(k)),
      pick: (a) => (n++, base.pick(a)),
      shuffle: (a) => (n++, base.shuffle(a)),
    },
  };
}

// Les invariants.

/** Tous les exemplaires de la partie, où qu'ils soient. Les copies simples et les jetons n'en sont pas. */
export { census };

/**
 * Les invariants du moteur (src/engine/invariants.ts), la même source de vérité que le serveur en direct,
 * plus les exemplaires comptés au début de ce test : ni créés ni perdus depuis.
 */
export function checkGame(game: Game, total: Map<string, number>, where: string): void {
  assert.deepEqual(invariantViolations(game), [], where);
  const now = census(game);
  for (const [id, n] of total) assert.equal(now.get(id) ?? 0, n, `${where} : exemplaires de ${id}`);
}

/** Les casseroles ne se perdent ni ne se dupliquent : une fusion garde celles des trois, à l'unité. */
type Before = Map<number, { cardId: string; golden: boolean; casseroles: string[]; oublie: number; charges: number; inHand: boolean }>;

function beforeOf(p: Player): Before {
  const out: Before = new Map();
  for (const m of p.board) out.set(m.uid, { cardId: m.cardId, golden: m.golden, casseroles: [...m.casseroles], oublie: m.oublie, charges: m.charges, inHand: false });
  for (const m of p.hand) out.set(m.uid, { cardId: m.cardId, golden: m.golden, casseroles: [...m.casseroles], oublie: m.oublie, charges: m.charges, inHand: true });
  return out;
}

function sorted(a: string[]): string[] {
  return [...a].sort();
}

function bump(cov: Coverage, event: string): void {
  cov.events[event] = (cov.events[event] ?? 0) + 1;
}

function checkCasserolesKept(p: Player, before: Before, a: PlayerAction, where: string, cov: Coverage, posed?: string): void {
  // La casserole posée par cette action compte déjà pour sa cible : Je traverse la rue peut finir un triple.
  if (posed && a.t === 'cast' && a.target !== undefined) {
    const t = before.get(a.target);
    const c = CASSEROLE_BY_ID[posed];
    if (t) {
      t.casseroles = [...t.casseroles, posed];
      if (c.forgetsAll) {
        t.oublie = t.casseroles.length;
        t.charges = 0;
      } else t.charges += c.charges ?? 1;
    }
  }
  const now = new Map([...p.board, ...p.hand].map((m) => [m.uid, m]));
  const gone = [...before.entries()].filter(([uid]) => !now.has(uid));
  const fused = new Set<number>();
  for (const m of now.values()) {
    const was = before.get(m.uid);
    if (!m.golden || m.copies !== 3 || (was && was.golden)) continue;
    const parts = [...(was ? [was] : []), ...gone.filter(([, g]) => g.cardId === m.cardId && !g.golden).map(([uid, g]) => (fused.add(uid), g))];
    bump(cov, 'fusion');
    if (parts.some((x) => x.casseroles.length > 0)) bump(cov, 'fusion avec casseroles');
    if (m.scandal) bump(cov, 'fusion en scandale');
    assert.deepEqual(sorted(m.casseroles), sorted(parts.flatMap((x) => x.casseroles)), `${where} : le doré ${m.name} perd ou double des casseroles`);
    assert.equal(m.oublie, parts.reduce((s, x) => s + x.oublie, 0), `${where} : le doré ${m.name} change ses oublis`);
    assert.equal(m.charges, parts.reduce((s, x) => s + x.charges, 0), `${where} : le doré ${m.name} change ses charges`);
  }
  // Un Ralliement apporte ses casseroles à son hôte.
  if (a.t === 'play' && a.onto !== undefined && gone.some(([uid]) => uid === a.uid)) {
    const host = now.get(a.onto);
    const was = before.get(a.onto);
    const rallied = before.get(a.uid);
    if (host && was && rallied && !fused.has(a.onto)) {
      assert.deepEqual(sorted(host.casseroles), sorted([...was.casseroles, ...rallied.casseroles]), `${where} : le Ralliement perd des casseroles`);
      assert.equal(host.oublie, was.oublie + rallied.oublie, `${where} : le Ralliement change les oublis`);
      fused.add(a.uid);
      if (rallied.casseroles.length > 0) bump(cov, 'ralliement avec casseroles');
    }
  }
  for (const [uid, g] of gone) {
    if (fused.has(uid) || g.casseroles.length === 0) continue;
    const sold = a.t === 'sell' && a.uid === uid;
    // Primaire, Hidalgo (y compris achetée et posée d'un coup), une Annonce relancée : il est détruit.
    const destroyed = !g.inHand && (a.t === 'cast' || a.t === 'play' || a.t === 'buy');
    assert.ok(sold || destroyed, `${where} : ${g.cardId} #${uid} disparaît avec ses casseroles ${g.casseroles} après ${JSON.stringify(a)}`);
  }
}

// La vue.

/** Abîme tout ce que la vue contient : si la partie change, la vue partageait un objet avec elle. */
function vandalize(x: unknown, depth = 0): void {
  if (depth > 8 || x === null || typeof x !== 'object') return;
  if (Array.isArray(x)) {
    for (const v of x) vandalize(v, depth + 1);
    x.push('vandale');
    return;
  }
  for (const [k, v] of Object.entries(x)) {
    if (typeof v === 'number') (x as Record<string, unknown>)[k] = v + 1000;
    else vandalize(v, depth + 1);
  }
  (x as Record<string, unknown>).vandale = true;
}

function checkView(game: Game, seat: number, where: string, mutate: boolean): void {
  const p = game.players[seat];
  const view = viewFor(game, seat);
  const at = `${where} · vue ${seat}`;
  assert.deepEqual(Object.keys(view).sort(), VIEW_KEYS, `${at} : champs de la vue`);
  for (const row of view.table) assert.deepEqual(Object.keys(row).sort(), TABLE_KEYS, `${at} : champs de la table`);
  assert.deepEqual(view.hand.map((m) => m.uid), p.hand.map((m) => m.uid), `${at} : la main`);
  assert.deepEqual(view.spells.map((s) => s.uid), p.spells.map((s) => s.uid), `${at} : les sorts`);
  assert.deepEqual(view.shop, p.shop, `${at} : la boutique`);
  const opponents = new Set(p.seen.map((s) => s.seat));
  for (const s of view.seen) assert.ok(opponents.has(s.seat), `${at} : plateau vu d'un siège jamais affronté`);
  const json = JSON.stringify(view);
  for (const q of game.players) {
    if (q.seat === seat) continue;
    // Les cartes en main des autres, leur boutique et leurs choix ne sortent jamais.
    for (const m of q.hand) {
      if (!q.board.some((x) => x.uid === m.uid) && !p.seen.some((s) => s.board.some((x) => x.uid === m.uid))) {
        assert.ok(!json.includes(`"uid":${m.uid},`), `${at} : la main du siège ${q.seat} fuit (#${m.uid})`);
      }
    }
    for (const s of q.spells) assert.ok(!json.includes(`"uid":${s.uid},`), `${at} : un sort du siège ${q.seat} fuit`);
  }
  if (mutate) {
    const before = snapshotGame(game);
    vandalize(view);
    assert.equal(snapshotGame(game), before, `${at} : la vue partage un objet modifiable avec la partie`);
  }
}

// Le combat.

export function checkCombats(game: Game, cov: Coverage, where: string, aliveBefore: number[]): void {
  const fought = game.roundCombats.flatMap((c) => [c.a, c.b]).filter((s) => s >= 0);
  assert.equal(new Set(fought).size, fought.length, `${where} : un siège combat deux fois`);
  for (const seat of aliveBefore) assert.ok(fought.includes(seat), `${where} : le siège ${seat} n'a pas combattu`);
  assert.equal(fought.length, aliveBefore.length, `${where} : un éliminé combat`);
  for (const record of game.roundCombats) {
    const { result } = record;
    cov.combats++;
    const log = result.log;
    if (log.length === 0) continue;
    const attacks = log.filter((e) => e.e === 'attaque').length;
    if (attacks >= 399) cov.combatCaps++;
    assert.equal(log[0].e, 'debut', `${where} : journal sans début`);
    const end = log.findIndex((e) => e.e === 'fin');
    assert.ok(end > 0, `${where} : journal sans fin`);
    // Après la fin : la petite phrase, la réponse, et les gains de chaque Célébration.
    assert.ok(log.slice(end + 1).every((e) => e.e === 'celebration' || e.e === 'reponse' || (e.e === 'effet' && e.when === 'celebration')), `${where} : événement après la fin`);
    const fin = log[end] as Extract<CombatEvent, { e: 'fin' }>;
    const limits = [record.a, record.b].map((seat) => game.params.boardSize + (seat >= 0 ? (game.players[seat].hero.mods.boardDelta ?? 0) : 0));
    const penalty = [0, 0];
    let replayed: CombatSides = [[], []];
    for (const ev of log.slice(0, end)) {
      replayed = applyCombatEvent(replayed, ev);
      for (const k of [0, 1] as const) assert.ok(replayed[k].length <= limits[k], `${where} : plateau de ${replayed[k].length} en combat, limite ${limits[k]}`);
      if (ev.e === 'degats') assert.ok(ev.value > 0 && Number.isFinite(ev.hp), `${where} : dégâts ${ev.value}`);
      if (ev.e === 'stats') assert.ok(Number.isFinite(ev.atk) && Number.isFinite(ev.hp), `${where} : stats ${ev.atk}/${ev.hp}`);
      if (ev.e === 'penalite') penalty[ev.side] += ev.value;
    }
    assert.deepEqual(penalty, result.deathPenalty, `${where} : sondages perdus aux morts`);
    assert.deepEqual(replayed, fin.sides, `${where} : le journal rejoué ne donne pas l'état final (combat ${record.a} contre ${record.b})`);
    assert.deepEqual([fin.sides[0].length, fin.sides[1].length], result.survivors, `${where} : survivants`);
    for (const side of fin.sides) for (const u of side) assert.ok(u.hp > 0 && Number.isFinite(u.atk), `${where} : survivant à ${u.hp} PV`);
    if (result.winner !== null) assert.ok(result.survivors[result.winner] > 0 && result.survivors[1 - result.winner] === 0, `${where} : vainqueur sans survivant`);
    if (result.celebrant) assert.equal(result.celebrant.side, result.winner, `${where} : le perdant célèbre`);
    for (const c of result.celebrants) {
      assert.equal(c.side, result.winner, `${where} : un perdant applique sa Célébration`);
      assert.ok(fin.sides[c.side].some((u) => u.uid === c.uid), `${where} : un mort applique sa Célébration`);
    }
    if (result.responder) assert.notEqual(result.responder.side, result.winner, `${where} : le vainqueur répond`);
    for (const seat of [record.a, record.b]) {
      if (seat < 0) continue;
      const cv = combatViewFor(game, seat);
      assert.ok(cv, `${where} : pas de vue de combat pour ${seat}`);
    }
  }
}

// Les actions au hasard.

function randomUid(game: Game, p: Player, h: Rng): number {
  const roll = h.int(10);
  const own = [...p.board, ...p.hand].map((m) => m.uid);
  if (roll < 5 && own.length > 0) return h.pick(own);
  if (roll < 7 && p.spells.length > 0) return h.pick(p.spells).uid;
  if (roll < 8) {
    const others = game.players.filter((q) => q !== p).flatMap((q) => [...q.board, ...q.hand].map((m) => m.uid));
    if (others.length > 0) return h.pick(others);
  }
  if (roll < 9) return game.nextUid + h.int(3);
  return h.int(5) - 1;
}

function randomSlot(h: Rng, size: number): number {
  const r = h.int(40);
  if (r < 2) return -1;
  if (r < 4) return size + h.int(3);
  // Le protocole ne laisse passer que des entiers, mais le moteur doit refuser le reste sans planter.
  if (r === 4) return h.int(Math.max(1, size)) + 0.5;
  return h.int(Math.max(1, size + 1));
}

/** Une action au hasard, souvent jouable : les sièges du fuzz doivent aussi faire avancer la partie. */
function randomAction(game: Game, p: Player, h: Rng): PlayerAction {
  if (p.discover && h.next() < 0.8) return { t: 'discover', i: h.int(p.discover.options.length + (h.next() < 0.1 ? 2 : 0)) };
  const r = h.int(100);
  const boardUid = () => (p.board.length > 0 && h.next() < 0.85 ? h.pick(p.board).uid : randomUid(game, p, h));
  if (r < 14) {
    const a: PlayerAction = { t: 'buy', slot: randomSlot(h, p.shop.length - 1) };
    if (h.next() < 0.5) a.main = true;
    if (h.next() < 0.3) a.to = randomSlot(h, p.board.length);
    return a;
  }
  if (r < 20) return { t: 'buy_spell', slot: randomSlot(h, p.shopSpells.length - 1) };
  if (r < 26) return { t: 'buy_casserole' };
  if (r < 46) {
    const m = p.hand.length > 0 && h.next() < 0.85 ? h.pick(p.hand) : null;
    const a: PlayerAction = { t: 'play', uid: m ? m.uid : randomUid(game, p, h) };
    if (h.next() < 0.4) a.to = randomSlot(h, p.board.length);
    if (h.next() < 0.5) a.target = boardUid();
    if (h.next() < (m?.keywords.includes('ralliement') ? 0.6 : 0.1)) a.onto = boardUid();
    return a;
  }
  if (r < 64) {
    const uid = p.spells.length > 0 && h.next() < 0.85 ? h.pick(p.spells).uid : randomUid(game, p, h);
    return h.next() < 0.75 ? { t: 'cast', uid, target: boardUid() } : { t: 'cast', uid };
  }
  if (r < 70) return { t: 'sell', uid: randomUid(game, p, h) };
  if (r < 78) return { t: 'roll' };
  if (r < 81) return { t: 'freeze' };
  if (r < 87) return { t: 'upgrade' };
  if (r < 96) return { t: 'move', uid: boardUid(), to: randomSlot(h, p.board.length - 1) };
  if (r < 98) return { t: 'discover', i: h.int(4) - 1 };
  return { t: 'hero', i: h.int(3) };
}

// Forcer les cartes, pour que chacune passe dans le moteur.

interface Cursor {
  card: number;
  hand: number;
  spell: number;
  casserole: number;
}

function forceShop(game: Game, p: Player, h: Rng, cursor: Cursor): void {
  const inGame = CARDS.filter((c) => (c.camp === 'civile' || game.camps.includes(c.camp)) && (game.pool.get(c.id) ?? 0) > 0);
  if (inGame.length > 0 && h.next() < 0.7) {
    for (const id of p.shop) returnToPool(game, id);
    p.shop = [];
    const n = 1 + h.int(5);
    for (let i = 0; i < n; i++) {
      // Le curseur passe sur toutes les cartes du jeu ; parfois, trois fois la même pour un triple.
      const card = h.next() < 0.3 && p.board.length + p.hand.length > 0 ? CARD_BY_ID[h.pick([...p.board, ...p.hand]).cardId] : CARDS[cursor.card++ % CARDS.length];
      if (card && take(game, card.id)) p.shop.push(card.id);
    }
  }
  // Une carte du curseur, ou un exemplaire de plus d'une carte qu'il a déjà, droit dans la main.
  if (h.next() < 0.5 && p.hand.length + p.spells.length < game.params.handSize) {
    const owned = [...p.board, ...p.hand].filter((m) => !m.golden && !m.token && !m.simple);
    let id = h.next() < 0.4 && owned.length > 0 ? h.pick(owned).cardId : null;
    for (let tries = 0; !id && tries < CARDS.length; tries++) {
      const card = CARDS[cursor.hand++ % CARDS.length];
      if ((game.pool.get(card.id) ?? 0) > 0) id = card.id;
    }
    if (id && take(game, id)) addMinionToHand(game, p, id);
  }
  const spells = SPELLS.filter((s) => !s.token);
  if (h.next() < 0.6) p.shopSpells = [spells[cursor.spell++ % spells.length].id];
  if (h.next() < 0.6) p.casseroleOffer = CASSEROLES[cursor.casserole++ % CASSEROLES.length].id;
  if (h.next() < 0.15 && p.hand.length + p.spells.length < game.params.handSize) {
    p.spells.push({ uid: game.nextUid++, spellId: 'investiture', tier: Math.min(game.params.tierMax, p.tier + 1) });
  }
  p.budget += h.int(7);
}

// Une partie.

type Seat = { kind: 'fuzz' } | { kind: 'bot'; bot: BotState };

export interface FuzzResult {
  trace: number[];
  rounds: number;
  finished: boolean;
}

function optionsFor(seed: number, h: Rng): { opts: GameOptions; seats: Seat[] } {
  const seats = 2 + h.int(7);
  const opts: GameOptions = { seed, seats, combatLog: true };
  if (h.next() < 0.3) opts.heroSelection = true;
  if (h.next() < 0.5) opts.heroes = Array.from({ length: seats }, () => (h.next() < 0.7 ? h.pick(HEROES).id : undefined));
  if (h.next() < 0.7) opts.contextId = h.pick(CONTEXTS).id;
  if (h.next() < 0.5) {
    const camps = h.shuffle([...PARTY_CAMPS]).slice(0, 1 + h.int(PARTY_CAMPS.length));
    opts.activeCamps = camps as Camp[];
  }
  if (h.next() < 0.5) {
    const params: Partial<Params> = {};
    if (h.next() < 0.6) params.casseroleFromRound = 1;
    if (h.next() < 0.3) params.scandalRounds = 1 + h.int(3);
    if (h.next() < 0.3) params.scandalThreshold = 1 + h.int(3);
    if (h.next() < 0.3) params.handSize = 3 + h.int(8);
    if (h.next() < 0.3) params.boardSize = 2 + h.int(6);
    if (h.next() < 0.2) params.spellSlots = h.int(3);
    if (h.next() < 0.2) params.startHp = 8 + h.int(30);
    opts.params = params;
  }
  if (h.next() < 0.2) {
    const pick = () => Array.from({ length: 3 }, () => h.pick(CARDS).id);
    opts.script = {
      seat: 0,
      boutique: { 1: pick(), 2: pick(), 3: pick(), 5: pick() },
      sorts: { 2: [h.pick(SPELLS.filter((s) => !s.token)).id] },
      casseroles: { 1: h.pick(CASSEROLES).id, 3: h.pick(CASSEROLES).id },
    };
  }
  if (h.next() < 0.2) opts.heroChoices = { 0: 1 + h.int(4) };
  const levels: BotLevel[] = ['debutant', 'facile', 'moyen', 'moyen', 'difficile'];
  const list: Seat[] = [];
  let difficiles = 0;
  for (let s = 0; s < seats; s++) {
    if (s === 0 || h.next() < 0.5) {
      list.push({ kind: 'fuzz' });
      continue;
    }
    let level = h.pick(levels);
    if (level === 'difficile' && difficiles++ > 0) level = 'moyen';
    list.push({ kind: 'bot', bot: createBot(level, seed * 31 + s, { personnage: h.next() < 0.5 }) });
  }
  return { opts, seats: list };
}

export function runFuzzGame(seed: number, cov: Coverage): FuzzResult {
  const h = createRng(seed * 7919 + 17);
  const { opts, seats } = optionsFor(seed, h);
  const game = createGame(opts);
  const counter = countingRng(game.rng);
  game.rng = counter.rng;
  const total = census(game);
  const cursor: Cursor = { card: seed * 7, hand: seed * 11, spell: seed, casserole: seed * 3 };
  const trace: number[] = [];
  const tag = `graine ${seed}`;
  checkGame(game, total, `${tag} départ`);

  for (let guard = 0; game.phase === 'choix_heros' && guard < 50; guard++) {
    for (const p of game.players) {
      const seat = seats[p.seat];
      const action: PlayerAction | null = seat.kind === 'bot' ? decide(viewFor(game, p.seat), seat.bot) : { t: 'hero', i: h.int((p.heroOffers?.length ?? 2) + 1) };
      if (!action) continue;
      const before = snapshotPlayer(game, p, counter.calls());
      const res = applyAction(game, p.seat, action);
      if (!res.ok) assert.equal(snapshotPlayer(game, p, counter.calls()), before, `${tag} : refus qui modifie l'état (${JSON.stringify(action)})`);
      if (seat.kind === 'bot' && !res.ok) cov.botRefusals.push(`${tag} choix du héros : ${JSON.stringify(action)} → ${res.error}`);
    }
    if (h.next() < 0.3) chooseRemainingHeroes(game);
  }
  assert.notEqual(game.phase, 'choix_heros', `${tag} : le choix du héros ne finit pas`);
  if (opts.heroSelection) {
    // Deux sièges ne jouent pas le même héros tant qu'il en reste assez.
    const imposed = game.players.filter((p) => opts.heroes?.[p.seat]).map((p) => p.hero.id);
    const chosen = game.players.filter((p) => !opts.heroes?.[p.seat]).map((p) => p.hero.id);
    if (new Set(imposed).size + chosen.length <= HEROES.length) {
      const all = [...new Set(imposed), ...chosen];
      assert.equal(new Set(all).size, all.length, `${tag} : deux sièges ont choisi le même héros (${chosen})`);
    }
  }

  while (game.phase === 'recrutement' && game.round < MAX_ROUNDS) {
    const where = `${tag} manche ${game.round}`;
    checkGame(game, total, `${where} début`);
    for (const p of game.players) {
      if (!p.alive) continue;
      const seat = seats[p.seat];
      if (seat.kind === 'bot') {
        let n = 0;
        let last = '';
        let repeats = 0;
        const history: string[] = [];
        for (; n < 60; n++) {
          const action = decide(viewFor(game, p.seat), seat.bot);
          if (!action) break;
          const res = applyAction(game, p.seat, action);
          if (!res.ok) {
            cov.botRefusals.push(`${where} siège ${p.seat} (${seat.bot.level}) : ${JSON.stringify(action)} → ${res.error}`);
            break;
          }
          const key = JSON.stringify(action);
          history.push(key);
          repeats = key === last ? repeats + 1 : 0;
          last = key;
          checkGame(game, total, `${where} après le bot ${p.seat} ${key}`);
        }
        if (n >= 60) cov.stalls.push(`${where} siège ${p.seat} (${seat.bot.level}) : 60 actions, la dernière répétée ${repeats} fois : ${history.slice(-12).join(' ')}`);
        continue;
      }
      if (h.next() < 0.6) forceShop(game, p, h, cursor);
      checkGame(game, total, `${where} boutique forcée ${p.seat}`);
      const actions = 6 + h.int(30);
      for (let n = 0; n < actions; n++) {
        const action = randomAction(game, p, h);
        const before = snapshotPlayer(game, p, counter.calls());
        const castOf = action.t === 'cast' ? p.spells.find((s) => s.uid === action.uid) : undefined;
        const playOf = action.t === 'play' ? p.hand.find((m) => m.uid === action.uid) : undefined;
        const buyOf = action.t === 'buy' ? p.shop[action.slot] : undefined;
        const kept = beforeOf(p);
        const res = applyAction(game, p.seat, action);
        const what = buyOf ?? playOf?.cardId ?? castOf?.spellId ?? castOf?.casseroleId;
        const at = `${where} siège ${p.seat} ${JSON.stringify(action)}${what ? ` (${what})` : ''}`;
        if (!res.ok) {
          assert.equal(snapshotPlayer(game, p, counter.calls()), before, `${at} : un refus (${res.error}) modifie l'état`);
          continue;
        }
        if (castOf?.spellId) cov.cast.add(castOf.spellId);
        if (castOf?.casseroleId) cov.casseroles.add(castOf.casseroleId);
        if (playOf) cov.played.add(playOf.cardId);
        if (buyOf) cov.bought.add(buyOf);
        checkGame(game, total, at);
        checkCasserolesKept(p, kept, action, at, cov, castOf?.casseroleId);
        if (action.t === 'play' && action.onto !== undefined) bump(cov, playOf?.golden ? 'ralliement doré' : 'ralliement');
        if (castOf?.spellId === 'bracelet_electronique') bump(cov, 'bracelet');
        if (castOf?.casseroleId) {
          const target = p.board.find((m) => m.uid === (action as { target?: number }).target);
          if (target?.scandal) bump(cov, 'casserole en scandale');
          if (target?.scandal?.silenced) bump(cov, 'silence');
        }
      }
      // Hors de son tour, tout est refusé sans rien changer.
      const dead = game.players.find((q) => !q.alive);
      if (dead) {
        const before = snapshotPlayer(game, dead, counter.calls());
        assert.equal(applyAction(game, dead.seat, { t: 'roll' }).ok, false, `${where} : un éliminé actualise`);
        assert.equal(snapshotPlayer(game, dead, counter.calls()), before, `${where} : un éliminé change l'état`);
      }
    }
    for (const p of game.players) if (p.alive) checkView(game, p.seat, where, p.seat === game.round % game.players.length);
    const aliveBefore = game.players.filter((p) => p.alive).map((p) => p.seat);
    startCombats(game);
    const after = `${tag} combats de la manche ${game.round}`;
    assert.equal(game.phase, 'combat', `${after} : phase`);
    checkCombats(game, cov, after, aliveBefore);
    for (const p of game.players) {
      const before = snapshotPlayer(game, p, counter.calls());
      assert.equal(applyAction(game, p.seat, { t: 'roll' }).ok, false, `${after} : action pendant le combat`);
      assert.equal(snapshotPlayer(game, p, counter.calls()), before, `${after} : un refus pendant le combat change l'état`);
    }
    checkGame(game, total, after);
    for (const p of game.players) if (p.alive || game.roundCombats.some((c) => c.a === p.seat)) checkView(game, p.seat, after, false);
    trace.push(hash(snapshotGame(game)));
    finishRound(game);
    for (const p of game.players) for (const m of [...p.board, ...p.hand]) if (m.oublie > 0 && !m.scandal) bump(cov, 'médailles (serviteur·manche)');
  }

  const finished = game.phase === 'fini';
  if (finished) {
    const places = game.players.map((p) => p.place).sort((a, b) => a - b);
    assert.deepEqual(places, game.players.map((_, i) => i + 1), `${tag} : classement final ${places}`);
  }
  trace.push(hash(snapshotGame(game)));
  return { trace, rounds: game.round, finished };
}

