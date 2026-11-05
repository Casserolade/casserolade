import { createBot, decide } from '../bots/bots.ts';
import type { BotLevel, BotState } from '../bots/bots.ts';
import { applyAction, chooseRemainingHeroes, combatViewFor, createGame, finalRanking, finishRound, startCombats, viewFor } from '../engine/game.ts';
import type { Game, GameOptions, GamePhase } from '../engine/game.ts';
import { invariantViolations } from '../engine/invariants.ts';
import type { PlayerAction } from '../engine/types.ts';
import { combatEventDuration } from '../protocol/combatDuration.ts';
import { endOfTurnDurationMs } from '../protocol/endOfTurnDuration.ts';
import { PARTIE_PLANTEE } from '../protocol/messages.ts';
import type { Classement, ClientMessage, ServerMessage } from '../protocol/messages.ts';

const MAX_BOT_ACTIONS = 40;
const TAKEOVER_LEVEL: BotLevel = 'moyen';
/**
 * Patience after the combat's own events: the client still loads its stage and lets the result be
 * read. The round closes as soon as every connected human has sent « vu »; this margin only waits
 * for someone who doesn't, so that the next recruitment never starts under a combat still on screen.
 */
const COMBAT_MARGIN_MS = 25_000;

/** No Node API here: the same room runs behind WebSocket and inside the browser for solo games. */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface RoomSeat {
  pseudo: string;
  /** Null for a human seat. */
  level: BotLevel | null;
}

export interface RoomTimers {
  /** Null: the hero choice lasts until everyone has chosen. */
  heroMs: number | null;
  /** Null: recruitment lasts until everyone is ready. */
  recruitMs: ((round: number) => number) | null;
  /** How long a disconnected seat keeps its turn before a bot plays it. */
  graceMs: number;
}

export interface GameRoomOptions {
  seed: number;
  seats: RoomSeat[];
  game?: Partial<GameOptions>;
  timers: RoomTimers;
  clock: Clock;
  send(seat: number, message: ServerMessage): void;
  onEnd?(ranking: Classement): void;
  /** A bug stopped the game, or a rule of the engine no longer holds: what to replay it at home (tools/rejouer.ts). */
  onIncident?(incident: RoomIncident): void;
}

/**
 * Enough to replay a game in case of dispute, along with the seed: every accepted action, the end of the
 * hero choice by the timer, the combats (startCombats) and the start of the next round (finishRound).
 */
export type RoomLogEntry =
  | { kind: 'action'; seat: number; action: PlayerAction }
  | { kind: 'heroes_timeout' }
  | { kind: 'combat' }
  | { kind: 'manche' };

/**
 * What a room reports when something goes wrong. A crash stops this game only, never the server; an
 * anomaly (an invariant that no longer holds) is reported once per round, and the game goes on.
 * With the seed, the options and the log, `tools/rejouer.ts` replays it exactly.
 */
export interface RoomIncident {
  kind: 'crash' | 'anomalie';
  message: string;
  stack: string | null;
  violations: string[];
  seed: number;
  seats: RoomSeat[];
  game: Partial<GameOptions> | null;
  round: number;
  phase: GamePhase;
  log: RoomLogEntry[];
}

export class GameRoom {
  readonly game: Game;
  readonly log: RoomLogEntry[] = [];
  private readonly options: GameRoomOptions;
  private readonly bots = new Map<number, BotState>();
  private readonly connected = new Set<number>();
  private readonly ready = new Set<number>();
  private readonly waitingForCombat = new Set<number>();
  private readonly graceTimers = new Map<number, unknown>();
  private phaseTimer: unknown = null;
  private deadline: number | null = null;
  private ended = false;
  /** The last round whose anomalies were reported: once per round is enough to replay it. */
  private reportedRound = -1;

  constructor(options: GameRoomOptions) {
    this.options = options;
    this.game = createGame({
      ...options.game,
      seed: options.seed,
      seats: options.seats.length,
      heroSelection: true,
      combatLog: true,
    });
    options.seats.forEach((seat, index) => {
      if (seat.level) this.bots.set(index, createBot(seat.level, options.seed * 31 + index + 1, { personnage: true }));
      else this.connected.add(index);
    });
  }

  start(): void {
    this.guard(() => {
      for (const [seat, bot] of this.bots) this.chooseBotHero(seat, bot);
      if (this.game.phase === 'recrutement') this.beginRecruitment();
      else this.beginHeroChoice();
    });
  }

  /** Every message from a seat lands here, already validated against the protocol. */
  handleMessage(seat: number, message: ClientMessage): void {
    this.guard(() => {
      if (message.type === 'action') this.handleAction(seat, message.seq, message.action);
      else if (message.type === 'pret') this.markReady(seat);
      else if (message.type === 'vu') this.acknowledgeCombat(seat);
    });
  }

