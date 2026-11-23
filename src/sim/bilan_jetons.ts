import { parseArgs } from 'node:util';
import { applyAction, createGame, resolveRound, viewFor } from '../engine/game.ts';
import { createBot, decide } from '../bots/bots.ts';
import type { BotLevel } from '../bots/bots.ts';
import { PARTY_CAMPS, TOKENS } from '../data/cards.ts';
import { createRng } from '../engine/rng.ts';
import type { Camp, CombatEvent } from '../engine/types.ts';

/**
 * Les jetons invoqués en combat : c'est là qu'un jeton compte, pas sur le plateau du recrutement, où il ne reste pas.
 * Pour chaque jeton qu'un Héritage fait entrer dans un combat : ce qu'il pèse en arrivant, face aux ennemis encore
 * debout, et ce qu'il fait ensuite (dégâts, ennemis tombés, survie). Un siège joue un camp pur, les autres jouent libres.
 * Les jetons nés d'une Annonce (Électeur fantôme, Assistant fictif) sont déjà là au début du combat : comptés à part,
 * avec le nombre de combats qu'ils tiennent sur le plateau.
 *   node src/sim/bilan_jetons.ts --games 300 --camp socialistes
 *   node src/sim/bilan_jetons.ts --games 300 --table      # tous les sièges d'une table de bots libres (la Chaise vide)
 */
const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '300' },
    camp: { type: 'string', default: 'socialistes' },
    niveau: { type: 'string', default: 'moyen' },
    table: { type: 'boolean', default: false },
  },
});

const SEATS = 8;
const BANDS: [string, number, number][] = [['manches 3 à 6', 3, 6], ['manches 7 à 10', 7, 10], ['manches 11 et plus', 11, 99]];

interface Seen {
  round: number;
  uid: number;
  cardId: string;
  /** Déjà sur le plateau au début du combat (né d'une Annonce, au recrutement), ou invoqué pendant le combat. */
  placed: boolean;
  /** Ses stats en arrivant, gains de camp de la partie compris. */
  atk: number;
  hp: number;
  /** Les stats médianes des ennemis debout à ce moment. */
  foes: number;
  dealt: number;
  kills: number;
  survived: boolean;
}

interface Alive { side: 0 | 1; atk: number; hp: number }

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const decile = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.9)] : 0);

/** Les jetons que le camp `side` invoque dans ce combat, suivis jusqu'à la fin. */
function tokensOf(log: CombatEvent[], side: 0 | 1, round: number): Seen[] {
  const alive = new Map<number, Alive>();
  const watched = new Map<number, Seen>();
  let exchange: { from: number; to: number } | null = null;
  let fresh: number | null = null;
  const other = (uid: number) => (exchange?.from === uid ? exchange.to : exchange?.to === uid ? exchange.from : null);
  for (const ev of log) {
    switch (ev.e) {
      case 'debut': {
        ev.sides.forEach((units, s) => units.forEach((u) => alive.set(u.uid, { side: s as 0 | 1, atk: u.atk, hp: u.hp })));
        const foes = median(ev.sides[side === 0 ? 1 : 0].map((u) => u.atk + u.hp));
        for (const u of ev.sides[side]) {
          if (TOKENS[u.cardId]) watched.set(u.uid, { round, uid: u.uid, cardId: u.cardId, placed: true, atk: u.atk, hp: u.hp, foes, dealt: 0, kills: 0, survived: false });
        }
        break;
      }
      case 'invocation':
      case 'retour': {
        alive.set(ev.unit.uid, { side: ev.side, atk: ev.unit.atk, hp: ev.unit.hp });
        fresh = null;
        if (ev.e !== 'invocation' || ev.side !== side || !TOKENS[ev.unit.cardId]) break;
        const foes = [...alive.values()].filter((u) => u.side !== side).map((u) => u.atk + u.hp);
        watched.set(ev.unit.uid, { round, uid: ev.unit.uid, cardId: ev.unit.cardId, placed: false, atk: ev.unit.atk, hp: ev.unit.hp, foes: median(foes), dealt: 0, kills: 0, survived: false });
        fresh = ev.unit.uid;
        break;
      }
      case 'stats': {
        const unit = alive.get(ev.uid);
        if (unit) Object.assign(unit, { atk: ev.atk, hp: ev.hp });
        // La Chaise vide prend les stats de Giscard juste après son arrivée : c'est ce qu'elle pèse en arrivant.
        if (fresh === ev.uid) Object.assign(watched.get(ev.uid) as Seen, { atk: ev.atk, hp: ev.hp });
        break;
      }
      case 'attaque':
        exchange = { from: ev.from, to: ev.to };
        fresh = null;
        break;
      case 'degats': {
        const unit = alive.get(ev.uid);
        if (unit) unit.hp = ev.hp;
        const by = other(ev.uid);
        if (by !== null && watched.has(by)) (watched.get(by) as Seen).dealt += ev.value;
        break;
      }
      case 'mort': {
        alive.delete(ev.uid);
        const by = other(ev.uid);
        if (by !== null && watched.has(by)) (watched.get(by) as Seen).kills++;
        break;
      }
      case 'fin':
        for (const u of ev.sides[side]) if (watched.has(u.uid)) (watched.get(u.uid) as Seen).survived = true;
        break;
    }
  }
  return [...watched.values()];
}

