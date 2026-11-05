/**
 * Ce qui doit toujours être vrai d'une partie, quelle que soit la suite d'actions qui y a mené.
 * Une fonction, une liste : vide si tout va bien, sinon une phrase par violation, avec l'endroit.
 *
 * La même source de vérité sert au fuzz (test/fuzzHarness.ts, qui exige une liste vide après chaque
 * action) et au serveur, qui la vérifie à chaque manche et signale toute anomalie avec le journal
 * de la partie, pour la rejouer (docs/12-moteur.md).
 */
import { CARD_BY_ID, TOKENS } from '../data/cards.ts';
import { CASSEROLE_BY_ID } from '../data/casseroles.ts';
import { SPELL_BY_ID } from '../data/sorts.ts';
import { boardLimit, handCount } from './recruit.ts';
import type { Game, Player } from './state.ts';
import type { Effect, Keyword, Minion } from './types.ts';

/** Tous les mots-clés : le compilateur refuse cette table si un mot-clé est ajouté sans elle. */
const KNOWN_KEYWORDS: Record<Keyword, true> = {
  immunite: true, porte_parole: true, cumul: true, polemique: true, retour: true, ni_droite_ni_gauche: true, ralliement: true, vedette: true,
};

/** Les exemplaires de chaque carte, où qu'ils soient : la réserve, les boutiques, les choix, les plateaux et les mains. */
export function census(game: Game): Map<string, number> {
  const count = new Map<string, number>();
  const add = (id: string, n: number) => count.set(id, (count.get(id) ?? 0) + n);
  for (const [id, n] of game.pool) add(id, n);
  for (const p of game.players) {
    if (!p.alive) continue;
    for (const id of p.shop) add(id, 1);
    for (const offer of [p.discover, ...p.discoverQueue]) {
      if (offer?.kind === 'serviteur') for (const id of offer.options) add(id, 1);
    }
    for (const m of [...p.board, ...p.hand]) {
      if (m.copies > 0) add(m.cardId, m.copies);
      for (const id of m.merged) add(id, 1);
    }
  }
  return count;
}

function countIn(list: readonly Effect[], e: Effect): number {
  let n = 0;
  for (const x of list) if (x === e) n++;
  return n;
}

