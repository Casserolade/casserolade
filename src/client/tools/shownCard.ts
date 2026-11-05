import { cardRuleLines } from '#src/client/tools/describeEffect.ts';
import { casseroleCardLines, spellCardLines } from '#src/client/tools/spellCardLines.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import type { Camp, Casserole, Effect, Keyword, Spell } from '#src/engine/types.ts';

export interface MinionFace {
  cardId: string;
  name: string;
  camp: Camp;
  tier: number;
  atk: number;
  hp: number;
  keywords?: Keyword[];
  effects?: Effect[];
  casseroles?: string[];
  golden?: boolean;
  locked?: boolean;
  bracelet?: boolean;
  copies?: number;
  charges?: number;
  scandalThreshold?: number;
  /** How many of its casseroles, the first ones, the people already forgot. */
  oublie?: number;
  /** Rounds of scandal left; 0 without a scandal. */
  scandalLeft?: number;
}

/** Only what a card face displays, from a minion of the board, the hand or the shop. */
export function minionFace(minion: MinionFace, extra: Partial<MinionFace> = {}): MinionFace {
  const { cardId, name, camp, tier, atk, hp, keywords, effects, casseroles, golden, locked, bracelet, oublie } = minion;
  return { cardId, name, camp, tier, atk, hp, keywords, effects, casseroles, golden, locked, bracelet, oublie, ...extra };
}

/** Rounds of scandal left for this minion at this round: 0 without a scandal. */
export function scandalLeft(minion: { scandal?: { until: number } }, round: number): number {
  return minion.scandal ? Math.max(1, minion.scandal.until - round) : 0;
}

/** Any card the table can show in full: a minion, a spell, or a casserole. */
export type ShownCard =
  | { kind: 'minion'; face: MinionFace }
  | { kind: 'spell'; spell: Spell; count?: number; tier?: number; tract?: { atk: number; hp: number } }
  | { kind: 'casserole'; casserole: Casserole; ownerMultiplier: number };

/** The rule lines printed on a card, with its keywords between ** : what the glossary explains. */
export function shownCardLines(card: ShownCard): string[] {
  if (card.kind === 'spell') return spellCardLines(card.spell, { tier: card.tier, tract: card.tract });
  if (card.kind === 'casserole') return casseroleCardLines(card.casserole, card.ownerMultiplier);
  const { keywords, effects, cardId, golden } = card.face;
  return cardRuleLines({ keywords, effects, golden: CARD_BY_ID[cardId]?.golden }, { isGolden: golden });
}
