import type { Camp, Casserole, CasseroleBonus, CombatEvent, Context, Counter, Effect, EndOfTurnStep, HandSpell, Hero, HeroMods, Minion, Params, PlayerAction, Rng } from './types.ts';
import type { CombatRecord, Game, GamePhase, Player, ShopScript } from './state.ts';
import { createRng } from './rng.ts';
import { resolveCombat } from './combat.ts';
import { canRallyOnto, effectPower, makeMinion, makeToken, tripleCopies } from './minion.ts';
import { relaunchable } from './relaunch.ts';
import { insertAroundLocked, reorderAroundLocked } from './reorderAroundLocked.ts';
import {
  addMinionToHand,
  addSpellToHand,
  afterCombatSpeech,
  afterSpell,
  announce,
  applyEffect,
  applyPersist,
  boardLimit,
  chooseDiscover,
  drawFromTier,
  dropDiscovers,
  endOfTurn,
  fireBoard,
  fuseIfTriple,
  handHasRoomFor,
  handIsFull,
  heroEndOfTurn,
  incrementCounter,
  addDefect,
  braceletTarget,
  forgetScandal,
  scandalThreshold,
  startScandal,
  maxBudget,
  offerCasserole,
  needsTarget,
  offerMinions,
  releaseBracelet,
  rally,
  refillShop,
  refreshShop,
  releaseMinion,
  returnToPool,
  settleDiscovers,
  shopCardGain,
  spellCost,
  spend,
  startOfTurn,
  take,
  welcome,
} from './recruit.ts';
import { CARDS, CARD_BY_ID, PARTY_CAMPS } from '../data/cards.ts';
import { CASSEROLES, CASSEROLE_BY_ID } from '../data/casseroles.ts';
import { CONTEXTS, HEROES, HERO_BY_ID, RANDOM_CONTEXT } from '../data/heroes.ts';
import { PARAMS } from '../data/params.ts';
import { SPELL_BY_ID } from '../data/sorts.ts';
import { plateauFor } from '../data/plateaux.ts';
import { enterPhase } from './phases.ts';
import type { Plateau } from '../data/plateaux.ts';
import { animateurFor } from '../data/animateurs.ts';
import type { Animateur } from '../data/animateurs.ts';

export type { CombatRecord, Game, GamePhase, Offer, Player, ShopScript } from './state.ts';

export interface GameOptions {
  seed: number;
  seats?: number;
  params?: Partial<Params>;
  contextId?: string;
  /** Héros imposés par siège, pour le mode histoire et les tests. */
  heroes?: (string | undefined)[];
  /** Camps imposés pour la partie. */
  activeCamps?: Camp[];
  heroOverrides?: Record<string, Partial<Hero>>;
  /** Ouvre une phase de choix du héros pour les sièges sans héros imposé. */
  heroSelection?: boolean;
  /** Conserve le journal de chaque combat. Inutile au simulateur, qui gagne du temps sans. */
  combatLog?: boolean;
  /** La boutique écrite d'avance d'un siège : le tutoriel. */
  script?: ShopScript;
  /** Héros proposés au choix, par siège : un succès en donne un de plus. Sinon, la règle. */
  heroChoices?: Record<number, number>;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });
const OK: ActionResult = { ok: true };
const PHASE_ERRORS: Record<Exclude<GamePhase, 'recrutement'>, string> = {
  choix_heros: 'Choisissez d\'abord votre héros.',
  combat: 'Le recrutement est terminé.',
  fini: 'La partie est terminée.',
};
const NO_COUNTERS: Record<Counter, number> = { tracts: 0, ecologistes_joues: 0, dores_joues: 0, casseroles: 0, debauchages: 0 };

/** `hasard` draws one of the contexts with a rule; an unknown or missing id is ordinary political life. */
function contextFor(id: string | undefined, rng: Rng): Context {
  if (id === RANDOM_CONTEXT) return rng.pick(CONTEXTS.filter((c) => c.id !== CONTEXTS[0].id));
  return CONTEXTS.find((c) => c.id === id) ?? CONTEXTS[0];
}

/** A hero's polls at the start: its bonus is a balance lever, never enough to start the game already out. */
function startingPolls(params: Params, hero: Hero): number {
  return Math.max(1, params.startHp + hero.hpBonus);
}

