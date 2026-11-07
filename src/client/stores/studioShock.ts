import { shallowRef } from 'vue';

/** One big shock of the combat: how strong (0.45 to 1), and its number, so that two in a row are two. */
export interface StudioShock {
  count: number;
  strength: number;
}

/**
 * The TV set feels the combat's big shocks: the stage reports each one (StageFx), the set around the table makes its
 * lights falter and its screens glitch (GameTable, StudioScreens).
 */
function createStudioShock() {
  const last = shallowRef<StudioShock>({ count: 0, strength: 0 });

  function hit(strength: number): void {
    last.value = { count: last.value.count + 1, strength };
  }

  return { last, hit };
}

export const studioShock = createStudioShock();
