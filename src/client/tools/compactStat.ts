/** From the largest: a stat of at least `size` is written in that unit. */
const UNITS = [
  { size: 1_000_000_000, suffix: 'Md' },
  { size: 1_000_000, suffix: 'M' },
  { size: 1_000, suffix: 'k' },
] as const;
const MINUS = '−';

/**
 * A number as a medallion shows it, Hearthstone style (a 3000/3000 reads 3k/3k): up to 999 as it is, then one decimal
 * under ten units (1,2k), none above (12k, 999k), and the same with M and Md. Truncated, never rounded up: 1 299 is
 * 1,2k and 1 099 is 1k, so a number never looks bigger than it is.
 */
export function compactStat(value: number): string {
  const size = Number.isFinite(value) ? Math.abs(Math.trunc(value)) : 0;
  const sign = value < 0 && size > 0 ? MINUS : '';
  const unit = UNITS.find((candidate) => size >= candidate.size);
  if (!unit) return `${sign}${size}`;
  const whole = Math.floor(size / unit.size);
  const tenth = whole < 10 ? Math.floor((size % unit.size) / (unit.size / 10)) : 0;
  return tenth > 0 ? `${sign}${whole},${tenth}${unit.suffix}` : `${sign}${whole}${unit.suffix}`;
}
