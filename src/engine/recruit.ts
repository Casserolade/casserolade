import type { Camp, Casserole, CombatPersist, Counter, Effect, EndOfTurnNote, EndOfTurnStep, Minion, Trigger } from './types.ts';
import type { Game, Offer, Player, StatGain } from './state.ts';
import { isCamp as isCampOf } from './camps.ts';
import { makeMinion, makeSimpleCopy, makeToken, poolCopies, tripleCopies } from './minion.ts';
import { CARDS, CARD_BY_ID } from '../data/cards.ts';
import { CASSEROLES, CASSEROLE_BY_ID } from '../data/casseroles.ts';
import { SPELL_BY_ID, shopSpells } from '../data/sorts.ts';

/**
 * Le recrutement : la boutique, la main, les découvertes, et tous les effets hors combat.
 * C'est là que les plateaux grandissent : chaque geste du joueur peut en déclencher d'autres.
 */

/** Le contexte d'un effet : la cible choisie, le serviteur joué (ou qui reçoit une casserole). */
export interface EffectContext {
  target?: Minion | null;
  played?: Minion | null;
}

export function isCamp(game: Game, m: Pick<Minion, 'camp' | 'keywords'>, camp: Camp): boolean {
  return isCampOf(m, camp, game.ctx.extremesAllied ?? false);
}

export function boardLimit(game: Game, p: Player): number {
  return game.params.boardSize + (p.hero.mods.boardDelta ?? 0);
}

/** Les cartes en main : serviteurs, sorts, casseroles. Une pile de Tracts compte pour une. */
export function handCount(p: Player): number {
  return p.hand.length + p.spells.length;
}

export function handIsFull(game: Game, p: Player): boolean {
  return handCount(p) >= game.params.handSize;
}

export function maxBudget(game: Game, p: Player): number {
  return game.params.maxBudget + p.maxBudgetBonus;
}

// La réserve et la boutique.

export function draw(game: Game, tier: number, filter: (cardId: string) => boolean = () => true): string | null {
  let total = 0;
  for (const [id, n] of game.pool) if (CARD_BY_ID[id].tier <= tier && filter(id)) total += n;
  if (total === 0) return null;
  let r = game.rng.int(total);
  for (const [id, n] of game.pool) {
    if (CARD_BY_ID[id].tier > tier || !filter(id)) continue;
    if (r < n) {
      game.pool.set(id, n - 1);
      return id;
    }
    r -= n;
  }
  return null;
}

/**
 * Un exemplaire de cet échelon précis, pas en dessous : « un politique de votre échelon » dit ce qu'il donne.
 * Seul un échelon épuisé se rabat sur l'échelon le plus proche en dessous.
 */
export function drawFromTier(game: Game, tier: number): string | null {
  for (let t = tier; t >= 1; t--) {
    const id = draw(game, t, (cardId) => CARD_BY_ID[cardId].tier === t);
    if (id) return id;
  }
  return null;
}

/** Retire un exemplaire précis de la réserve, s'il en reste. */
export function take(game: Game, cardId: string): boolean {
  const n = game.pool.get(cardId) ?? 0;
  if (n <= 0) return false;
  game.pool.set(cardId, n - 1);
  return true;
}

export function returnToPool(game: Game, cardId: string, n = 1): void {
  if (game.pool.has(cardId)) game.pool.set(cardId, (game.pool.get(cardId) ?? 0) + n);
}

/** Un serviteur qui quitte la partie rend ses exemplaires, cartes ralliées comprises. */
export function releaseMinion(game: Game, m: Minion): void {
  for (const [id, n] of poolCopies(m)) returnToPool(game, id, n);
}

export function refillShop(game: Game, p: Player, camp?: Camp): void {
  for (const id of p.shop) returnToPool(game, id);
  p.shop = [];
  const size = game.params.shopSize[p.tier];
  const inCamp = (id: string) => !camp || isCamp(game, makeMinion(CARD_BY_ID[id], -1), camp);
  for (let i = 0; i < size; i++) {
    const id = draw(game, p.tier, inCamp) ?? (camp ? draw(game, p.tier) : null);
    if (id) p.shop.push(id);
  }
  const spells = shopSpells(p.tier);
  p.shopSpells = [];
  for (let i = 0; i < game.params.spellSlots && spells.length > 0; i++) p.shopSpells.push(game.rng.pick(spells).id);
  // Le Bracelet suit les scandales : il arrive quand il sert, même à l'échelon 1.
  if (p.shopSpells.length > 0 && braceletTarget(p) && game.rng.next() < game.params.braceletChance) p.shopSpells[0] = 'bracelet_electronique';
}

function sumGains(game: Game, gains: StatGain[], m: Pick<Minion, 'camp' | 'keywords' | 'cardId'>): { atk: number; hp: number } {
  let atk = 0;
  let hp = 0;
  for (const g of gains) {
    if (g.camp && !isCamp(game, m, g.camp)) continue;
    if (g.card && (m as Minion).cardId !== g.card) continue;
    atk += g.atk;
    hp += g.hp;
  }
  return { atk, hp };
}

/** Ce que gagne un serviteur de la boutique, gains de boutique compris. */
export function shopCardGain(game: Game, p: Player, cardId: string): { atk: number; hp: number } {
  return sumGains(game, p.shopBuffs, makeMinion(CARD_BY_ID[cardId], -1));
}

export function spellCost(game: Game, cost: number): number {
  return Math.max(0, cost - game.params.spellDiscount);
}

// Le budget.

