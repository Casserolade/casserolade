import { shallowRef } from 'vue';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { Minion } from '#src/engine/types.ts';

export interface Point {
  x: number;
  y: number;
}

/** A short effect drawn over the table, from one point to another. Nothing waits for it. */
export type TableEffect =
  | { id: number; kind: 'recruit'; from: Point; to: Point; minion?: Minion; card?: ShownCard }
  | { id: number; kind: 'spell'; from: Point; to: Point; card: ShownCard }
  | { id: number; kind: 'coins'; from: Point; to: Point }
  | { id: number; kind: 'burst'; at: Point; color: string };

type NewEffect = TableEffect extends infer E ? (E extends TableEffect ? Omit<E, 'id'> : never) : never;

const LIFETIME_MS = 1100;

/** The effects of each gesture: they start from where the gesture happened and go away by themselves. */
function createTableFx() {
  const effects = shallowRef<TableEffect[]>([]);
  /** How many spells each politician of the board has received, by uid: its medallion jolts at each one. */
  const jolts = shallowRef<Record<number, number>>({});
  let nextId = 1;

  function add(effect: NewEffect): void {
    const id = nextId++;
    effects.value = [...effects.value, { ...effect, id } as TableEffect];
    window.setTimeout(() => (effects.value = effects.value.filter((other) => other.id !== id)), LIFETIME_MS);
  }

  function jolt(uid: number): void {
    jolts.value = { ...jolts.value, [uid]: (jolts.value[uid] ?? 0) + 1 };
  }

  return { effects, jolts, add, jolt };
}

export const tableFx = createTableFx();

export function centerOf(element: Element | null): Point | null {
  if (!element) return null;
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}
