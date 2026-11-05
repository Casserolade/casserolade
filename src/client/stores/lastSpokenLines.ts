/**
 * The last line each politician said after a combat, for the length of the page: on a winning streak, the same
 * politician does not say the same thing twice in a row.
 */
function createLastSpokenLines() {
  const lines = new Map<string, string>();

  function lastOf(cardId: string): string | null {
    return lines.get(cardId) ?? null;
  }

  function remember(cardId: string, line: string): void {
    lines.set(cardId, line);
  }

  return { lastOf, remember };
}

export const lastSpokenLines = createLastSpokenLines();
