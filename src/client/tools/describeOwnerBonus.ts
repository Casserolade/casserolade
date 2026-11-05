import type { Casserole } from '#src/engine/types.ts';
import { KEYWORD_RULES } from '#src/client/const/keywordRules.ts';
import { describeEffect } from '#src/client/tools/describeEffect.ts';
import { signed } from '#src/client/tools/signed.ts';
import { CARD_BY_ID, TOKENS } from '#src/data/cards.ts';

/**
 * What a casserole gives its historical owner on top of its advantage, as the engine applies it (applyCasserole in
 * game.ts): « Sur Nicolas Sarkozy, en plus : +3/+3. ». Null when it has no owner bonus.
 */
export function describeOwnerBonus(casserole: Casserole): string | null {
  const owner = CARD_BY_ID[casserole.owner]?.name;
  const bonus = casserole.ownerBonus;
  const parts: string[] = [];
  if (bonus.atk || bonus.hp) parts.push(`${signed(bonus.atk ?? 0)}/${signed(bonus.hp ?? 0)}`);
  for (const keyword of bonus.keywords ?? []) parts.push(`**${KEYWORD_RULES[keyword].label}**`);
  if (bonus.effects?.length) {
    const again = JSON.stringify(bonus.effects) === JSON.stringify(casserole.effects ?? []);
    parts.push(again ? 'son effet joue deux fois' : bonus.effects.map((effect) => describeEffect(effect).slice(0, -1)).join(', '));
  }
  if (bonus.budgetPerRound) parts.push(`${signed(bonus.budgetPerRound)} budget par manche`);
  if (bonus.instantBudget) parts.push(`${signed(bonus.instantBudget)} budget tout de suite`);
  if (bonus.bonusDamage) parts.push(`${bonus.bonusDamage} dégâts au héros adverse s'il survit`);
  if (bonus.aloneBonus) parts.push(`+${bonus.aloneBonus}/+${bonus.aloneBonus} en combat s'il est seul de son camp`);
  if (bonus.summon) parts.push(`${TOKENS[bonus.summon]?.feminin ? 'une deuxième' : 'un deuxième'} ${TOKENS[bonus.summon]?.name ?? bonus.summon}`);
  if (bonus.freeRecruit) parts.push('un deuxième politique gratuit de votre échelon');
  if (!owner || parts.length === 0) return null;
  const listed = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts[0];
  // A no-break space before the colon, as French typography wants it: the line never breaks on « : ».
  return `Sur ${owner}, en plus\u00a0: ${listed}.`;
}
