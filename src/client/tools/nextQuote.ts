/** Another line at random, never the one just shown when there is a choice; `roll` is in [0, 1). */
export function nextQuote(quotes: string[], previous: string | null, roll: number): string | null {
  const others = quotes.length > 1 ? quotes.filter((line) => line !== previous) : quotes;
  if (others.length === 0) return null;
  return others[Math.min(others.length - 1, Math.floor(roll * others.length))];
}
