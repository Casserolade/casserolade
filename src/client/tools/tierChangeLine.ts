/** What a card that only moved tier says on the update notes: « Échelon 3 → 2 ». Nothing when the tier stayed. */
export function tierChangeLine(before: { tier: number } | undefined, after: { tier: number } | undefined): string | undefined {
  return before && after && before.tier !== after.tier ? `Échelon ${before.tier} → ${after.tier}` : undefined;
}
