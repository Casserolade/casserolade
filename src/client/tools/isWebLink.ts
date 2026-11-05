/** A source that can be opened, rather than a note such as « Photo du Grand Prix de Monaco ». */
export function isWebLink(source: string): boolean {
  return /^https?:\/\//.test(source);
}
