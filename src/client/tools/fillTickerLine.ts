/**
 * A ticker line with each of its `{slot}` filled by one of the slot's words, drawn by `roll` (a number in [0, 1) per
 * call), and a capital at its start. A slot without words stays as written.
 */
export function fillTickerLine(line: string, words: Record<string, readonly string[]>, roll: () => number): string {
  const filled = line.replace(/\{(\w+)\}/g, (slot: string, name: string) => {
    const choices = words[name] ?? [];
    return choices.length ? choices[Math.min(choices.length - 1, Math.floor(roll() * choices.length))] : slot;
  });
  return filled.charAt(0).toUpperCase() + filled.slice(1);
}