/** Dépenser : la Dépense (N) se déclenche à chaque tranche franchie. */
export function spend(game: Game, p: Player, amount: number): void {
  if (amount <= 0) return;
  const before = p.spent;
  p.budget -= amount;
  p.spent += amount;
  for (const m of [...p.board]) {
    for (const eff of m.effects) {
      if (eff.when !== 'depense') continue;
      const n = Math.max(1, eff.n ?? 5);
      const crossings = Math.floor(p.spent / n) - Math.floor(before / n);
      for (let i = 0; i < crossings && p.board.includes(m); i++) applyEffect(game, p, m, eff);
    }
  }
}

// Les compteurs « cette partie ».

/** Ce qu'un serviteur gagne de ses compteurs en arrivant : il rattrape toute la partie. */
function counterGain(p: Player, m: Minion): { atk: number; hp: number } {
  let atk = 0;
  let hp = 0;
  for (const eff of m.effects) {
    if (eff.when !== 'aura' || eff.do !== 'compteur') continue;
    const k = m.golden ? 2 : 1;
    atk += eff.atk * p.counters[eff.compteur] * k;
    hp += eff.hp * p.counters[eff.compteur] * k;
  }
  return { atk, hp };
}

export function incrementCounter(p: Player, counter: Counter, by = 1): void {
  if (by <= 0) return;
  p.counters[counter] += by;
  for (const m of [...p.board, ...p.hand]) {
    for (const eff of m.effects) {
      if (eff.when !== 'aura' || eff.do !== 'compteur' || eff.compteur !== counter) continue;
      const k = m.golden ? 2 : 1;
      addStats(m, eff.atk * by * k, eff.hp * by * k);
    }
  }
}

// La main.

/** Un nouveau serviteur reçoit les gains de camp et de compteurs déjà acquis. */
export function welcome(game: Game, p: Player, m: Minion): Minion {
  const gain = sumGains(game, p.campBuffs, m);
  const counted = counterGain(p, m);
  addStats(m, gain.atk + counted.atk, gain.hp + counted.hp);
  return m;
}

/** La carte a-t-elle sa place en main, compte tenu d'une éventuelle fusion ? */
export function handHasRoomFor(game: Game, p: Player, cardId: string): boolean {
  const owned = tripleCopies([...p.board, ...p.hand], cardId);
  const freed = owned.length >= 2 ? tripleCopies(p.hand, cardId).length : 0;
  return handCount(p) - freed < game.params.handSize;
}

/** Ajoute un serviteur déjà sorti de la réserve. Main pleine, il y retourne. */
export function addMinionToHand(game: Game, p: Player, cardId: string, extra = { atk: 0, hp: 0 }): Minion | null {
  if (!handHasRoomFor(game, p, cardId)) {
    returnToPool(game, cardId);
    return null;
  }
  const m = welcome(game, p, makeMinion(CARD_BY_ID[cardId], game.nextUid++));
  addStats(m, extra.atk, extra.hp);
  p.hand.push(m);
  fuseIfTriple(game, p, cardId);
  return m;
}

/**
 * La copie d'un politique gagnée par un effet (Lalanne) : un vrai exemplaire de la réserve, qui compte
 * pour un triple, comme à Battlegrounds (règle R3, revue le 3 novembre 2026 : trois Lalanne sans triple,
 * c'était un bug pour le joueur). S'il n'en reste plus, une copie simple, qui ne compte pas.
 */
function addCopy(game: Game, p: Player, cardId: string): void {
  if (take(game, cardId)) addMinionToHand(game, p, cardId);
  else addSimpleCopy(game, p, cardId);
}

/** Une copie simple : hors réserve, jamais dorée, jamais comptée pour un triple. Seulement quand la réserve est vide. */
function addSimpleCopy(game: Game, p: Player, cardId: string): void {
  if (handIsFull(game, p)) return;
  const m = makeSimpleCopy(cardId, game.nextUid++);
  if (m) p.hand.push(welcome(game, p, m));
}

/**
 * Ajoute un sort. Les Tracts s'empilent ; un Tract gagné main pleine se joue tout seul
 * sur le premier serviteur (règle R5). Les autres sorts sont perdus main pleine.
 */
export function addSpellToHand(game: Game, p: Player, spellId: string, tier?: number): boolean {
  if (!SPELL_BY_ID[spellId]) return false;
  if (spellId === 'tract') {
    const stack = p.spells.find((s) => s.spellId === 'tract');
    if (stack) {
      stack.count = (stack.count ?? 1) + 1;
      return true;
    }
    if (handIsFull(game, p)) {
      if (p.board[0]) playTract(game, p, p.board[0], 1);
      return false;
    }
    p.spells.push({ uid: game.nextUid++, spellId, count: 1 });
    return true;
  }
  if (handIsFull(game, p)) return false;
  p.spells.push({ uid: game.nextUid++, spellId, ...(tier !== undefined ? { tier } : {}) });
  return true;
}

/** Ajoute n'importe quelle carte : un sort, une copie simple, ou un serviteur pris dans la réserve s'il en reste. */
function addCard(game: Game, p: Player, cardId: string, source: Minion | null): void {
  if (cardId === 'sort_aleatoire') {
    const spells = shopSpells(p.tier);
    if (spells.length > 0) addSpellToHand(game, p, game.rng.pick(spells).id);
    return;
  }
  if (cardId === 'copie') {
    if (source) addCopy(game, p, source.cardId);
    return;
  }
  if (SPELL_BY_ID[cardId]) {
    addSpellToHand(game, p, cardId);
    return;
  }
  if (CARD_BY_ID[cardId]) {
    if (take(game, cardId)) addMinionToHand(game, p, cardId);
    else addSimpleCopy(game, p, cardId);
  }
}