const camp = values.camp as Camp;
const games = Number(values.games);
const seen: Seen[] = [];
const combats: number[] = [];
for (let n = 0; n < games; n++) {
  const seed = 1 + n * 7919;
  const others = createRng(seed).shuffle(PARTY_CAMPS.filter((c) => c !== camp)).slice(0, 4);
  const game = createGame({ seed, seats: SEATS, ...(values.table ? {} : { activeCamps: [camp, ...others] }), combatLog: true });
  const bots = game.players.map((_, i) => createBot(values.niveau as BotLevel, seed * 31 + i + 1, i === 0 && !values.table ? { pure: true } : {}));
  if (!values.table) bots[0].commitment = camp;
  for (let guard = 0; guard < 80 && game.phase !== 'fini'; guard++) {
    if (game.phase === 'choix_heros') {
      for (const p of game.players) applyAction(game, p.seat, { t: 'hero', i: 0 });
      continue;
    }
    for (const p of game.players) {
      if (!p.alive) continue;
      for (let k = 0; k < 60; k++) {
        const action = decide(viewFor(game, p.seat), bots[p.seat]);
        if (!action || !applyAction(game, p.seat, action).ok) break;
      }
    }
    const round = game.round;
    const fighting = game.players.filter((p) => p.alive).map((p) => p.seat);
    resolveRound(game);
    for (const record of game.roundCombats) {
      for (const [seat, side] of [[record.a, 0], [record.b, 1]] as [number, 0 | 1][]) {
        if (!fighting.includes(seat) || (!values.table && seat !== 0)) continue;
        combats.push(round);
        seen.push(...tokensOf(record.result.log, side, round).map((t) => ({ ...t, uid: n * 1e6 + t.uid })));
      }
    }
  }
}

const who = values.table ? `les huit sièges d'une table de bots ${values.niveau} libres` : `un bot ${values.niveau} qui joue ${camp} pur contre sept bots libres`;
console.log(`# Les jetons en combat : ${games} parties, ${who}`);
const head = '  ' + ''.padEnd(20) + 'combats'.padStart(8) + 'jetons'.padStart(8) + 'par combat'.padStart(12) + 'à l\'arrivée'.padStart(13) + '9e décile'.padStart(11) + 'ennemis debout'.padStart(16) + 'dégâts'.padStart(8) + 'tue'.padStart(7) + 'survit'.padStart(8);
const cards = [...new Set(seen.map((t) => t.cardId))].sort();
for (const cardId of cards) {
  for (const placed of [false, true]) {
    const mine = seen.filter((t) => t.cardId === cardId && t.placed === placed);
    if (mine.length === 0) continue;
    console.log(`\n## ${TOKENS[cardId].name}, ${placed ? 'déjà sur le plateau au début du combat' : 'invoqué pendant le combat'} (${mine.length})`);
    console.log(head);
    for (const [name, from, to] of BANDS) {
      const fought = combats.filter((r) => r >= from && r <= to).length;
      const tokens = mine.filter((t) => t.round >= from && t.round <= to);
      if (fought === 0 || tokens.length === 0) continue;
      const share = (count: number) => `${Math.round((100 * count) / tokens.length)} %`;
      console.log(
        '  ' + name.padEnd(20) + String(fought).padStart(8) + String(tokens.length).padStart(8) + (tokens.length / fought).toFixed(2).padStart(12) +
        `${median(tokens.map((t) => t.atk))}/${median(tokens.map((t) => t.hp))}`.padStart(13) + String(decile(tokens.map((t) => t.atk + t.hp))).padStart(11) + String(median(tokens.map((t) => t.foes))).padStart(16) +
        String(median(tokens.map((t) => t.dealt))).padStart(8) + share(tokens.filter((t) => t.kills > 0).length).padStart(7) + share(tokens.filter((t) => t.survived).length).padStart(8),
      );
    }
    if (!placed) continue;
    // Un jeton posé au recrutement garde son identifiant d'un combat à l'autre : le nombre de combats qu'il tient.
    const stays = new Map<number, number>();
    for (const t of mine) stays.set(t.uid, (stays.get(t.uid) ?? 0) + 1);
    const lengths = [...stays.values()];
    console.log(`  ${lengths.length} jetons posés ; chacun tient ${median(lengths)} combats (médiane), ${decile(lengths)} au 9e décile.`);
  }
}
console.log('\n  À l\'arrivée : attaque et PV médians du jeton, gains de la partie compris. 9e décile et ennemis debout : attaque plus PV. « Tue » : fait tomber au moins un ennemi.');
