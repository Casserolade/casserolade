const PARIS_DAY = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
const PARIS_HOUR = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' });

/** The day of a date in Paris, as 2026-11-10: the statistics' days and the archive's files are named so. */
export function parisDay(date: Date): string {
  return PARIS_DAY.format(date);
}

/** The hour of a date in Paris, 0 to 23. */
export function parisHour(date: Date): number {
  return Number(PARIS_HOUR.formatToParts(date).find((part) => part.type === 'hour')?.value ?? 0) % 24;
}