/** Trois exemplaires, en main ou sur le plateau, fusionnent en un doré qui arrive en main. */
export function fuseIfTriple(game: Game, p: Player, cardId: string): void {
  const copies = tripleCopies([...p.board, ...p.hand], cardId);
  if (copies.length < 3) return;
  const card = CARD_BY_ID[cardId];
  const parts = copies.slice(0, 3);
  // Les défauts d'un scandale en cours ne passent pas tels quels : le doré refait scandale s'il le faut.
  // Un exemplaire réduit au silence rend d'abord ses effets, Ralliements compris.
  const ongoing = parts.map(liftScandal).some(Boolean);
  const golden = parts[0];
  const buffAtk = parts.reduce((s, m) => s + (m.atk - card.atk), 0);
  const buffHp = parts.reduce((s, m) => s + (m.hp - card.hp), 0);
  golden.atk = card.atk * 2 + buffAtk;
  golden.hp = card.hp * 2 + buffHp;
  golden.golden = true;
  golden.copies = 3;
  golden.keywords = [...new Set(parts.flatMap((m) => m.keywords))];
  const base = card.effects ?? [];
  golden.effects = [...base, ...parts.flatMap((m) => withoutBase(m.effects, base))];
  golden.merged = parts.flatMap((m) => m.merged);
  // Les casseroles oubliées d'abord, puis celles qui ne le sont pas encore.
  golden.casseroles = [...parts.flatMap((m) => m.casseroles.slice(0, m.oublie)), ...parts.flatMap((m) => m.casseroles.slice(m.oublie))];
  golden.oublie = parts.reduce((s, m) => s + m.oublie, 0);
  golden.charges = parts.reduce((s, m) => s + m.charges, 0);
  golden.budgetPerRound = parts.reduce((s, m) => s + m.budgetPerRound, 0);
  golden.bonusDamage = parts.reduce((s, m) => s + m.bonusDamage, 0);
  golden.hpLossOnDeath = parts.reduce((s, m) => s + m.hpLossOnDeath, 0);
  golden.aloneBonus = parts.reduce((s, m) => s + m.aloneBonus, 0);
  // Le doré part en main, libre : un bracelet ne le suit pas, et un scandale le recloue ci-dessous s'il le faut.
  golden.locked = false;
  delete golden.bracelet;
  if (golden.charges >= scandalThreshold(game, p)) {
    startScandal(game, golden);
    // Un scandale en cours continue sur le doré ; sinon, c'en est un nouveau.
    if (!ongoing) p.stats.scandals++;
  }
  p.board = p.board.filter((m) => !parts.includes(m));
  p.hand = p.hand.filter((m) => !parts.includes(m));
  p.hand.push(golden);
  p.stats.triples++;
}

// Les découvertes.

function queueOffer(p: Player, offer: Offer): void {
  if (offer.options.length === 0) return;
  if (p.discover) p.discoverQueue.push(offer);
  else p.discover = offer;
}

/**
 * Jusqu'à trois serviteurs différents de l'échelon visé, réservés le temps du choix. « De votre échelon » veut dire
 * cet échelon, jamais en dessous : s'il en manque, le choix est plus court, comme dans Battlegrounds. Seul un échelon
 * sans aucun candidat (aucun politique à Annonce d'échelon 5) se rabat sur l'échelon le plus proche en dessous.
 * Un camp absent de la partie est ignoré (règle R7). La carte `source`, celle qui découvre, n'est jamais proposée.
 */
export function offerMinions(game: Game, p: Player, tier: number, camp?: Camp, trigger?: Trigger, source?: string): void {
  const target = Math.max(1, Math.min(tier, game.params.tierMax));
  const campOk = (id: string) => !camp || camp === 'civile' || !game.camps.includes(camp) || isCamp(game, makeMinion(CARD_BY_ID[id], -1), camp);
  const triggerOk = (id: string) => !trigger || (CARD_BY_ID[id].effects ?? []).some((e) => e.when === trigger);
  const available = [...game.pool.entries()].filter(([id, n]) => n > 0 && id !== source && campOk(id) && triggerOk(id)).map(([id]) => id);
  const options = game.rng.shuffle(closestTier(available, target)).slice(0, 3);
  for (const id of options) take(game, id);
  queueOffer(p, { options, kind: 'serviteur' });
}

/** Les cartes de l'échelon visé ; à défaut, celles de l'échelon le plus proche en dessous. */
function closestTier(cardIds: string[], tier: number): string[] {
  for (let t = tier; t >= 1; t--) {
    const at = cardIds.filter((id) => CARD_BY_ID[id].tier === t);
    if (at.length > 0) return at;
  }
  return [];
}

function offerSpells(game: Game, p: Player, tier: number): void {
  const options = game.rng.shuffle(shopSpells(Math.min(tier, game.params.tierMax)).map((s) => s.id)).slice(0, 3);
  queueOffer(p, { options, kind: 'sort' });
}

export function chooseDiscover(game: Game, p: Player, i: number): void {
  const offer = p.discover as Offer;
  p.discover = p.discoverQueue.shift() ?? null;
  if (offer.kind === 'serviteur') {
    offer.options.forEach((id, j) => {
      if (j !== i) returnToPool(game, id);
    });
    addMinionToHand(game, p, offer.options[i]);
  } else {
    addSpellToHand(game, p, offer.options[i]);
  }
}