export function createGame(opts: GameOptions): Game {
  const rng = createRng(opts.seed);
  const ctx = contextFor(opts.contextId, rng);
  const params: Params = { ...PARAMS, ...opts.params, ...ctx.params };
  const seats = opts.seats ?? 8;
  const camps = opts.activeCamps ?? rng.shuffle([...PARTY_CAMPS]).slice(0, params.activeCamps);

  // Comme dans Battlegrounds, chaque carte d'un échelon a le même nombre d'exemplaires, et la boutique tire au
  // hasard dans ce qui reste. Un camp pèse en boutique par le nombre de ses cartes à cet échelon.
  const pool = new Map<string, number>();
  for (const card of CARDS.filter((c) => c.camp === 'civile' || camps.includes(c.camp))) pool.set(card.id, params.copies[card.tier]);

  const heroes: Record<string, Hero> = { ...HERO_BY_ID };
  for (const [id, over] of Object.entries(opts.heroOverrides ?? {})) heroes[id] = { ...heroes[id], ...over };

  const order = rng.shuffle(HEROES.map((h) => h.id));
  // Un héros imposé à un siège n'est proposé à personne d'autre.
  const imposedIds = new Set((opts.heroes ?? []).filter((id): id is string => Boolean(id)));
  const free = order.filter((id) => !imposedIds.has(id));
  const offerOrder = free.length > 0 ? free : order;
  const players: Player[] = [];
  // Chaque siège pioche ses héros à la suite des autres : deux joueurs ne se voient pas proposer le même.
  let offered = 0;
  for (let seat = 0; seat < seats; seat++) {
    const imposed = opts.heroes?.[seat];
    const heroId = imposed ?? order[seat % order.length];
    const hero = heroes[heroId];
    const choices = opts.heroChoices?.[seat] ?? params.heroChoices;
    const heroOffers = opts.heroSelection && !imposed ? dealHeroOffers(offerOrder, offered, choices) : null;
    if (heroOffers) offered += choices;
    players.push({
      seat,
      hero,
      heroOffers,
      heroChoices: choices,
      hp: startingPolls(params, hero),
      tier: 1,
      upgradeCost: params.tierCost[2],
      budget: 0,
      nextBudgetBonus: 0,
      maxBudgetBonus: 0,
      board: [],
      hand: [],
      spells: [],
      shop: [],
      shopSpells: [],
      frozen: false,
      casseroleOffer: null,
      discover: null,
      discoverQueue: [],
      tract: { atk: 1, hp: 1 },
      campBuffs: [],
      shopBuffs: [],
      endOfTurnSteps: [],
      counters: { ...NO_COUNTERS },
      spent: 0,
      freeRolls: 0,
      lossBet: 0,
      buysThisRound: 0,
      rollsThisRound: 0,
      annoncesThisRound: 0,
      retriggered: new Set(),
      onceThisRound: new Set(),
      alive: true,
      place: 0,
      opponents: [],
      seen: [],
      lostLast: false,
      stats: { casseroles: 0, scandals: 0, forgotten: 0, triples: 0, spells: 0 },
    });
  }

  const game: Game = {
    rng,
    params,
    ctx,
    round: 0,
    // La phase de départ : le choix des héros, sauf s'ils sont tous imposés (phases.ts).
    phase: players.some((p) => p.heroOffers) ? 'choix_heros' : 'recrutement',
    camps,
    pool,
    poolTotal: new Map(pool),
    players,
    nextUid: 1,
    lastEliminated: null,
    ranks: [],
    roundCombats: [],
    heroes,
    hpSnapshot: new Map(),
    combatLog: opts.combatLog ?? false,
    script: opts.script ?? null,
  };
  if (game.phase === 'recrutement') startRound(game);
  return game;
}

/** Des propositions différentes d'un siège à l'autre, tant qu'il y a assez de héros. */
function dealHeroOffers(order: string[], from: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => order[(from + i) % order.length]);
}

function chooseHero(game: Game, p: Player, i: number): ActionResult {
  if (game.phase !== 'choix_heros') return fail('Le choix du héros est terminé.');
  if (!p.heroOffers) return fail('Héros déjà choisi.');
  const heroId = p.heroOffers[i];
  if (!heroId) return fail('Choix invalide.');
  p.hero = game.heroes[heroId];
  p.hp = startingPolls(game.params, p.hero);
  p.heroOffers = null;
  withdrawHeroOffer(game, heroId);
  if (game.players.every((x) => !x.heroOffers)) {
    enterPhase(game, 'recrutement');
    startRound(game);
  }
  return OK;
}

/**
 * Un héros choisi n'est plus proposé ailleurs : deux sièges ne jouent pas le même.
 * Les héros que les autres ont laissés complètent ensuite les propositions de ceux qui n'ont pas choisi.
 */
function withdrawHeroOffer(game: Game, heroId: string): void {
  const waiting = game.players.filter((p) => p.heroOffers);
  const before = new Map(waiting.map((p) => [p, p.heroOffers as string[]]));
  for (const p of waiting) p.heroOffers = (p.heroOffers as string[]).filter((id) => id !== heroId);
  for (const p of waiting) {
    const offers = p.heroOffers as string[];
    while (offers.length < p.heroChoices) {
      const offered = new Set(game.players.flatMap((x) => x.heroOffers ?? []));
      const free = HEROES.map((h) => h.id).filter((id) => !offered.has(id) && !isHeroChosen(game, id));
      if (free.length === 0) break;
      offers.push(game.rng.pick(free));
    }
    // À plus de sièges qu'il n'y a de héros, mieux vaut un doublon qu'un joueur sans choix.
    if (offers.length === 0) p.heroOffers = before.get(p) as string[];
  }
}

function isHeroChosen(game: Game, heroId: string): boolean {
  return game.players.some((p) => !p.heroOffers && p.hero.id === heroId);
}

/** Le minuteur du choix est écoulé : chacun prend sa première proposition. */
export function chooseRemainingHeroes(game: Game): void {
  for (const p of game.players) if (p.heroOffers) chooseHero(game, p, 0);
}


/** Le tutoriel remplace la boutique de cette manche par la sienne, pris dans la réserve, sauf si elle a été gelée. */
function followScript(game: Game, p: Player, frozen: boolean): void {
  const script = game.script;
  if (!script || script.seat !== p.seat) return;
  const minions = script.boutique?.[game.round];
  if (minions && !frozen) {
    for (const id of p.shop) returnToPool(game, id);
    p.shop = minions.filter((id) => take(game, id));
  }
  const spells = script.sorts?.[game.round];
  if (spells) p.shopSpells = [...spells];
  const casserole = script.casseroles?.[game.round];
  if (casserole) p.casseroleOffer = casserole;
}

export function startRound(game: Game): void {
  game.round++;
  const { params, round } = game;
  for (const p of game.players) {
    if (!p.alive) continue;
    const dissolved = game.ctx.dissolutionRound === round;
    if (dissolved && p.board.length > 0) releaseMinion(game, p.board.pop() as Minion);
    // Le budget avant l'oubli du peuple : un scandale coûte ses deux manches de budget. Un politique en main paie aussi.
    const perRound = [...p.board, ...p.hand].reduce((sum, m) => sum + m.budgetPerRound, 0);
    const base = Math.min(maxBudget(game, p), params.startBudget + (round - 1) * params.budgetPerRound);
    const trickle = game.ctx.lastPlaceBudget && isLastInPolls(game, p) ? game.ctx.lastPlaceBudget : 0;
    p.budget = Math.max(0, base + (p.hero.mods.budgetPerRound ?? 0) + perRound + p.nextBudgetBonus + trickle);
    p.nextBudgetBonus = 0;
    forgetScandals(game, p);
    for (const m of p.board) releaseBracelet(m);
    if (round > 1 && p.tier < params.tierMax) p.upgradeCost = Math.max(0, p.upgradeCost - 1);
    p.buysThisRound = 0;
    p.rollsThisRound = 0;
    const frozen = p.frozen;
    if (frozen) p.frozen = false;
    else refillShop(game, p);
    // Le gel garde aussi la casserole, si elle n'a pas été achetée.
    if (!frozen || !p.casseroleOffer) offerCasserole(game, p);
    followScript(game, p, frozen);
    if (round === 1 && game.ctx.firstRoundDiscover) offerMinions(game, p, game.ctx.firstRoundDiscover);
    if (dissolved && game.ctx.dissolutionDiscover) offerMinions(game, p, p.tier);
    startOfTurn(game, p);
  }
}

