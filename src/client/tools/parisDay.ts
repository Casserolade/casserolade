const PARIS_DAY = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });

/** The day in Paris, as 2026-11-06: the server counts its days the same way. */
export function parisDay(date: Date): string {
  return PARIS_DAY.format(date);
}
