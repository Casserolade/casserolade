export interface RichSegment {
  text: string;
  bold: boolean;
}

/** Card text marks its keywords with **double asterisks**: split it into plain and bold runs. */
export function parseRichText(text: string): RichSegment[] {
  return text
    .split('**')
    .map((part, index) => ({ text: part, bold: index % 2 === 1 }))
    .filter((segment) => segment.text !== '');
}

/** The bold words of some card lines, in order, each once. */
export function boldTerms(lines: string[]): string[] {
  const terms = lines.flatMap((line) => parseRichText(line).filter((segment) => segment.bold).map((segment) => segment.text.trim()));
  return [...new Set(terms)];
}