/** Le minuteur est écoulé : chaque choix en attente prend sa première carte. */
export function settleDiscovers(game: Game, p: Player): void {
  for (let guard = 0; p.discover && guard < 30; guard++) chooseDiscover(game, p, 0);
}

/** Un joueur éliminé rend les cartes de ses choix en attente. */
export function dropDiscovers(game: Game, p: Player): void {
  for (const offer of [p.discover, ...p.discoverQueue]) {
    if (offer?.kind === 'serviteur') for (const id of offer.options) returnToPool(game, id);
  }
  p.discover = null;
  p.discoverQueue = [];
}

// Les effets.

/** Un serviteur doré double les valeurs de ses effets. */
function power(m: Minion | null): number {
  return m?.golden ? 2 : 1;
}

/** Combien de fois un déclencheur joue : Chirac, Lassalle et Mitterrand doublent, triplent s'ils sont dorés. */
export function repeatCount(p: Player, trigger: 'annonce' | 'heritage' | 'fin_tour' | 'celebration'): number {
  let count = 1;
  for (const m of p.board) {
    for (const eff of m.effects) {
      if (eff.when === 'aura' && eff.do === 'doubler' && eff.trigger === trigger) count = Math.max(count, m.golden ? 3 : 2);
    }
  }
  return count;
}

/** Le seuil du scandale : Fillon et le pouvoir de Sarkozy le repoussent. */
export function scandalThreshold(game: Game, p: Player): number {
  let extra = 0;
  for (const m of p.board) {
    for (const eff of m.effects) if (eff.when === 'aura' && eff.do === 'scandale_plus') extra = Math.max(extra, eff.value * power(m));
  }
  return game.params.scandalThreshold + (p.hero.mods.scandalThresholdDelta ?? 0) + extra;
}

/** Les effets que ses casseroles lui ont donnés : un silence ne les touche pas. */
function casseroleEffects(m: Minion): Set<Effect> {
  return new Set(m.casseroles.flatMap((id) => CASSEROLE_BY_ID[id]?.effects ?? []));
}

/**
 * Le défaut d'une casserole rejoint le scandal en cours : budget perdu à chaque manche, sondages
 * perdus à sa mort, cloué sur place, réduit au silence. Tout est noté pour être rendu à l'oubli.
 */
export function addDefect(m: Minion, c: Casserole): void {
  const scandal = m.scandal;
  if (!scandal) return;
  const budget = Math.min(0, c.budgetPerRound ?? 0);
  scandal.budget += budget;
  m.budgetPerRound += budget;
  scandal.hpLoss += c.hpLossOnDeath ?? 0;
  m.hpLossOnDeath += c.hpLossOnDeath ?? 0;
  if (c.locked) {
    m.locked = true;
    scandal.locked = true;
  }
  if (c.silence && !scandal.silenced) {
    const fromCasseroles = casseroleEffects(m);
    scandal.silenced = m.effects.filter((e) => !fromCasseroles.has(e));
    m.effects = m.effects.filter((e) => fromCasseroles.has(e));
  }
}

/** Le scandale éclate : les défauts de ses casseroles pas encore oubliées s'appliquent. */
export function startScandal(game: Game, m: Minion): void {
  m.scandal = { until: game.round + game.params.scandalRounds, budget: 0, hpLoss: 0, locked: false, silenced: null };
  for (const id of m.casseroles.slice(m.oublie)) addDefect(m, CASSEROLE_BY_ID[id]);
}

/**
 * Lève les défauts d'un scandale sans rien oublier : une fusion les recompte ensuite.
 * Vrai s'il y avait un scandale.
 */
function liftScandal(m: Minion): boolean {
  const scandal = m.scandal;
  if (!scandal) return false;
  m.budgetPerRound -= scandal.budget;
  m.hpLossOnDeath -= scandal.hpLoss;
  // Sous bracelet, il reste cloué : le bracelet tombe à la manche suivante (releaseBracelet).
  if (scandal.locked) m.locked = Boolean(m.bracelet);
  if (scandal.silenced) m.effects = [...scandal.silenced, ...m.effects];
  delete m.scandal;
  return true;
}

/** La manche suivante, le bracelet tombe : il bouge et se renvoie de nouveau, sauf si un scandale le cloue encore. */
export function releaseBracelet(m: Minion): void {
  if (!m.bracelet) return;
  delete m.bracelet;
  m.locked = Boolean(m.scandal?.locked);
}

/** L'oubli du peuple : les défauts s'effacent, les casseroles restent, comme des médailles. */
export function forgetScandal(m: Minion): void {
  liftScandal(m);
  m.oublie = m.casseroles.length;
  m.charges = 0;
}

/**
 * Le Ralliement : le serviteur rejoint son hôte, qui prend ses stats, ses mots-clés et ses effets.
 * Un doré issu d'un triple peut porter des casseroles : l'hôte les prend aussi, avec leurs avantages.
 * Rien ne se perd, et on n'efface pas un scandale en ralliant. L'hôte les reçoit comme des
 * casseroles posées, sans rejouer leurs avantages, déjà dans les stats du rallié.
 */
