/**
 * The last letters typed, for a code word typed anywhere: a key that is one character is added (in lower case), any
 * other key (Shift, an arrow) leaves the tail as it was, and only the last `length` characters are kept.
 */
export function typedTail(tail: string, key: string, length: number): string {
  if ([...key].length !== 1) return tail;
  return (tail + key.toLowerCase()).slice(-length);
}