/** Ruissellement : the last in the polls, ties included, before this round's budget. */
function isLastInPolls(game: Game, p: Player): boolean {
  return p.hp <= Math.min(...game.players.filter((x) => x.alive).map((x) => x.hp));
}

/** L'oubli du peuple, une fois le budget de la manche versé : le scandale a coûté ses deux manches, ses défauts s'en vont. */
function forgetScandals(game: Game, p: Player): void {
  for (const m of [...p.board, ...p.hand]) {
    if (!m.scandal || m.scandal.until > game.round) continue;
    forgetScandal(m);
    p.stats.forgotten++;
  }
}

/**
 * Poser une carte de la main : elle prend sa place, ou se rallie à un allié, puis son Annonce se déclenche.
 * Un doré issu d'un triple donne une Investiture, à l'échelon fixé maintenant (règle R2).
 */
function playFromHand(game: Game, p: Player, m: Minion, to: number, targetUid?: number, ontoUid?: number): ActionResult {
  let host: Minion = m;
  if (ontoUid !== undefined) {
    if (!m.keywords.includes('ralliement')) return fail('Seul un Ralliement peut rejoindre un allié.');
    const onto = p.board.find((x) => x.uid === ontoUid);
    if (!onto) return fail('Allié introuvable.');
    if (!canRallyOnto(onto, m)) return fail('Un jeton ne peut pas porter de casserole.');
    host = onto;
  } else if (p.board.length >= boardLimit(game, p)) {
    return fail('Plateau complet.');
  }
  let target: Minion | null = null;
  if (targetUid !== undefined) {
    target = p.board.find((x) => x.uid === targetUid) ?? null;
    if (!target || target === host) return fail('Cible invalide.');
  }
  if (host === m) {
    const next = insertAroundLocked(p.board, m, to, (x) => x.locked);
    if (!next) return fail('Place invalide.');
    p.hand = p.hand.filter((x) => x !== m);
    p.board = next;
  }
  // Rallié, ses effets passent sur l'hôte avec leur puissance : son Annonce joue ces copies-là.
  let effects: Effect[] = m.effects;
  if (host !== m) {
    p.hand = p.hand.filter((x) => x !== m);
    effects = rally(game, p, host, m);
    fireBoard(game, p, 'rallie', { played: host });
  }
  // Sans cible donnée, l'Annonce vise le premier autre allié : le minuteur ne bloque jamais la partie.
  if (!target && needsTarget(effects)) target = p.board.find((x) => x !== host) ?? null;
  if (m.golden) incrementCounter(p, 'dores_joues');
  // L'Investiture avant l'Annonce : le doré vient de quitter la main, elle y trouve toujours sa place.
  if (m.golden && m.copies === 3 && !m.investi) {
    m.investi = true;
    addSpellToHand(game, p, 'investiture', Math.min(p.tier + 1, game.params.tierMax));
  }
  announce(game, p, host, effects, m, target);
  return OK;
}

/** Lancer un sort de la main, ou poser une casserole. */
function castFromHand(game: Game, p: Player, uid: number, targetUid?: number): ActionResult {
  const held = p.spells.find((x) => x.uid === uid);
  if (!held) return fail('Carte introuvable.');
  if (held.casseroleId) {
    const c = CASSEROLE_BY_ID[held.casseroleId];
    const m = p.board.find((x) => x.uid === targetUid) ?? null;
    if (!m) return fail('Choisissez le politique qui portera la casserole.');
    if (m.token) return fail('Un jeton ne peut pas porter de casserole.');
    p.spells = p.spells.filter((x) => x !== held);
    applyCasserole(game, p, m, c);
    return OK;
  }
  const spell = SPELL_BY_ID[held.spellId as string];
  if (spell.effects.some((e) => e.do === 'oublier') && !braceletTarget(p)) return fail('Aucun scandale sur le plateau.');
  let target: Minion | null = null;
  if (spell.target) {
    if (p.board.length === 0) return fail('Il faut un politique sur le plateau.');
    target = targetUid === undefined ? p.board[0] : (p.board.find((x) => x.uid === targetUid) ?? null);
    if (!target) return fail('Cible invalide.');
    if (spell.maxTargetTier !== undefined && (target.golden || target.token || target.simple || target.tier > spell.maxTargetTier)) {
      return fail(`Il faut un politique non doré d'échelon ${spell.maxTargetTier} ou moins.`);
    }
    // Une relance sur un politique qui n'a rien à relancer serait perdue (une Annonce qui détruit ne se relance pas).
    for (const eff of spell.effects) {
      if (eff.do === 'declencher' && relaunchable(target.effects, eff.trigger).length === 0) return fail('Ce politique n\'a rien à relancer.');
    }
  }
  if (held.count && held.count > 1) held.count--;
  else p.spells = p.spells.filter((x) => x !== held);
  if (spell.id === 'tract' && target) {
    target.atk += p.tract.atk;
    target.hp += p.tract.hp;
  } else if (spell.id === 'investiture') {
    // L'échelon a été fixé à la pose du doré (règle R2).
    const echelon = (held.tier ?? p.tier + 1) - p.tier;
    for (const eff of spell.effects) applyEffect(game, p, null, eff.do === 'decouvrir' ? { ...eff, echelon } : eff, { target });
  } else {
    for (const eff of spell.effects) applyEffect(game, p, null, eff, { target });
  }
  afterSpell(game, p, spell.id);
  return OK;
}