export function rally(game: Game, p: Player, host: Minion, m: Minion): void {
  const ongoing = liftScandal(m);
  host.atk += m.atk;
  host.hp += m.hp;
  for (const k of m.keywords) if (k !== 'ralliement' && !host.keywords.includes(k)) host.keywords.push(k);
  host.effects = [...host.effects, ...m.effects];
  host.merged = [...host.merged, ...(m.copies > 0 ? Array.from({ length: m.copies }, () => m.cardId) : [m.cardId]), ...m.merged];
  if (m.casseroles.length === 0) return;
  const live = m.casseroles.slice(m.oublie);
  host.casseroles = [...host.casseroles.slice(0, host.oublie), ...m.casseroles.slice(0, m.oublie), ...host.casseroles.slice(host.oublie), ...live];
  host.oublie += m.oublie;
  host.charges += m.charges;
  host.budgetPerRound += m.budgetPerRound;
  host.bonusDamage += m.bonusDamage;
  host.hpLossOnDeath += m.hpLossOnDeath;
  host.aloneBonus += m.aloneBonus;
  if (host.scandal) {
    for (const id of live) addDefect(host, CASSEROLE_BY_ID[id]);
  } else if (live.length > 0 && host.charges >= scandalThreshold(game, p)) {
    startScandal(game, host);
    if (!ongoing) p.stats.scandals++;
  }
}

/** Ses effets, moins une fois chaque effet de la carte : ceux de ses Ralliements restent, même d'une même carte. */
function withoutBase(effects: Effect[], base: Effect[]): Effect[] {
  const rest = [...effects];
  for (const e of base) {
    const i = rest.indexOf(e);
    if (i >= 0) rest.splice(i, 1);
  }
  return rest;
}

function others(p: Player, self: Minion | null): Minion[] {
  return p.board.filter((m) => m !== self);
}

function targetsOf(game: Game, p: Player, self: Minion | null, eff: Effect, ctx: EffectContext, index: number): Minion[] {
  const board = p.board;
  const at = self ? board.indexOf(self) : -1;
  const pos = at >= 0 ? at : index;
  switch (eff.to) {
    case 'soi':
      return self && at >= 0 ? [self] : [];
    case 'voisins':
      return at >= 0 ? [board[at - 1], board[at + 1]].filter(Boolean) : [board[pos - 1], board[pos]].filter(Boolean);
    case 'meme_camp':
      return self ? board.filter((m) => isCamp(game, m, self.camp)) : [];
    case 'camp':
      return board.filter((m) => isCamp(game, m, eff.camp ?? self?.camp ?? 'civile'));
    case 'autres_camp':
      return others(p, self).filter((m) => isCamp(game, m, eff.camp ?? self?.camp ?? 'civile'));
    case 'allies':
      return [...board];
    case 'autres':
      return others(p, self);
    case 'premier_allie':
      return board.slice(0, 1);
    case 'dernier_allie':
      return board.slice(-1);
    case 'allie_suivant': {
      const next = at >= 0 ? board[at + 1] : board[pos];
      return next ? [next] : [];
    }
    case 'dores':
      return board.filter((m) => m.golden);
    case 'cible':
      return ctx.target && board.includes(ctx.target) ? [ctx.target] : [];
    case 'aleatoire': {
      const pool = others(p, self).filter((m) => !eff.camp || isCamp(game, m, eff.camp));
      return pool.length > 0 ? [game.rng.pick(pool)] : [];
    }
    case 'joue':
      return ctx.played && board.includes(ctx.played) ? [ctx.played] : [];
    case 'main': {
      const hand = p.hand.filter((m) => !eff.camp || isCamp(game, m, eff.camp));
      return hand.length > 0 ? [game.rng.pick(hand)] : [];
    }
    case 'toute_la_main':
      return p.hand.filter((m) => !eff.camp || isCamp(game, m, eff.camp));
    default:
      return [];
  }
}

function addStats(m: Minion, atk: number, hp: number): void {
  m.atk += atk;
  m.hp += hp;
}

/**
 * Une casserole en boutique. Les affaires suivent leurs propriétaires : souvent, c'est celle
 * d'un politique que le joueur a déjà, pour que le double sur le propriétaire arrive vraiment.
 */
export function offerCasserole(game: Game, p: Player): void {
  if (game.round < game.params.casseroleFromRound) {
    p.casseroleOffer = null;
    return;
  }
  const owned = new Set([...p.board, ...p.hand].map((m) => m.cardId));
  const theirs = CASSEROLES.filter((c) => owned.has(c.owner));
  const pool = theirs.length > 0 && game.rng.next() < game.params.casseroleOwnerChance ? theirs : CASSEROLES;
  // Les affaires à la une pèsent plus : sur 64 casseroles, les plus connues doivent sortir.
  const weight = (c: Casserole) => (c.une ? game.params.uneWeight : 1);
  let r = game.rng.next() * pool.reduce((s, c) => s + weight(c), 0);
  p.casseroleOffer = (pool.find((c) => (r -= weight(c)) < 0) ?? pool[pool.length - 1]).id;
}

/**
 * Le Bracelet électronique : le peuple oublie tout de suite le scandale le plus long. Il ne bouge
 * plus. Null s'il n'y a pas de scandale sur le plateau.
 */
export function braceletTarget(p: Player): Minion | null {
  return p.board.filter((m) => m.scandal).sort((a, b) => (b.scandal?.until ?? 0) - (a.scandal?.until ?? 0))[0] ?? null;
}

