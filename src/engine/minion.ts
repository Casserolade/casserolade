import type { Camp, Card, Minion } from './types.ts';
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
