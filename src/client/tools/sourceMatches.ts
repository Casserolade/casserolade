/** Lower case, without accents: « Pécresse » is found by « pecresse ». */
function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Whether a source's text holds every word of the search, in any order and without accents. */
export function sourceMatches(text: string, query: string): boolean {
  const haystack = plain(text);
  return plain(query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}