/** Retire un serviteur de la boutique : le plus faible ou le plus fort, gains de boutique compris (règle R8). */
function poachFromShop(game: Game, p: Player, pick: 'plus_faible' | 'plus_fort'): { atk: number; hp: number } | null {
  if (p.shop.length === 0) return null;
  const value = (id: string) => {
    const card = CARD_BY_ID[id];
    const gain = shopCardGain(game, p, id);
    return { atk: card.atk + gain.atk, hp: card.hp + gain.hp };
  };
  let best = 0;
  for (let i = 1; i < p.shop.length; i++) {
    const a = value(p.shop[i]);
    const b = value(p.shop[best]);
    const better = pick === 'plus_fort' ? a.atk + a.hp > b.atk + b.hp : a.atk + a.hp < b.atk + b.hp;
    if (better) best = i;
  }
  const stats = value(p.shop[best]);
  const [id] = p.shop.splice(best, 1);
  returnToPool(game, id);
  return stats;
}

export function applyCampBuff(game: Game, p: Player, gain: StatGain): void {
  p.campBuffs.push(gain);
  for (const m of [...p.board, ...p.hand]) {
    if ((!gain.camp || isCamp(game, m, gain.camp)) && (!gain.card || m.cardId === gain.card)) addStats(m, gain.atk, gain.hp);
  }
}

/** Joue un Tract : il compte comme un sort lancé (règle R5). */
export function playTract(game: Game, p: Player, target: Minion, k = 1): void {
  addStats(target, p.tract.atk * k, p.tract.hp * k);
  afterSpell(game, p, 'tract');
}

/** Ce qui suit un sort lancé : les compteurs et les réactions du plateau. */
export function afterSpell(game: Game, p: Player, spellId: string): void {
  p.stats.spells++;
  if (spellId === 'tract') incrementCounter(p, 'tracts');
  fireBoard(game, p, 'sort', {}, (_owner, eff) => !eff.card || eff.card === spellId);
}

/** Applique un effet hors combat. `self` est la source : le serviteur, ou rien pour un sort. */
export function applyEffect(game: Game, p: Player, self: Minion | null, eff: Effect, ctx: EffectContext = {}, index = -1): void {
  if (eff.once === 'manche' && self) {
    const key = `${self.uid}:${self.effects.indexOf(eff)}`;
    if (p.onceThisRound.has(key)) return;
    p.onceThisRound.add(key);
  }
  const k = power(self);
  const targets = () => targetsOf(game, p, self, eff, ctx, index);
  switch (eff.do) {
    case 'buff':
      for (const t of targets()) addStats(t, eff.atk * k, eff.hp * k);
      break;
    case 'buff_par_allie': {
      const n = others(p, self).length;
      for (const t of targets()) addStats(t, eff.atk * n * k, eff.hp * n * k);
      break;
    }
    case 'buff_par_camp': {
      const n = new Set(p.board.filter((m) => m.camp !== 'civile').map((m) => m.camp)).size;
      for (const t of targets()) addStats(t, eff.atk * n * k, eff.hp * n * k);
      break;
    }
    case 'buff_par_ralliement':
      for (const t of targets()) addStats(t, eff.atk * t.merged.length * k, eff.hp * t.merged.length * k);
      break;
    case 'jouer_tract':
      for (const t of targets()) playTract(game, p, t, k);
      break;
    case 'budget':
      if (eff.plus_tard || eff.when === 'fin_tour') p.nextBudgetBonus += eff.value * k;
      else p.budget += eff.value * k;
      break;
    case 'invoquer': {
      const at = self && p.board.includes(self) ? p.board.indexOf(self) + 1 : Math.max(0, index);
      for (let i = 0; i < eff.count * k && p.board.length < boardLimit(game, p); i++) {
        p.board.splice(Math.min(at, p.board.length), 0, welcome(game, p, makeToken(eff.token, self?.camp ?? 'civile', game.nextUid++)));
      }
      break;
    }
    case 'mot_cle':
      for (const t of targets()) if (!t.keywords.includes(eff.keyword)) t.keywords.push(eff.keyword);
      break;
    case 'basculer':
      for (const t of targets()) t.keywords = t.keywords.includes(eff.keyword) ? t.keywords.filter((k) => k !== eff.keyword) : [...t.keywords, eff.keyword];
      break;
    case 'carte':
      for (let i = 0; i < eff.count * k; i++) addCard(game, p, eff.card, self);
      break;
    case 'decouvrir':
      for (let i = 0; i < k; i++) {
        if (eff.quoi === 'sort') offerSpells(game, p, p.tier + (eff.echelon ?? 0));
        // Une découverte ne propose jamais la carte qui la déclenche, comme dans Hearthstone : un Poisson vendu
        // qui se redécouvre rapportait 1 de budget à chaque tour de boucle, sans fin (trouvé par le fuzz).
        else offerMinions(game, p, p.tier + (eff.echelon ?? 0), eff.camp, eff.declencheur, self?.cardId);
      }
      break;
    case 'camp_buff':
      applyCampBuff(game, p, { camp: eff.camp, card: eff.card, atk: eff.atk * k, hp: eff.hp * k });
      break;
    case 'boutique_buff':
      p.shopBuffs.push({ camp: eff.camp, atk: eff.atk * k, hp: eff.hp * k });
      break;
    case 'tract_bonus':
      p.tract = { atk: p.tract.atk + eff.atk * k, hp: p.tract.hp + eff.hp * k };
      break;
    case 'debaucher': {
      const list = targets();
      if (list.length === 0) break;
      const stats = poachFromShop(game, p, eff.pick);
      if (!stats) break;
      for (const t of list) addStats(t, stats.atk * k, stats.hp * k);
      incrementCounter(p, 'debauchages');
      fireBoard(game, p, 'debauche', {});
      break;
    }
    case 'dorer':
      for (const t of targets()) makeGolden(p, t, eff.maxTier);
      break;
    case 'detruire':
      for (const t of targets()) destroy(game, p, t);
      break;
    case 'sacrifier':
      for (const t of targets()) {
        const camp = t.camp;
        destroy(game, p, t);
        offerMinions(game, p, p.tier + (eff.echelon ?? 0), camp === 'civile' ? undefined : camp);
      }
      break;
    case 'declencher':
      for (const t of targets()) {
        // Règle R4 : un relanceur ne relance pas deux fois le même serviteur dans la manche.
        if (t === self || p.retriggered.has(t.uid)) continue;
        p.retriggered.add(t.uid);
        // Une Annonce relancée qui demande une cible vise le premier autre allié.
        const relaunchTarget = p.board.find((x) => x !== t) ?? null;
        for (const other of t.effects) if (other.when === eff.trigger) applyEffect(game, p, t, other, { target: relaunchTarget });
      }
      break;
    case 'actualiser':
      // Comme le bouton Actualiser : la boutique se dégèle, la casserole change aussi.
      for (let i = 0; i < (eff.count ?? 1); i++) {
        p.frozen = false;
        refillShop(game, p);
        if (game.params.casseroleOnRoll) offerCasserole(game, p);
        fireBoard(game, p, 'actualise', {});
      }
      break;
    case 'actualisations_gratuites':
      p.freeRolls += eff.value * k;
      break;
    case 'budget_max':
      p.maxBudgetBonus += eff.value;
      break;
    case 'oublier': {
      const target = braceletTarget(p);
      if (target) {
        forgetScandal(target);
        target.locked = true;
        target.bracelet = true;
        p.stats.forgotten++;
      }
      break;
    }
    case 'pari_defaite':
      p.lossBet += eff.value * k;
      break;
    case 'congres': {
      const t = targets()[0];
      if (t) refillShop(game, p, t.camp === 'civile' ? undefined : t.camp);
      break;
    }
    case 'transmettre': {
      const at = self && p.board.includes(self) ? p.board.indexOf(self) + 1 : Math.max(0, index);
      const next = p.board[at] ?? null;
      if (!next || !self) break;
      // Comme en combat : un doré transmet le double, de son attaque ou de toutes ses stats.
      addStats(next, Math.max(1, self.atk) * k, eff.tout ? Math.max(1, self.hp) * k : 0);
      break;
    }
    default:
      // Dégâts, exil, butin : seulement en combat. Doubler, compteur, prison : des auras, lues où il faut.
      break;
  }
}

