import { cardRuleLines } from '#src/client/tools/describeEffect.ts';
import type { CombatUnit } from '#src/engine/types.ts';

/**
 * The text of a card in combat. The combat unit carries its own keywords and effects,
 * rallies and casseroles included. A combat bonus is said too.
 */
export function cardRulesLines({ keywords, effects, bonus, golden }: Pick<CombatUnit, 'keywords' | 'effects' | 'bonus'> & { golden?: boolean }): string[] {
  return [...cardRuleLines({ keywords, effects }, { isGolden: golden }), ...(bonus > 0 ? [`Seul de son camp : +${bonus}/+${bonus}`] : [])];
}