/** Un politique : stats, carte, mots-clés, copies, casseroles, scandale, et des effets ni perdus ni dupliqués. */
function minionViolations(game: Game, p: Player, m: Minion, where: string, inHand: boolean): string[] {
  const out: string[] = [];
  const at = `${where} · ${m.name} #${m.uid}`;
  const check = (ok: boolean, message: string) => {
    if (!ok) out.push(`${at} : ${message}`);
  };
  check(Number.isInteger(m.atk) && Number.isInteger(m.hp), `stats non entières ${m.atk}/${m.hp}`);
  check(m.atk >= 0, `attaque négative ${m.atk}`);
  check(m.hp >= 1, `${m.hp} PV hors combat`);
  const card = CARD_BY_ID[m.cardId] ?? TOKENS[m.cardId];
  check(Boolean(card), `carte inconnue ${m.cardId}`);
  check(new Set(m.keywords).size === m.keywords.length, `mot-clé en double ${m.keywords}`);
  for (const k of m.keywords) check(k in KNOWN_KEYWORDS, `mot-clé inconnu ${k}`);
  if (inHand) check(!m.token, 'un jeton en main');
  if (m.token) check(m.casseroles.length === 0, 'un jeton porte une casserole');
  if (m.simple) check(m.copies === 0 && !m.golden, 'copie simple dorée ou comptée dans la réserve');
  if (m.golden) check([1, 3].includes(m.copies) || m.simple, `doré avec ${m.copies} exemplaires`);
  for (const id of m.merged) check(Boolean(CARD_BY_ID[id]), `carte ralliée inconnue ${id}`);
  if (!card) return out;

  // Les casseroles, le scandale et l'oubli du peuple.
  for (const id of m.casseroles) check(Boolean(CASSEROLE_BY_ID[id]), `casserole inconnue ${id}`);
  const all = m.casseroles.map((id) => CASSEROLE_BY_ID[id]).filter(Boolean);
  if (all.length !== m.casseroles.length) return out;
  check(Number.isInteger(m.oublie) && m.oublie >= 0 && m.oublie <= m.casseroles.length, `${m.oublie} oubliées sur ${m.casseroles.length}`);
  const live = all.slice(m.oublie);
  for (const c of live) check(!c.chargesRemoved, `« ${c.id} » fait tout oublier, mais n'est pas oubliée`);
  check(m.charges === live.reduce((s, c) => s + (c.charges ?? 1), 0), `${m.charges} charges pour ${live.map((c) => c.id)}`);
  const mult = (c: { owner: string }) => (m.cardId === c.owner ? game.params.ownerMultiplier : 1);
  const bonusBudget = all.reduce((s, c) => s + Math.max(0, c.budgetPerRound ?? 0) * mult(c), 0);
  const defectBudget = m.scandal ? live.reduce((s, c) => s + Math.min(0, c.budgetPerRound ?? 0), 0) : 0;
  const defectHp = m.scandal ? live.reduce((s, c) => s + (c.hpLossOnDeath ?? 0), 0) : 0;
  check(m.budgetPerRound === bonusBudget + defectBudget, `budget par manche ${m.budgetPerRound}, attendu ${bonusBudget} + ${defectBudget}`);
  check(m.hpLossOnDeath === defectHp, `sondages perdus à la mort ${m.hpLossOnDeath}, attendu ${defectHp}`);
  const bonusDamage = all.reduce((s, c) => s + Math.max(0, c.bonusDamage ?? 0) * mult(c) + Math.min(0, c.bonusDamage ?? 0), 0);
  check(m.bonusDamage === bonusDamage, `dégâts bonus ${m.bonusDamage}, attendu ${bonusDamage}`);
  const alone = all.reduce((s, c) => s + Math.max(0, c.aloneBonus ?? 0) * mult(c) + Math.min(0, c.aloneBonus ?? 0), 0);
  check(m.aloneBonus === alone, `bonus de solitude ${m.aloneBonus}, attendu ${alone}`);
  if (m.bracelet) check(m.locked, 'sous bracelet, mais libre de bouger');
  if (m.scandal) {
    const s = m.scandal;
    check(s.budget === defectBudget, `scandale : budget ${s.budget}, attendu ${defectBudget}`);
    check(s.hpLoss === defectHp, `scandale : sondages ${s.hpLoss}, attendu ${defectHp}`);
    if (game.phase === 'recrutement') {
      check(s.until > game.round && s.until <= game.round + game.params.scandalRounds, `scandale jusqu'à la manche ${s.until}, manche ${game.round}`);
    }
    const base = game.params.scandalThreshold + (p.hero.mods.scandalThresholdDelta ?? 0);
    check(m.charges >= base, `en scandale avec ${m.charges} charges, seuil ${base}`);
    if (s.locked) check(m.locked, 'un scandale qui cloue, sur un politique libre');
    if (live.some((c) => c.locked)) check(m.locked, 'le défaut « ne bouge plus » n\'est pas appliqué');
    if (live.some((c) => c.silence)) check(Boolean(s.silenced), 'le défaut « perd ses effets » n\'est pas appliqué');
  }

  // Les effets : ceux de la carte, des casseroles et des cartes ralliées, ni perdus ni dupliqués.
  const fromCasseroles = all.flatMap((c) => c.effects ?? []);
  const fromCasserolesAtMost = all.flatMap((c) => Array.from({ length: game.params.ownerMultiplier }, () => c.effects ?? []).flat());
  const base = card.effects ?? [];
  const mergedEffects = m.merged.flatMap((id) => CARD_BY_ID[id]?.effects ?? []);
  if (m.scandal?.silenced) {
    // Décidé le 3 novembre 2026 : un Ralliement posé sur un politique réduit au silence garde ses effets.
    for (const e of m.effects) check(fromCasseroles.includes(e) || mergedEffects.includes(e), 'réduit au silence, mais garde un effet qui n\'est pas de casserole');
  }
  const pool = [...m.effects, ...(m.scandal?.silenced ?? [])];
  for (const e of new Set([...base, ...fromCasseroles])) {
    const want = countIn(base, e) + countIn(fromCasseroles, e);
    check(countIn(pool, e) >= want, `effet perdu (${e.when} ${e.do}), ${countIn(pool, e)} au lieu de ${want}`);
  }
  for (const id of new Set(m.merged)) {
    for (const e of CARD_BY_ID[id]?.effects ?? []) check(pool.includes(e), `l'effet ${e.when} ${e.do} de ${id}, rallié, est perdu`);
  }
  for (const e of new Set(pool)) {
    const max = countIn(base, e) + countIn(mergedEffects, e) + countIn(fromCasserolesAtMost, e);
    check(countIn(pool, e) <= max, `effet dupliqué (${e.when} ${e.do}) ${countIn(pool, e)} fois, au plus ${max}`);
  }
  return out;
}

