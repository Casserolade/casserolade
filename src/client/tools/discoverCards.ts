import type { ShownCard } from '#src/client/tools/shownCard.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import { SPELL_BY_ID } from '#src/data/sorts.ts';
import { makeMinion } from '#src/engine/minion.ts';

/** The cards of a discovery as their faces show them: politicians fresh from the pool, or spells. Null for an unknown id. */
export function discoverCards(choices: string[], kind: 'serviteur' | 'sort' | null): (ShownCard | null)[] {
  return choices.map((id): ShownCard | null => {
    if (kind === 'sort') return SPELL_BY_ID[id] ? { kind: 'spell', spell: SPELL_BY_ID[id] } : null;
    const card = CARD_BY_ID[id];
    if (!card) return null;
    const { cardId, name, camp, tier, atk, hp, keywords, effects, golden } = makeMinion(card, -1);
    return { kind: 'minion', face: { cardId, name, camp, tier, atk, hp, keywords, effects, golden } };
  });
}