/**
 * Une casserole : son avantage tout de suite et pour toujours. Posée sur son propriétaire historique, elle donne en
 * plus son bonus de propriétaire, écrit sur la carte (`ownerBonus`). Son défaut dort. Au seuil, scandale : les défauts
 * de ses casseroles pas encore oubliées s'appliquent, jusqu'à l'oubli du peuple.
 */
function applyCasserole(game: Game, p: Player, m: Minion, c: Casserole): void {
  const owned = m.cardId === c.owner;
  m.casseroles.push(c.id);
  if (owned) m.ownerCasseroles.push(c.id);
  gainAdvantage(p, m, c);
  if (owned) gainAdvantage(p, m, c.ownerBonus);
  if (c.swapStats) [m.atk, m.hp] = [Math.max(0, m.hp), Math.max(1, m.atk)];
  // « Quel compte Facebook ? » : ni vu ni connu, tout est oublié.
  if (c.forgetsAll) {
    if (m.scandal) p.stats.forgotten++;
    forgetScandal(m);
  } else {
    m.charges += c.charges ?? 1;
    // Reçue en plein scandale, son défaut s'y ajoute tout de suite.
    if (m.scandal) addDefect(m, c);
    else if (m.charges >= scandalThreshold(game, p)) {
      startScandal(game, m);
      p.stats.scandals++;
    }
  }
  summonAndRecruit(game, p, m, c);
  if (owned) summonAndRecruit(game, p, m, c.ownerBonus);
  p.stats.casseroles++;
  incrementCounter(p, 'casseroles');
  fireBoard(game, p, 'casserole_recue', { played: m });
}

/** Ce qu'un avantage donne tout de suite : stats, mots-clés, effets, budget par manche, dégâts au héros, solitude, budget. */
function gainAdvantage(p: Player, m: Minion, gain: CasseroleBonus): void {
  m.atk = Math.max(0, m.atk + (gain.atk ?? 0));
  m.hp = Math.max(1, m.hp + (gain.hp ?? 0));
  for (const k of gain.keywords ?? []) if (!m.keywords.includes(k)) m.keywords.push(k);
  if (gain.effects) m.effects = [...m.effects, ...gain.effects];
  // Le budget par manche : le gain tout de suite, la perte seulement pendant un scandale.
  m.budgetPerRound += Math.max(0, gain.budgetPerRound ?? 0);
  m.bonusDamage += gain.bonusDamage ?? 0;
  m.aloneBonus += gain.aloneBonus ?? 0;
  p.budget += gain.instantBudget ?? 0;
}

/** Ce qu'un avantage fait arriver sur la table : un jeton à côté de lui, un politique gratuit de votre échelon. */
function summonAndRecruit(game: Game, p: Player, m: Minion, gain: CasseroleBonus): void {
  if (gain.summon && p.board.length < boardLimit(game, p)) {
    p.board.splice(p.board.indexOf(m) + 1, 0, welcome(game, p, makeToken(gain.summon, m.camp, game.nextUid++)));
  }
  if (gain.freeRecruit) {
    const cardId = drawFromTier(game, p.tier);
    if (cardId) addMinionToHand(game, p, cardId);
  }
}

export function casseroleCost(p: Player, c: Casserole): number {
  return Math.max(0, c.cost - (p.hero.mods.casseroleDiscount ?? 0));
}

export function buyCost(game: Game, p: Player): number {
  const discount = p.buysThisRound === 0 ? (p.hero.mods.firstBuyDiscount ?? 0) : 0;
  return Math.max(0, game.params.buyCost - discount);
}

export function rollCost(game: Game, p: Player): number {
  if (p.freeRolls > 0) return 0;
  return p.rollsThisRound < (p.hero.mods.freeRollsPerRound ?? 0) ? 0 : game.params.rollCost;
}

function moveMinion(p: Player, uid: number, to: number): ActionResult {
  const from = p.board.findIndex((m) => m.uid === uid);
  if (from < 0) return fail('Politique introuvable.');
  if (to < 0 || to >= p.board.length) return fail('Place invalide.');
  if (p.board[from].locked) return fail(p.board[from].bracelet ? 'Sous bracelet : il ne bouge plus avant la prochaine manche.' : 'Cloué par son scandale : il ne bouge plus.');
  if (p.board[to].locked) return fail('Cette place est tenue par un politique qui ne bouge plus.');
  p.board = reorderAroundLocked(p.board, from, to, (x) => x.locked) as Minion[];
  return OK;
}

/** Renvoyer : du plateau, la Vente joue ; de la main, rien. */
function sell(game: Game, p: Player, uid: number): ActionResult {
  const onBoard = p.board.find((m) => m.uid === uid);
  const m = onBoard ?? p.hand.find((x) => x.uid === uid);
  if (!m) return fail('Politique introuvable.');
  if (m.bracelet) return fail('Sous bracelet : il ne peut pas être renvoyé avant la prochaine manche.');
  if (onBoard) p.board = p.board.filter((x) => x !== m);
  else p.hand = p.hand.filter((x) => x !== m);
  releaseMinion(game, m);
  p.budget += game.params.sellValue + (p.hero.mods.sellBonus ?? 0);
  if (onBoard) {
    for (const eff of m.effects) if (eff.when === 'vente') applyEffect(game, p, m, eff);
    fireBoard(game, p, 'vente_allie', {});
  }
  return OK;
}