/** Un joueur : budget, échelon, tailles, boutique, main, choix en attente, puis chacun de ses politiques. */
function playerViolations(game: Game, p: Player): string[] {
  const out: string[] = [];
  const at = `siège ${p.seat}`;
  const check = (ok: boolean, message: string) => {
    if (!ok) out.push(`${at} : ${message}`);
  };
  check(Number.isInteger(p.budget) && p.budget >= 0, `budget ${p.budget}`);
  check(Number.isInteger(p.nextBudgetBonus), `budget à venir ${p.nextBudgetBonus}`);
  check(p.tier >= 1 && p.tier <= game.params.tierMax, `échelon ${p.tier}`);
  check(Number.isInteger(p.upgradeCost) && p.upgradeCost >= 0, `prix d'échelon ${p.upgradeCost}`);
  check(p.board.length <= boardLimit(game, p), `${p.board.length} politiques sur le plateau`);
  check(handCount(p) <= game.params.handSize, `${handCount(p)} cartes en main`);
  check(p.freeRolls >= 0 && p.lossBet >= 0 && p.spent >= 0, 'un compteur négatif');
  for (const [k, v] of Object.entries(p.counters)) check(Number.isInteger(v) && v >= 0, `compteur ${k} = ${v}`);
  check(Number.isFinite(p.hp), `sondages ${p.hp}`);
  if (game.phase === 'recrutement') check(p.hp > 0, `en lice avec ${p.hp} sondages`);
  const camps = [...game.camps, 'civile'];
  for (const id of p.shop) check(Boolean(CARD_BY_ID[id]) && camps.includes(CARD_BY_ID[id].camp), `boutique ${id}`);
  for (const id of p.shopSpells) check(Boolean(SPELL_BY_ID[id]), `sort en boutique ${id}`);
  if (p.casseroleOffer) check(Boolean(CASSEROLE_BY_ID[p.casseroleOffer]), `casserole en boutique ${p.casseroleOffer}`);
  let tractStacks = 0;
  for (const s of p.spells) {
    check(Boolean(s.spellId) !== Boolean(s.casseroleId), 'une carte de main ni sort ni casserole');
    if (s.spellId) check(Boolean(SPELL_BY_ID[s.spellId]), `sort inconnu ${s.spellId}`);
    if (s.casseroleId) check(Boolean(CASSEROLE_BY_ID[s.casseroleId]), `casserole inconnue ${s.casseroleId}`);
    if (s.spellId === 'tract') {
      tractStacks++;
      check(Number.isInteger(s.count) && (s.count as number) >= 1, `pile de Tracts ${s.count}`);
    }
  }
  check(tractStacks <= 1, `${tractStacks} piles de Tracts`);
  for (const offer of [p.discover, ...p.discoverQueue]) {
    if (!offer) continue;
    check(offer.options.length >= 1 && offer.options.length <= 3, `découverte à ${offer.options.length} cartes`);
    check(new Set(offer.options).size === offer.options.length, 'découverte en double');
    for (const id of offer.options) check(Boolean(offer.kind === 'sort' ? SPELL_BY_ID[id] : CARD_BY_ID[id]), `découverte ${id}`);
  }
  if (!p.discover) check(p.discoverQueue.length === 0, 'des découvertes en file sans choix en cours');
  check(p.stats.forgotten <= p.stats.scandals, `${p.stats.forgotten} oublis pour ${p.stats.scandals} scandales`);
  for (const m of p.board) out.push(...minionViolations(game, p, m, `${at} plateau`, false));
  for (const m of p.hand) out.push(...minionViolations(game, p, m, `${at} main`, true));
  return out;
}

