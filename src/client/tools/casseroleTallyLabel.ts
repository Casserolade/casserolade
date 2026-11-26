/** What the casserole counter of a hero says to a screen reader and on hover: the count, and the palier when it has one. */
export function casseroleTallyLabel(count: number, goal: number | null): string {
  const laid = `${count} ${count > 1 ? 'casseroles posées' : 'casserole posée'} cette partie`;
  if (goal === null) return laid;
  return count >= goal ? `${laid} : palier atteint` : `${laid}, palier à ${goal}`;
}