/** Point d'entrée unique : toute action de joueur ou de bot passe ici et y est validée. */
export function applyAction(game: Game, seat: number, a: PlayerAction): ActionResult {
  // Le protocole ne laisse passer que des entiers ; le moteur ne compte pas dessus.
  for (const v of Object.values(a)) if (typeof v === 'number' && !Number.isInteger(v)) return fail('Valeur invalide.');
  const p = game.players[seat];
  if (!p || !p.alive) return fail('Ce joueur est éliminé.');
  if (a.t === 'hero') return chooseHero(game, p, a.i);
  if (game.phase !== 'recrutement') return fail(PHASE_ERRORS[game.phase]);
  if (p.discover && a.t !== 'discover') return fail('Choisissez d\'abord votre carte.');

  switch (a.t) {
    case 'buy': {
      const cardId = p.shop[a.slot];
      if (!cardId) return fail('Emplacement vide.');
      const cost = buyCost(game, p);
      if (p.budget < cost) return fail('Budget insuffisant.');
      if (!handHasRoomFor(game, p, cardId)) return fail('Main pleine.');
      const completesTriple = tripleCopies([...p.board, ...p.hand], cardId).length >= 2;
      const staysInHand = a.main || completesTriple || p.board.length >= boardLimit(game, p);
      const to = a.to ?? p.board.length;
      if (!staysInHand && !insertAroundLocked(p.board, makeMinion(CARD_BY_ID[cardId], -1), to, (x) => x.locked)) return fail('Place invalide.');
      const gain = shopCardGain(game, p, cardId);
      spend(game, p, cost);
      p.buysThisRound++;
      p.shop.splice(a.slot, 1);
      const m = addMinionToHand(game, p, cardId, gain);
      if (m && !staysInHand && p.hand.includes(m)) playFromHand(game, p, m, to);
      return OK;
    }
    case 'buy_spell': {
      const spellId = p.shopSpells[a.slot];
      if (!spellId) return fail('Emplacement vide.');
      const cost = spellCost(game, SPELL_BY_ID[spellId].cost);
      if (p.budget < cost) return fail('Budget insuffisant.');
      if (handIsFull(game, p)) return fail('Main pleine.');
      spend(game, p, cost);
      p.shopSpells.splice(a.slot, 1);
      addSpellToHand(game, p, spellId);
      return OK;
    }
    case 'buy_casserole': {
      if (!p.casseroleOffer) return fail('Aucune casserole en boutique.');
      const cost = casseroleCost(p, CASSEROLE_BY_ID[p.casseroleOffer]);
      if (p.budget < cost) return fail('Budget insuffisant.');
      if (handIsFull(game, p)) return fail('Main pleine.');
      spend(game, p, cost);
      p.spells.push({ uid: game.nextUid++, casseroleId: p.casseroleOffer });
      p.casseroleOffer = null;
      return OK;
    }
    case 'play': {
      const m = p.hand.find((x) => x.uid === a.uid);
      if (!m) return fail('Carte introuvable.');
      return playFromHand(game, p, m, a.to ?? p.board.length, a.target, a.onto);
    }
    case 'cast':
      return castFromHand(game, p, a.uid, a.target);
    case 'sell':
      return sell(game, p, a.uid);
    case 'roll': {
      const cost = rollCost(game, p);
      if (p.budget < cost) return fail('Budget insuffisant.');
      if (p.freeRolls > 0) p.freeRolls--;
      else p.rollsThisRound++;
      spend(game, p, cost);
      refreshShop(game, p);
      return OK;
    }
    case 'freeze':
      p.frozen = !p.frozen;
      return OK;
    case 'upgrade': {
      if (p.tier >= game.params.tierMax) return fail('Échelon maximum atteint.');
      if (p.budget < upgradeCostFor(p)) return fail('Budget insuffisant.');
      spend(game, p, upgradeCostFor(p));
      p.tier++;
      p.upgradeCost = game.params.tierCost[p.tier + 1] ?? 0;
      return OK;
    }
    case 'move':
      return moveMinion(p, a.uid, a.to);
    case 'discover': {
      if (!p.discover) return fail('Aucun choix en attente.');
      if (!p.discover.options[a.i]) return fail('Choix invalide.');
      chooseDiscover(game, p, a.i);
      return OK;
    }
  }
}

export function upgradeCostFor(p: Player): number {
  return Math.max(0, p.upgradeCost - (p.hero.mods.upgradeDiscount ?? 0));
}

/** Ce qu'un siège a le droit de savoir. Le serveur n'envoie jamais rien d'autre. */
export interface PlayerView {
  seat: number;
  round: number;
  phase: GamePhase;
  /** Le plateau télé de la manche. Purement narratif. */
  plateau: Plateau;
  /** Qui tient la boutique sur ce plateau. */
  animateur: Animateur;
  /** Les héros à départager, pendant le choix. */
  heroOffers: string[] | null;
  alive: boolean;
  /** Place finale, 0 tant que le joueur est en lice. */
  place: number;
  hp: number;
  tier: number;
  budget: number;
  maxBudget: number;
  /** Le budget déjà gagné pour la manche suivante : ventes, effets « plus tard », fin de tour, paris. */
  nextBudget: number;
  upgradeCost: number;
  buyCost: number;
  rollCost: number;
  freeRolls: number;
  boardLimit: number;
  scandalThreshold: number;
  heroId: string;
  mods: HeroMods;
  board: Minion[];
  hand: Minion[];
  /** Sorts, piles de Tracts et casseroles en main. */
  spells: HandSpell[];
  handLimit: number;
  shop: string[];
  /** Les gains de boutique de chaque emplacement : la boutique montre les serviteurs déjà rendus. */
  shopGains: { atk: number; hp: number }[];
  shopSpells: string[];
  /** Le prix de chaque sort de la boutique. */
  shopSpellCosts: number[];
  frozen: boolean;
  casseroleOffer: string | null;
  casseroleCost: number | null;
  /** Le choix en cours : trois serviteurs ou trois sorts. */
  discover: string[] | null;
  discoverKind: 'serviteur' | 'sort' | null;
  /** Ce que donne un Tract. */
  tract: { atk: number; hp: number };
  counters: Record<Counter, number>;
  /** Ses propres chiffres de la partie : casseroles, scandales, oublis, triples, sorts. */
  stats: Player['stats'];
  camps: Camp[];
  contextId: string;
  params: Params;
  /** Le dernier plateau vu de chaque adversaire, le plus récent d'abord, avec la manche du combat. */
  seen: { seat: number; heroId: string; round: number; board: Minion[] }[];
  /** Informations publiques sur chaque joueur, comme à Battlegrounds : sondages, échelon, triples. */
  table: { seat: number; heroId: string | null; hp: number; tier: number; alive: boolean; boardSize: number; place: number; triples: number }[];
}

