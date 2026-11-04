/**
 * Déplace un élément d'une place à une autre, les éléments verrouillés gardant la leur.
 * Null si l'élément ou la place d'arrivée est verrouillé. Partagé avec l'aperçu du client.
 */
export function reorderAroundLocked<T>(items: T[], from: number, to: number, isLocked: (item: T) => boolean): T[] | null {
  const moved = items[from];
  if (moved === undefined || items[to] === undefined) return null;
  if (isLocked(moved) || isLocked(items[to])) return null;
  const free = items.filter((item, i) => i !== from && !isLocked(item));
  let nextFree = 0;
  return items.map((item, i) => {
    if (i === to) return moved;
    return isLocked(item) ? item : free[nextFree++];
  });
}

/**
 * Insère un élément à une place, les éléments verrouillés gardant la leur.
 * Null si la place est hors limites ou occupée par un élément verrouillé. Partagé avec l'aperçu du client.
 */
export function insertAroundLocked<T>(items: T[], added: T, to: number, isLocked: (item: T) => boolean): T[] | null {
  if (to < 0 || to > items.length) return null;
  if (to < items.length && isLocked(items[to])) return null;
  const free = items.filter((item) => !isLocked(item));
  let nextFree = 0;
  return Array.from({ length: items.length + 1 }, (_, i) => {
    if (i === to) return added;
    return i < items.length && isLocked(items[i]) ? items[i] : free[nextFree++];
  });
}