/** Rendre doré par un effet : stats de base doublées, effets doublés, mais pas d'Investiture (règle R3). */
function makeGolden(p: Player, m: Minion, maxTier: number): void {
  if (m.golden || m.token || m.simple || m.tier > maxTier) return;
  const card = CARD_BY_ID[m.cardId];
  if (!card) return;
  m.golden = true;
  addStats(m, card.atk, card.hp);
  incrementCounter(p, 'dores_joues');
}

/** Détruit un allié au recrutement : il rend ses exemplaires, et son Héritage se déclenche. */
export function destroy(game: Game, p: Player, m: Minion): void {
  const index = p.board.indexOf(m);
  if (index < 0) return;
  p.board.splice(index, 1);
  releaseMinion(game, m);
  const repeats = repeatCount(p, 'heritage');
  for (let r = 0; r < repeats; r++) {
    for (const eff of m.effects) if (eff.when === 'heritage') applyEffect(game, p, m, eff, {}, index);
  }
}

/** Déclenche un type d'effet sur tout le plateau, de gauche à droite. */
export function fireBoard(game: Game, p: Player, trigger: Trigger, ctx: EffectContext, accept: (m: Minion, eff: Effect) => boolean = () => true): void {
  for (const m of [...p.board]) {
    if (!p.board.includes(m)) continue;
    for (const eff of m.effects) {
      if (eff.when === trigger && accept(m, eff)) applyEffect(game, p, m, eff, ctx);
    }
  }
}

/**
 * La fin du recrutement : Lassalle double les effets, chaque serviteur joue les siens d'affilée.
 * Chaque effet est noté dans `p.endOfTurnSteps`, avec ce qu'il a changé : le joueur le voit jouer.
 */
export function endOfTurn(game: Game, p: Player): void {
  const repeats = repeatCount(p, 'fin_tour');
  for (const m of [...p.board]) {
    for (let r = 0; r < repeats; r++) {
      if (!p.board.includes(m)) break;
      for (const eff of m.effects) {
        if (eff.when !== 'fin_tour') continue;
        const before = tableState(p);
        applyEffect(game, p, m, eff, {});
        p.endOfTurnSteps.push(stepBetween(m.uid, before, tableState(p)));
      }
    }
  }
  roped(game, p);
}

/** Premier de cordée (contexte) : le politique le plus à gauche gagne ses stats, après les Fins de tour. */
function roped(game: Game, p: Player): void {
  const gain = game.ctx.firstOfRope;
  const first = p.board[0];
  if (!gain || !first) return;
  const before = tableState(p);
  addStats(first, gain.atk, gain.hp);
  p.endOfTurnSteps.push(stepBetween(first.uid, before, tableState(p)));
}

/** Ce qu'une étape de Fin de tour peut changer sur la table du joueur. */
interface TableState {
  board: Map<number, { atk: number; hp: number; keywords: string }>;
  hand: string;
  spells: string;
  tracts: string;
  shop: string;
  budget: number;
}

