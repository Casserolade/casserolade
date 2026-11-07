/**
 * Gifts to the same recipient read as one phrase: « donne **Porte-parole** à un politique » then « donne +0/+2 à un
 * politique » becomes « donne **Porte-parole** et +0/+2 à un politique ». Other phrases are kept as they are.
 */
export function mergeSameRecipient(phrases: string[]): string[] {
  const merged: string[] = [];
  for (const phrase of phrases) {
    const last = merged.at(-1);
    const recipient = last === undefined ? undefined : / (à [^,]+)$/.exec(last)?.[1];
    if (last !== undefined && recipient && phrase.startsWith('donne ') && phrase.endsWith(` ${recipient}`)) {
      const gift = phrase.slice('donne '.length, -(recipient.length + 1));
      merged[merged.length - 1] = `${last.slice(0, -(recipient.length + 1))} et ${gift} ${recipient}`;
    } else {
      merged.push(phrase);
    }
  }
  return merged;
}
