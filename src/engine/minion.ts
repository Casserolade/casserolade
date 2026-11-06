import type { Camp, Card, Effect, Minion } from './types.ts';
import { CARD_BY_ID, TOKENS } from '../data/cards.ts';

export function makeMinion(card: Card, uid: number): Minion {
  return {
    uid,
    cardId: card.id,
    name: card.name,
    camp: card.camp,
    tier: card.tier,
    atk: card.atk,
    hp: card.hp,
    keywords: [...(card.keywords ?? [])],
    effects: card.effects ?? [],
    golden: card.golden ?? false,
    copies: card.token ? 0 : 1,
    simple: false,
    casseroles: [],
    oublie: 0,
    merged: [],
    rallied: [],
    ownerCasseroles: [],
    charges: 0,
    locked: false,
    noAttack: card.noAttack ?? false,
    token: card.token ?? false,
    bonusDamage: 0,
    hpLossOnDeath: 0,
    budgetPerRound: 0,
    aloneBonus: 0,
  };
}

export function makeToken(tokenId: string, camp: Camp, uid: number): Minion {
  const card = TOKENS[tokenId];
  if (!card) throw new Error(`Jeton inconnu : ${tokenId}`);
  return { ...makeMinion(card, uid), camp: card.camp === 'civile' ? camp : card.camp };
}

/** Une copie simple, quand la réserve est vide : hors réserve, jamais dorée, jamais comptée pour un triple. */
export function makeSimpleCopy(cardId: string, uid: number): Minion | null {
  const card = CARD_BY_ID[cardId];
  if (!card) return null;
  return { ...makeMinion(card, uid), golden: false, copies: 0, simple: true };
}

export function cardOf(minion: Minion): Card {
  return CARD_BY_ID[minion.cardId] ?? TOKENS[minion.cardId];
}

/** Les exemplaires de la réserve que ce serviteur représente, cartes ralliées comprises. */
export function poolCopies(m: Minion): [string, number][] {
  const out: [string, number][] = m.copies > 0 ? [[m.cardId, m.copies]] : [];
  for (const id of m.merged) out.push([id, 1]);
  return out;
}

/** Les exemplaires qui comptent pour un triple : ni dorés, ni jetons, ni copies simples. */
export function tripleCopies(board: Minion[], cardId: string): Minion[] {
  return board.filter((m) => m.cardId === cardId && !m.golden && !m.token && !m.simple);
}

/** Les effets que ce serviteur tient de sa propre carte : ceux qu'un doré joue doublés. */
export function ownEffects(m: Pick<Minion, 'cardId'>): readonly Effect[] {
  return (CARD_BY_ID[m.cardId] ?? TOKENS[m.cardId])?.effects ?? [];
}

/**
 * La puissance d'un effet sur ce serviteur : 2, il joue doublé. Un effet rallié garde celle de sa carte (`power`),
 * un effet de sa propre carte double s'il est doré, et celui d'une casserole ne double jamais.
 */
export function effectPower(m: Pick<Minion, 'cardId' | 'golden'>, eff: Effect): number {
  if (eff.power !== undefined) return eff.power;
  return m.golden && ownEffects(m).includes(eff) ? 2 : 1;
}

/** L'effet d'origine de chaque copie ralliée : les invariants retrouvent ainsi celui de la carte. */
const RALLIED_ORIGIN = new WeakMap<Effect, Effect>();

/** Ce qu'un effet devient sur l'hôte d'un Ralliement : une copie qui garde sa puissance, doublée si le rallié était doré. */
export function rallyEffect(m: Pick<Minion, 'cardId' | 'golden'>, eff: Effect): Effect {
  if (!ownEffects(m).includes(eff)) return eff;
  const copy: Effect = { ...eff, power: effectPower(m, eff) };
  RALLIED_ORIGIN.set(copy, eff);
  return copy;
}

/**
 * Un Ralliement qui porte des casseroles, même oubliées, ne rejoint pas un jeton : un jeton n'en porte jamais. Le fuzz
 * l'a trouvé le 6 novembre 2026 : Lecornu doré, avec ses casseroles, sur un Électeur fantôme.
 */
export function canRallyOnto(host: Pick<Minion, 'token'>, m: Pick<Minion, 'casseroles'>): boolean {
  return !host.token || m.casseroles.length === 0;
}

/** L'effet de carte ou de casserole dont celui-ci vient : lui-même, sauf pour une copie ralliée. */
export function effectOrigin(eff: Effect): Effect {
  return RALLIED_ORIGIN.get(eff) ?? eff;
}
