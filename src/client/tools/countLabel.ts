/** A number and its noun, in the singular for 0 and 1 as French wants it: « 1 politique », « 13 politiques ». */
export function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}