/** Ce qu'un siège voit de son propre combat. */
export interface CombatView {
  round: number;
  /** Le camp de ce siège dans le journal. */
  side: 0 | 1;
  /** -1 contre le fantôme du dernier éliminé. */
  opponent: { seat: number; heroId: string };
  log: CombatEvent[];
  winner: 0 | 1 | null;
  /** Sondages perdus par chaque camp à cause de ce combat. */
  damage: [number, number];
  /** La Fin de tour de ce siège, effet par effet : le client la joue sur la table avant le combat. */
  endOfTurn: EndOfTurnStep[];
}

/**
 * Une copie qui ne partage rien de modifiable avec l'original : un plateau vu en combat ne doit pas
 * suivre le scandale de l'adversaire après coup. Les effets restent les objets des cartes, que le
 * moteur ne modifie jamais et dont il compare l'identité (casseroles d'un effet, silence).
 */
function copyMinion(m: Minion): Minion {
  const copy: Minion = { ...m, keywords: [...m.keywords], effects: [...m.effects], casseroles: [...m.casseroles], merged: [...m.merged], rallied: [...m.rallied], ownerCasseroles: [...m.ownerCasseroles] };
  if (m.scandal) copy.scandal = { ...m.scandal, silenced: m.scandal.silenced ? [...m.scandal.silenced] : null };
  return copy;
}

/**
 * Ce que la vue montre d'un serviteur : une copie complète, effets compris. Chaque effet y dit sa puissance (`power`) :
 * la copie n'a plus l'identité des effets de la carte, qui dit lesquels un doré joue doublés.
 */
function viewMinion(m: Minion): Minion {
  const copy = copyMinion(m);
  copy.effects = m.effects.map((e) => ({ ...e, power: effectPower(m, e) }));
  if (m.scandal?.silenced && copy.scandal) copy.scandal.silenced = m.scandal.silenced.map((e) => ({ ...e, power: effectPower(m, e) }));
  return copy;
}

export function viewFor(game: Game, seat: number): PlayerView {
  const p = game.players[seat];
  const offer = p.casseroleOffer ? CASSEROLE_BY_ID[p.casseroleOffer] : null;
  const plateau = plateauFor(Math.max(1, game.round), game.players.filter((x) => x.alive).length);
  return {
    seat,
    round: game.round,
    phase: game.phase,
    plateau: { ...plateau },
    animateur: structuredClone(animateurFor(plateau.id)),
    heroOffers: p.heroOffers ? [...p.heroOffers] : null,
    alive: p.alive,
    place: p.place,
    hp: p.hp,
    tier: p.tier,
    budget: p.budget,
    maxBudget: maxBudget(game, p),
    nextBudget: p.nextBudgetBonus,
    upgradeCost: upgradeCostFor(p),
    buyCost: buyCost(game, p),
    rollCost: rollCost(game, p),
    freeRolls: p.freeRolls,
    boardLimit: boardLimit(game, p),
    scandalThreshold: scandalThreshold(game, p),
    heroId: p.hero.id,
    mods: { ...p.hero.mods },
    board: p.board.map(viewMinion),
    hand: p.hand.map(viewMinion),
    spells: p.spells.map((s) => ({ ...s })),
    handLimit: game.params.handSize,
    shop: [...p.shop],
    shopGains: p.shop.map((id) => shopCardGain(game, p, id)),
    shopSpells: [...p.shopSpells],
    shopSpellCosts: p.shopSpells.map((id) => spellCost(game, SPELL_BY_ID[id].cost)),
    frozen: p.frozen,
    casseroleOffer: p.casseroleOffer,
    casseroleCost: offer ? casseroleCost(p, offer) : null,
    discover: p.discover ? [...p.discover.options] : null,
    discoverKind: p.discover?.kind ?? null,
    tract: { ...p.tract },
    counters: { ...p.counters },
    stats: { ...p.stats },
    camps: [...game.camps],
    contextId: game.ctx.id,
    params: structuredClone(game.params),
    seen: p.seen.map((s) => ({ seat: s.seat, heroId: s.heroId, round: s.round, board: s.board.map(viewMinion) })),
    table: game.players.map((x) => ({
      seat: x.seat,
      // Un héros encore à choisir ne se révèle pas : ce n'est qu'une valeur par défaut.
      heroId: x.heroOffers ? null : x.hero.id,
      hp: x.hp,
      tier: x.tier,
      alive: x.alive,
      boardSize: x.board.length,
      place: x.place,
      triples: x.stats.triples,
    })),
  };
}

/** Le combat de ce siège pour la manche en cours : le seul moment où il voit un plateau adverse. */
export function combatViewFor(game: Game, seat: number): CombatView | null {
  const record = game.roundCombats.find((c) => c.a === seat || c.b === seat);
  if (!record) return null;
  const side = record.a === seat ? 0 : 1;
  const opponentSeat = side === 0 ? record.b : record.a;
  return {
    round: game.round,
    side,
    opponent: { seat: opponentSeat, heroId: opponentSeat < 0 ? 'fantome' : game.players[opponentSeat].hero.id },
    log: record.result.log,
    winner: record.result.winner,
    damage: record.damage,
    endOfTurn: game.players[seat].endOfTurnSteps.map((step) => ({ ...step, changes: step.changes.map((c) => ({ ...c, keywords: [...c.keywords] })), notes: [...step.notes] })),
  };
}