  setConnected(seat: number, isConnected: boolean): void {
    this.guard(() => {
      if (this.options.seats[seat].level) return;
      this.clearGrace(seat);
      if (isConnected) {
        this.connected.add(seat);
        this.bots.delete(seat);
        this.sendState(seat);
        return;
      }
      this.connected.delete(seat);
      this.graceTimers.set(seat, this.later(this.options.timers.graceMs, () => this.takeOver(seat)));
      this.waitingForCombat.delete(seat);
      // When nobody is left to acknowledge, the combat timer stays in charge: the player may come back.
      if (this.game.phase === 'combat' && this.waitingForCombat.size === 0 && this.connected.size > 0) this.closeRound();
    });
  }

  destroy(): void {
    this.ended = true;
    this.clearPhaseTimer();
    for (const seat of [...this.graceTimers.keys()]) this.clearGrace(seat);
  }

  /**
   * Every way into the engine goes through here, the timers too: a bug stops this game only, never the
   * server and the other games. The players are told, and the incident leaves with everything to replay it.
   */
  private guard(work: () => void): void {
    if (this.ended) return;
    try {
      work();
    } catch (error) {
      this.crash(error);
    }
  }

  /** A timer of this room: its callback goes through the guard. */
  private later(ms: number, callback: () => void): unknown {
    return this.options.clock.setTimeout(() => this.guard(callback), ms);
  }

  private crash(error: unknown): void {
    if (this.ended) return;
    this.destroy();
    const incident = this.incident('crash', error instanceof Error ? error.message : String(error), error instanceof Error ? (error.stack ?? null) : null, []);
    for (const seat of this.humanSeats()) {
      try {
        this.options.send(seat, { type: 'erreur', erreur: PARTIE_PLANTEE });
      } catch {
        // A seat that cannot be told any more: the others still are.
      }
    }
    this.options.onIncident?.(incident);
  }

  /** The invariants of the engine, at each change of phase: a broken one is reported once per round, the game goes on. */
  private checkHealth(): void {
    if (this.reportedRound === this.game.round || !this.options.onIncident) return;
    const violations = invariantViolations(this.game);
    if (violations.length === 0) return;
    this.reportedRound = this.game.round;
    this.options.onIncident(this.incident('anomalie', violations[0], null, violations));
  }

  private incident(kind: RoomIncident['kind'], message: string, stack: string | null, violations: string[]): RoomIncident {
    return {
      kind, message, stack, violations,
      seed: this.options.seed,
      seats: this.options.seats.map((seat) => ({ ...seat })),
      game: this.options.game ? { ...this.options.game } : null,
      round: this.game.round,
      phase: this.game.phase,
      log: this.log.map((entry) => structuredClone(entry)),
    };
  }

  private beginHeroChoice(): void {
    const { heroMs } = this.options.timers;
    if (heroMs !== null) {
      this.setPhaseTimer(heroMs, () => {
        this.log.push({ kind: 'heroes_timeout' });
        chooseRemainingHeroes(this.game);
        this.beginRecruitment();
      });
    }
    this.sendViews();
  }

  private beginRecruitment(): void {
    this.clearPhaseTimer();
    this.ready.clear();
    this.playBots();
    if (this.alivePlayersWaited().length === 0) {
      this.endRecruitment();
      return;
    }
    const { recruitMs } = this.options.timers;
    if (recruitMs) this.setPhaseTimer(recruitMs(this.game.round), () => this.endRecruitment());
    this.sendViews();
  }

  private endRecruitment(): void {
    this.clearPhaseTimer();
    this.log.push({ kind: 'combat' });
    startCombats(this.game);
    this.checkHealth();
    this.waitingForCombat.clear();
    let longest = 0;
    for (const seat of this.humanSeats()) {
      const combat = combatViewFor(this.game, seat);
      if (!combat) continue;
      this.options.send(seat, { type: 'combat', combat });
      // The end of turn plays on the table first, then the combat.
      const watched = endOfTurnDurationMs(combat.endOfTurn) + combat.log.reduce((sum, event) => sum + combatEventDuration(event), 0);
      longest = Math.max(longest, watched);
      if (this.connected.has(seat)) this.waitingForCombat.add(seat);
    }
    // No human has a combat to watch: every human is out, the bots finish the game at full speed.
    if (longest === 0) this.closeRound();
    else this.setPhaseTimer(longest + COMBAT_MARGIN_MS, () => this.closeRound());
  }

  private closeRound(): void {
    this.clearPhaseTimer();
    this.waitingForCombat.clear();
    this.log.push({ kind: 'manche' });
    finishRound(this.game);
    this.checkHealth();
    if (this.game.phase === 'fini') this.finish();
    else this.beginRecruitment();
  }

