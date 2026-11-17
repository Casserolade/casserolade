import { computed, shallowRef } from 'vue';
import type { Ref } from 'vue';
import { shouldAskPseudo } from '#src/client/tools/shouldAskPseudo.ts';

/**
 * A pseudo is asked for, never demanded: the first online gesture made without one is held back, and the page points
 * at the field (`pointAtField`). Confirming the field (`resume`), with a pseudo or without, lets the gesture go on;
 * so does making a gesture again.
 */
export function usePseudoNudge(pseudo: Ref<string>, pointAtField: () => void) {
  /** The online gesture held back for want of a pseudo. */
  const held = shallowRef<(() => void) | null>(null);
  /** The page is asking for a pseudo, a gesture held back. */
  const asking = computed(() => held.value !== null);

  /** Runs an online gesture, unless a pseudo is still to be asked for. */
  function withPseudo(gesture: () => void): void {
    if (shouldAskPseudo(pseudo.value, asking.value)) {
      held.value = gesture;
      pointAtField();
      return;
    }
    held.value = null;
    gesture();
  }

  /** The field is confirmed, with a pseudo or without: the gesture held back goes on. */
  function resume(): void {
    const gesture = held.value;
    held.value = null;
    gesture?.();
  }

  return { asking, withPseudo, resume };
}