/** Les sièges du mieux au moins bien classé. */
export function finalRanking(game: Game): { seat: number; heroId: string; place: number }[] {
  return game.players
    .map((p) => ({ seat: p.seat, heroId: p.hero.id, place: p.place }))
    .sort((a, b) => a.place - b.place);
}

/** Le fantôme du dernier éliminé, dans l'appariement. */
const GHOST = -1;
/** Retrouver l'adversaire d'il y a 1, 2, 3 ou 4 manches. */
const RECENT_MEETING_COST = [1000, 300, 100, 30];
/** Chaque rencontre déjà faite, même ancienne : chacun finit par croiser tout le monde. */
const REPEAT_MEETING_COST = 10;

function meetingCost(history: number[], other: number): number {
  let cost = 0;
  for (let back = 1; back <= Math.min(history.length, RECENT_MEETING_COST.length); back++) {
    if (history[history.length - back] === other) cost += RECENT_MEETING_COST[back - 1];
  }
  return cost + REPEAT_MEETING_COST * history.filter((seat) => seat === other).length;
}

/** Passer à côté d'une rencontre que le cycle ne pourrait plus faire : chacun doit croiser tout le monde. */
const STRANDED_MEETING_COST = 200;
/** Au-delà, trop d'appariements à essayer : chacun prend l'adversaire le moins coûteux qui reste. */
const MAX_EXACT_NODES = 12;

/**
 * Les rencontres de la manche, comme à Battlegrounds : on ne retrouve pas un adversaire récent tant
 * qu'il en reste d'autres, et chacun croise tout le monde. En nombre impair, le fantôme tourne aussi.
 * Tous les appariements sont essayés (105 à 8 joueurs) ; le hasard ne départage que les égalités.
 */
function pairPlayers(game: Game): [number, number | null][] {
  const seats = game.players.filter((p) => p.alive).map((p) => p.seat);
  const nodes = seats.length % 2 === 1 ? [...seats, GHOST] : seats;
  const n = nodes.length;
  const cost = nodes.map(() => new Array<number>(n).fill(0));
  const unmet = nodes.map(() => new Array<boolean>(n).fill(false));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = [nodes[i], nodes[j]];
      const own = a === GHOST ? 0 : meetingCost(game.players[a].opponents, b);
      const theirs = b === GHOST ? 0 : meetingCost(game.players[b].opponents, a);
      cost[i][j] = cost[j][i] = own + theirs + game.rng.next();
      unmet[i][j] = unmet[j][i] = a !== GHOST && b !== GHOST && !game.players[a].opponents.includes(b);
    }
  }
  const pairs = n <= MAX_EXACT_NODES ? bestMatching(cost, seats.length % 2 === 0 ? unmet : null) : greedyMatching(cost);
  return pairs.map(([i, j]) => {
    const [a, b] = game.rng.next() < 0.5 ? [nodes[i], nodes[j]] : [nodes[j], nodes[i]];
    if (a === GHOST) return [b, null];
    return [a, b === GHOST ? null : b];
  });
}

/** Tous les appariements parfaits de `nodes`. */
function allMatchings(nodes: number[]): [number, number][][] {
  if (nodes.length === 0) return [[]];
  const [first, ...rest] = nodes;
  return rest.flatMap((other, k) => allMatchings(rest.filter((_, m) => m !== k)).map((tail) => [[first, other] as [number, number], ...tail]));
}

/** Peut-on encore apparier tout le monde avec des rencontres jamais faites ? */
function hasPerfectMatching(edges: boolean[][], left: number[]): boolean {
  if (left.length === 0) return true;
  const [first, ...rest] = left;
  return rest.some((other, k) => edges[first][other] && hasPerfectMatching(edges, rest.filter((_, m) => m !== k)));
}

/**
 * L'appariement le moins coûteux. Tant que des rencontres restent à faire, il évite celui après
 * lequel les rencontres jamais faites ne pourraient plus apparier tout le monde : le cycle se bloquerait.
 */
function bestMatching(cost: number[][], unmet: boolean[][] | null): [number, number][] {
  const all = cost.map((_, i) => i);
  const lookahead = unmet !== null && hasPerfectMatching(unmet, all);
  let best: [number, number][] = [];
  let bestCost = Infinity;
  for (const matching of allMatchings(all)) {
    let total = matching.reduce((sum, [i, j]) => sum + cost[i][j], 0);
    if (lookahead && unmet) {
      const residual = unmet.map((row) => [...row]);
      for (const [i, j] of matching) residual[i][j] = residual[j][i] = false;
      const anyLeft = residual.some((row) => row.some(Boolean));
      if (anyLeft && !hasPerfectMatching(residual, all)) total += STRANDED_MEETING_COST;
    }
    if (total < bestCost) {
      bestCost = total;
      best = matching;
    }
  }
  return best;
}

/** Beaucoup de sièges : chacun prend, dans l'ordre, l'adversaire le moins coûteux qui reste. */
function greedyMatching(cost: number[][]): [number, number][] {
  const left = cost.map((_, i) => i);
  const pairs: [number, number][] = [];
  while (left.length > 1) {
    const i = left.shift() as number;
    let pick = 0;
    for (let k = 1; k < left.length; k++) if (cost[i][left[k]] < cost[i][left[pick]]) pick = k;
    pairs.push([i, left.splice(pick, 1)[0]]);
  }
  return pairs;
}

function damageCap(game: Game, alive: number): number {
  if (alive <= game.params.capOffWhenAlive) return Infinity;
  let cap = Infinity;
  for (const [round, value] of game.params.damageCaps) if (game.round >= round) cap = value;
  return cap;
}

function hit(game: Game, winner: Player | null, loser: Player, result: CombatRecord['result'], winSide: 0 | 1): number {
  const tier = winner ? winner.tier : (game.lastEliminated ? 3 : 1);
  const raw = tier + result.survivors[winSide] * game.params.damagePerSurvivor + result.bonusDamage[winSide];
  const alive = game.players.filter((p) => p.alive).length;
  const damage = Math.min(raw, damageCap(game, alive));
  loser.hp -= damage;
  loser.lostLast = true;
  return damage;
}

