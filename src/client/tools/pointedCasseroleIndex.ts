/**
 * The casserole the pointer is on, among those hanging under a medallion: its index in the politician's casseroles,
 * read from the `data-casserole-index` MedallionToken puts on each pan. Null anywhere else on the medallion.
 */
export function pointedCasseroleIndex(target: EventTarget | null): number | null {
  const pan = (target as Element | null)?.closest?.('[data-casserole-index]') ?? null;
  const index = Number(pan?.getAttribute('data-casserole-index'));
  return pan && Number.isInteger(index) && index >= 0 ? index : null;
}