/** La phase, les places et les choix de héros vont ensemble. */
function phaseViolations(game: Game): string[] {
  const out: string[] = [];
  const choosing = game.players.filter((p) => p.heroOffers).length;
  if (game.phase === 'choix_heros') {
    if (choosing === 0) out.push('choix des héros sans personne qui choisit');
  } else if (choosing > 0) {
    out.push(`phase ${game.phase} avec ${choosing} héros à choisir`);
  }
  if (game.phase !== 'choix_heros' && game.round < 1) out.push(`phase ${game.phase} à la manche ${game.round}`);
  const eliminated = game.players.filter((p) => !p.alive);
  for (const p of eliminated) {
    if (p.place < 1 || p.place > game.players.length) out.push(`siège ${p.seat} éliminé à la place ${p.place}`);
    // Il garde son dernier plateau, pour l'affichage et le fantôme ; ses exemplaires sont rendus à la réserve.
    if (p.shop.length > 0) out.push(`siège ${p.seat} éliminé, avec encore une boutique`);
  }
  const places = eliminated.map((p) => p.place);
  if (new Set(places).size !== places.length) out.push(`deux éliminés à la même place : ${places}`);
  const alive = game.players.filter((p) => p.alive);
  if (game.phase === 'fini') {
    if (alive.length > 1) out.push(`partie finie avec ${alive.length} joueurs en lice`);
    const all = game.players.map((p) => p.place).sort((a, b) => a - b);
    if (all.join() !== game.players.map((_, i) => i + 1).join()) out.push(`places finales ${all}`);
  } else if (game.phase === 'recrutement' && alive.length === 0) {
    // Au combat, tous peuvent tomber dans la même manche : le meilleur des éliminés gagne, puis la partie finit.
    out.push('recrutement sans joueur en lice');
  }
  return out;
}

export function invariantViolations(game: Game): string[] {
  const out = phaseViolations(game);
  const now = census(game);
  for (const [id, n] of game.poolTotal) {
    if ((now.get(id) ?? 0) !== n) out.push(`exemplaires de ${id} : ${now.get(id) ?? 0} au lieu de ${n}`);
  }
  for (const [id, n] of game.pool) if (n < 0) out.push(`réserve négative pour ${id}`);
  const uids: number[] = [];
  for (const p of game.players) {
    if (!p.alive) continue;
    for (const m of [...p.board, ...p.hand]) uids.push(m.uid);
    for (const s of p.spells) uids.push(s.uid);
    out.push(...playerViolations(game, p));
  }
  if (new Set(uids).size !== uids.length) out.push('identifiants en double');
  for (const uid of uids) if (!(uid > 0 && uid < game.nextUid)) out.push(`identifiant ${uid} hors de la plage`);
  return out;
}