function tableState(p: Player): TableState {
  return {
    board: new Map(p.board.map((m) => [m.uid, { atk: m.atk, hp: m.hp, keywords: m.keywords.join(',') }])),
    hand: p.hand.map((m) => `${m.uid}:${m.atk}/${m.hp}`).join(' '),
    spells: p.spells.map((s) => `${s.uid}:${s.count ?? 1}`).join(' '),
    tracts: `${p.tract.atk}/${p.tract.hp}`,
    shop: `${p.shopBuffs.length}|${p.shop.join(',')}`,
    budget: p.budget * 1000 + p.nextBudgetBonus,
  };
}

/** Une étape : les politiques du plateau qui ont changé, avec leurs stats d'après, et le reste en notes. */
function stepBetween(source: number | null, before: TableState, after: TableState): EndOfTurnStep {
  const changes: EndOfTurnStep['changes'] = [];
  for (const [uid, now] of after.board) {
    const was = before.board.get(uid);
    if (was && was.atk === now.atk && was.hp === now.hp && was.keywords === now.keywords) continue;
    changes.push({ uid, atk: now.atk, hp: now.hp, keywords: now.keywords ? (now.keywords.split(',') as Minion['keywords']) : [] });
  }
  const notes: EndOfTurnNote[] = [];
  if ([...after.board.keys()].some((uid) => !before.board.has(uid)) || [...before.board.keys()].some((uid) => !after.board.has(uid))) notes.push('plateau');
  if (after.hand !== before.hand) notes.push('main');
  if (after.spells !== before.spells) notes.push('sorts');
  if (after.tracts !== before.tracts) notes.push('tracts');
  if (after.shop !== before.shop) notes.push('boutique');
  if (after.budget !== before.budget) notes.push('budget');
  return { source, changes, notes };
}

/** Le pouvoir de héros qui joue en fin de recrutement (Tondelier), noté comme une étape de Fin de tour. */
export function heroEndOfTurn(p: Player): void {
  const growth = p.hero.mods.frontGrowth;
  const front = p.board[0];
  if (!growth || !front) return;
  const before = tableState(p);
  front.atk += growth;
  front.hp += growth;
  p.endOfTurnSteps.push(stepBetween(null, before, tableState(p)));
}

/** Le début du recrutement : les relances se rechargent, les effets jouent. */
export function startOfTurn(game: Game, p: Player): void {
  p.retriggered = new Set();
  p.onceThisRound = new Set();
  p.annoncesThisRound = 0;
  for (let i = 0; i < (p.hero.mods.startTracts ?? 0); i++) addSpellToHand(game, p, 'tract');
  fireBoard(game, p, 'debut_tour', {});
}

/**
 * Les Annonces d'une carte qui vient d'être jouée, puis les réactions des autres.
 * `self` est le serviteur sur le plateau : la carte elle-même, ou l'hôte d'un Ralliement.
 */
export function announce(game: Game, p: Player, self: Minion, effects: Effect[], played: Minion, target: Minion | null): void {
  let repeats = repeatCount(p, 'annonce');
  if (p.hero.mods.firstAnnonceTwice && p.annoncesThisRound === 0) repeats++;
  const annonces = effects.filter((e) => e.when === 'annonce');
  if (annonces.length > 0) p.annoncesThisRound++;
  for (let r = 0; r < repeats && annonces.length > 0; r++) {
    for (const eff of annonces) applyEffect(game, p, self, eff, { target });
  }
  if (isCamp(game, played, 'ecologistes')) incrementCounter(p, 'ecologistes_joues');
  fireBoard(game, p, 'joue', { played: self }, (owner, eff) => owner !== self && (!eff.camp || isCamp(game, played, eff.camp)));
}

/** Des effets ont-ils besoin d'une cible choisie ? */
export function needsTarget(effects: Effect[], when: Trigger = 'annonce'): boolean {
  return effects.some((e) => e.when === when && e.to === 'cible');
}

/** Les effets d'un combat qui survivent au combat : gains permanents, gains de camp, cartes, main. */
export function applyPersist(game: Game, p: Player, persist: CombatPersist): void {
  for (const gain of persist.buffs) {
    const m = p.board.find((x) => x.uid === gain.uid);
    if (m) addStats(m, gain.atk, gain.hp);
  }
  for (const gain of persist.campBuffs) applyCampBuff(game, p, gain);
  for (const id of persist.cards) addCard(game, p, id, null);
  for (const id of persist.copies) addCopy(game, p, id);
  for (const gain of persist.handBuffs) {
    if (p.hand.length === 0) break;
    const list = gain.all ? p.hand : [game.rng.pick(p.hand)];
    for (const m of list) addStats(m, gain.atk, gain.hp);
  }
}

/** La Célébration ou le Droit de réponse d'un serviteur du plateau, après le combat. */
export function afterCombatSpeech(game: Game, p: Player, uid: number, trigger: 'celebration' | 'droit_de_reponse'): void {
  const m = p.board.find((x) => x.uid === uid);
  if (!m) return;
  // Macron double les Célébrations, comme Lassalle les Fins de tour.
  const repeats = trigger === 'celebration' ? repeatCount(p, 'celebration') : 1;
  for (let r = 0; r < repeats; r++) {
    for (const eff of m.effects) if (eff.when === trigger && p.board.includes(m)) applyEffect(game, p, m, eff);
  }
}

/** Toutes les cartes de serviteurs qui ont un effet de ce déclencheur : pour les découvertes thématiques. */
export function cardsWithTrigger(trigger: Trigger): string[] {
  return CARDS.filter((c) => (c.effects ?? []).some((e) => e.when === trigger)).map((c) => c.id);
}
