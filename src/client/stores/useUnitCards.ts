import { computed, onMounted, onUnmounted, watch } from 'vue';
import type { Ref } from 'vue';
import { cardInspector } from '#src/client/stores/cardInspector.ts';
import type { Anchor } from '#src/client/stores/cardInspector.ts';
import { combatUnitShown } from '#src/client/tools/combatUnitShown.ts';
import { debateGains } from '#src/client/tools/debateGains.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { CombatEvent, CombatUnit } from '#src/engine/types.ts';

/** A unit drawn on the combat's stage, and the box of its medallion on the screen. */
export interface UnitOnScreen {
  uid: number;
  box: Anchor;
}

interface UnitCardsOptions {
  log: readonly CombatEvent[];
  /** How many events of the journal have played. */
  played: Readonly<Ref<number>>;
  /** Both boards as the combat stands now. */
  sides: Readonly<Ref<readonly [readonly CombatUnit[], readonly CombatUnit[]]>>;
  /** The unit the stage draws under a point of the screen, if any. */
  unitAt: (x: number, y: number) => UnitOnScreen | null;
}

/**
 * The full card of a unit of the combat, yours or the rival's, with where its bonuses come from and what this combat
 * gave it: under the mouse on a computer (the table's inspector), and for whoever asks by a point of the screen (a
 * touch on a phone). The card shown follows the combat: its numbers change, and it goes with its unit.
 */
export function useUnitCards({ log, played, sides, unitAt }: UnitCardsOptions) {
  const gained = computed(() => debateGains(log, played.value));
  /** The unit whose card is up; `onStage`: found by the pointer on the stage, not on a plain medallion of the page. */
  let pointed: (UnitOnScreen & { onStage: boolean }) | null = null;

  /** The card of a unit still on the table, as the combat stands now; null once it is gone. */
  function cardOf(uid: number): ShownCard | null {
    const unit = [...sides.value[0], ...sides.value[1]].find((candidate) => candidate.uid === uid);
    return unit ? combatUnitShown(unit, gained.value.get(uid) ?? null) : null;
  }

  /** The card of the unit drawn under this point of the screen. */
  function cardAt(x: number, y: number): ShownCard | null {
    const found = unitAt(x, y);
    return found ? cardOf(found.uid) : null;
  }

  function showPointed(): void {
    const card = pointed ? cardOf(pointed.uid) : null;
    if (pointed && card) cardInspector.showAt(card, pointed.box);
    else leave();
  }

  function leave(): void {
    if (!pointed) return;
    pointed = null;
    cardInspector.hide();
  }

  /** The mouse over a medallion of the stage: its card comes up beside it. A finger does not hover. */
  function handleMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || (pointed && !pointed.onStage)) return;
    const found = unitAt(event.clientX, event.clientY);
    if (!found) {
      leave();
      return;
    }
    if (pointed?.uid === found.uid) return;
    pointed = { ...found, onStage: true };
    showPointed();
  }

  /** The mouse over a plain medallion of the page, while the stage is not drawn: until it leaves it (`leave`). */
  function pointAt(uid: number, element: Element): void {
    const { left, top, right, bottom } = element.getBoundingClientRect();
    pointed = { uid, box: { left, top, right, bottom }, onStage: false };
    showPointed();
  }

  watch(played, () => {
    if (pointed) showPointed();
  });
  onMounted(() => window.addEventListener('pointermove', handleMove));
  onUnmounted(() => {
    window.removeEventListener('pointermove', handleMove);
    leave();
  });

  return { cardAt, pointAt, leave };
}
