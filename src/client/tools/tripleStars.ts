const TRIPLE = 3;

/** The progress toward a triple, as stars: 2 copies give "★★☆". */
export function tripleStars(copies: number): string {
  const filled = Math.min(TRIPLE, Math.max(0, copies));
  return '★'.repeat(filled) + '☆'.repeat(TRIPLE - filled);
}