/** Enchaîne les deux moitiés d'une manche. Le serveur les sépare pour laisser jouer les animations. */
export function resolveRound(game: Game): void {
  startCombats(game);
  finishRound(game);
}

/** Lance la manche suivante, ou termine la partie. */
export function finishRound(game: Game): void {
  if (game.phase !== 'combat') return;
  if (game.players.filter((p) => p.alive).length <= 1) {
    const last = game.players.find((p) => p.alive);
    if (last) last.place = 1;
    enterPhase(game, 'fini');
    return;
  }
  enterPhase(game, 'recrutement');
  startRound(game);
}

/** Ce qu'un combat laisse au joueur : gains durables, Célébration ou Droit de réponse, pari de défaite. */
function afterCombat(game: Game, p: Player, side: 0 | 1, record: CombatRecord): void {
  const { result } = record;
  applyPersist(game, p, result.persist[side]);
  for (const celebrant of result.celebrants) if (celebrant.side === side) afterCombatSpeech(game, p, celebrant.uid, 'celebration', result.celebrationRepeats);
  // Chaque Droit de réponse joue, comme chaque Célébration : un seul prend la parole (`responder`).
  for (const answer of result.responders) if (answer.side === side) afterCombatSpeech(game, p, answer.uid, 'droit_de_reponse');
  const lost = result.winner !== null && result.winner !== side;
  if (lost && p.lossBet > 0) p.nextBudgetBonus += p.lossBet;
  p.lossBet = 0;
}

/** Fin du recrutement : déclenche les effets, joue tous les combats et applique leurs résultats. */
export function startCombats(game: Game): void {
  if (game.phase !== 'recrutement') return;
  for (const p of game.players) {
    if (!p.alive) continue;
    p.endOfTurnSteps = [];
    settleDiscovers(game, p);
    endOfTurn(game, p);
    settleDiscovers(game, p);
    heroEndOfTurn(p);
    p.lostLast = false;
  }

  game.roundCombats = [];
  const before = game.players.map((p) => p.hp);
  const pairs = pairPlayers(game);
  const startUid = game.nextUid + 1_000_000;
  for (const [sa, sb] of pairs) {
    const pa = game.players[sa];
    const pb = sb === null ? null : game.players[sb];
    const ghost = game.lastEliminated ?? [];
    const opponentBoard = pb ? pb.board : ghost;
    const result = resolveCombat(
      { minions: pa.board, mods: pa.hero.mods, hp: pa.hp, tier: pa.tier, tract: pa.tract, campBuffs: pa.campBuffs },
      { minions: opponentBoard, mods: pb ? pb.hero.mods : {}, hp: pb ? pb.hp : 0, tier: pb ? pb.tier : 3, tract: pb?.tract, campBuffs: pb?.campBuffs },
      { params: game.params, ctx: game.ctx, rng: game.rng, uidStart: startUid, log: game.combatLog },
    );
    const damage: [number, number] = [result.deathPenalty[0], pb ? result.deathPenalty[1] : 0];
    const record: CombatRecord = { a: sa, b: sb ?? -1, result, evenBoards: pa.board.length === opponentBoard.length, damage };
    game.roundCombats.push(record);

    pa.seen = remember(pa.seen, { seat: sb ?? GHOST, heroId: pb?.hero.id ?? 'fantome', round: game.round, board: opponentBoard.map(copyMinion) });
    pa.opponents.push(sb ?? GHOST);
    if (pb) {
      pb.seen = remember(pb.seen, { seat: sa, heroId: pa.hero.id, round: game.round, board: pa.board.map(copyMinion) });
      pb.opponents.push(sa);
    }

    pa.hp -= result.deathPenalty[0];
    if (pb) pb.hp -= result.deathPenalty[1];
    if (result.winner === 0 && pb) damage[1] += hit(game, pa, pb, result, 0);
    if (result.winner === 1) damage[0] += hit(game, pb, pa, result, 1);

    afterCombat(game, pa, 0, record);
    if (pb) afterCombat(game, pb, 1, record);
  }

  // La lassitude des électeurs : garantit que la partie se termine, même entre deux plateaux qui font égalité.
  if (game.round >= game.params.wearinessRound) {
    const loss = game.round - game.params.wearinessRound + 1;
    for (const p of game.players) if (p.alive) p.hp -= loss;
  }
  for (const p of game.players) {
    if (p.alive && p.lostLast && p.hero.mods.lossBudget) p.nextBudgetBonus += p.hero.mods.lossBudget;
  }
  game.hpSnapshot.set(game.round, game.players.map((p) => (p.alive ? p.hp : -999)));
  settleEliminations(game, before);
  enterPhase(game, 'combat');
}

/** Le dernier plateau vu de chaque adversaire, le plus récent d'abord : un par siège, le fantôme compris. */
function remember(seen: Player['seen'], entry: Player['seen'][number]): Player['seen'] {
  return [entry, ...seen.filter((other) => other.seat !== entry.seat)];
}

function settleEliminations(game: Game, before: number[]): void {
  const dead = game.players.filter((p) => p.alive && p.hp <= 0);
  if (dead.length === 0) return;
  const alive = game.players.filter((p) => p.alive).length;
  dead.sort((a, b) => a.hp - b.hp || before[a.seat] - before[b.seat] || a.seat - b.seat);
  const allDead = dead.length === alive;
  dead.forEach((p, i) => {
    p.alive = false;
    p.place = alive - i;
    for (const m of [...p.board, ...p.hand]) releaseMinion(game, m);
    for (const id of p.shop) returnToPool(game, id);
    dropDiscovers(game, p);
    p.shop = [];
  });
  game.lastEliminated = dead[dead.length - 1].board.map(copyMinion);
  if (allDead) {
    const best = dead[dead.length - 1];
    best.place = 1;
    dead.forEach((p, i) => {
      p.place = dead.length - i;
    });
  }
}

export { HEROES };