  private finish(): void {
    this.ended = true;
    const ranking: Classement = finalRanking(this.game).map((r) => ({ ...r, pseudo: this.options.seats[r.seat].pseudo }));
    for (const seat of this.humanSeats()) {
      this.options.send(seat, { type: 'vue', vue: viewFor(this.game, seat), reste_ms: null });
      this.options.send(seat, { type: 'fin', classement: ranking });
    }
    this.options.onEnd?.(ranking);
  }

  private handleAction(seat: number, seq: number, action: PlayerAction): void {
    if (this.options.seats[seat].level) return;
    if (this.ready.has(seat)) {
      this.options.send(seat, { type: 'refus', seq, erreur: 'Vous avez déjà terminé votre recrutement.' });
      return;
    }
    const phaseBefore = this.game.phase;
    const result = this.applyLogged(seat, action);
    if (!result.ok) {
      this.options.send(seat, { type: 'refus', seq, erreur: result.error });
      return;
    }
    if (phaseBefore === 'choix_heros' && this.game.phase === 'recrutement') this.beginRecruitment();
    else this.sendState(seat);
  }

  private markReady(seat: number): void {
    if (this.game.phase !== 'recrutement' || !this.game.players[seat].alive) return;
    this.ready.add(seat);
    this.endRecruitmentIfAllReady();
  }

  private endRecruitmentIfAllReady(): void {
    if (this.alivePlayersWaited().every((seat) => this.ready.has(seat))) this.endRecruitment();
  }

  private acknowledgeCombat(seat: number): void {
    if (this.game.phase !== 'combat') return;
    this.waitingForCombat.delete(seat);
    if (this.waitingForCombat.size === 0) this.closeRound();
  }

  /** The grace period is over: a bot plays this seat's turn, until its player returns. */
  private takeOver(seat: number): void {
    this.graceTimers.delete(seat);
    const bot = createBot(TAKEOVER_LEVEL, this.options.seed * 37 + seat + 1);
    this.bots.set(seat, bot);
    if (this.game.phase === 'choix_heros') this.handleHeroTakeover(seat, bot);
    else if (this.game.phase === 'recrutement') {
      this.playSeat(seat, bot);
      this.endRecruitmentIfAllReady();
    }
  }

  private chooseBotHero(seat: number, bot: BotState): void {
    if (!this.game.players[seat].heroOffers) return;
    const action = decide(viewFor(this.game, seat), bot);
    if (action) this.applyLogged(seat, action);
  }

  private handleHeroTakeover(seat: number, bot: BotState): void {
    this.chooseBotHero(seat, bot);
    if (this.game.phase === 'recrutement') this.beginRecruitment();
  }

  private playBots(): void {
    for (const [seat, bot] of this.bots) this.playSeat(seat, bot);
  }

  /** A bot only ever sees its seat's view, like any player. */
  private playSeat(seat: number, bot: BotState): void {
    if (!this.game.players[seat].alive) return;
    for (let n = 0; n < MAX_BOT_ACTIONS; n++) {
      const action = decide(viewFor(this.game, seat), bot);
      if (!action || !this.applyLogged(seat, action).ok) break;
    }
  }

  private applyLogged(seat: number, action: PlayerAction) {
    const result = applyAction(this.game, seat, action);
    if (result.ok) this.log.push({ kind: 'action', seat, action });
    return result;
  }

  private humanSeats(): number[] {
    return this.options.seats.flatMap((seat, index) => (seat.level ? [] : [index]));
  }

  /** The seats recruitment waits for: living ones, without a bot in their place. */
  private alivePlayersWaited(): number[] {
    return this.humanSeats().filter((seat) => this.game.players[seat].alive && !this.bots.has(seat));
  }

  private sendViews(): void {
    for (const seat of this.humanSeats()) this.sendView(seat);
  }

  private sendView(seat: number): void {
    const left = this.deadline === null ? null : Math.max(0, this.deadline - this.options.clock.now());
    this.options.send(seat, { type: 'vue', vue: viewFor(this.game, seat), reste_ms: left });
  }

  private sendState(seat: number): void {
    this.sendView(seat);
    const combat = this.game.phase === 'combat' ? combatViewFor(this.game, seat) : null;
    if (combat) this.options.send(seat, { type: 'combat', combat });
  }

  private setPhaseTimer(ms: number, callback: () => void): void {
    this.clearPhaseTimer();
    this.deadline = this.options.clock.now() + ms;
    this.phaseTimer = this.later(ms, callback);
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer !== null) this.options.clock.clearTimeout(this.phaseTimer);
    this.phaseTimer = null;
    this.deadline = null;
  }

  private clearGrace(seat: number): void {
    const handle = this.graceTimers.get(seat);
    if (handle !== undefined) this.options.clock.clearTimeout(handle);
    this.graceTimers.delete(seat);
  }
}
