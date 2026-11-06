import type { Casserole } from '#src/engine/types.ts';
import { KEYWORD_RULES } from '#src/client/const/keywordRules.ts';
import { casseroleDefects } from '#src/client/tools/casseroleDefects.ts';
import { describeEffect } from '#src/client/tools/describeEffect.ts';
import { signed } from '#src/client/tools/signed.ts';
import { TOKENS } from '#src/data/cards.ts';

/**
 * The rules of a casserole, always generated from the data: its advantage first, at once and for
 * good, then its défaut, which only applies during a **Scandale**. Said plainly: a casserole that
 * set off a scandal on its own, with its bonus gone two rounds later, read as a bug (3 November 2026).
 */
export function describeCasserole(casserole: Casserole): string[] {
  const lines: string[] = [];
  if (casserole.atk || casserole.hp) lines.push(`${signed(casserole.atk ?? 0)}/${signed(casserole.hp ?? 0)}, pour de bon`);
  for (const keyword of casserole.keywords ?? []) lines.push(`**${KEYWORD_RULES[keyword].label}**`);
  for (const effect of casserole.effects ?? []) lines.push(describeEffect(effect));
  if ((casserole.budgetPerRound ?? 0) > 0) lines.push(`${signed(casserole.budgetPerRound ?? 0)} budget par manche`);
  if (casserole.instantBudget) lines.push(`${signed(casserole.instantBudget)} budget tout de suite`);
  if (casserole.bonusDamage) lines.push(`${casserole.bonusDamage} dégâts de plus au héros adverse s'il survit`);
  if (casserole.summon) lines.push(`Invoque ${TOKENS[casserole.summon]?.name ?? casserole.summon} à côté de lui`);
  if (casserole.swapStats) lines.push('Échange son attaque et ses PV');
  if (casserole.freeRecruit) lines.push('Ajoute gratuitement un politique de votre échelon');
  if (casserole.aloneBonus) lines.push(`+${casserole.aloneBonus}/+${casserole.aloneBonus} en combat s'il est seul de son camp`);
  if (casserole.forgetsAll) lines.push('Le peuple oublie tout, tout de suite');
  if ((casserole.charges ?? 1) > 1) lines.push('Compte double : fait **Scandale** à elle seule');
  const defects = casseroleDefects(casserole);
  if (defects.length > 0) lines.push(`**Scandale** : ${defects.join(', ')}`);
  return lines;
}
