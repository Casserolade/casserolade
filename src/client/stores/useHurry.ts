import { onMounted, onUnmounted } from 'vue';
import { isHurryKey } from '#src/client/tools/isHurryKey.ts';

/** What a tap leaves alone: the table's buttons, links and fields, and whatever asks for it (the chat). */
const KEEPS_ITS_GESTURES = 'button, a, input, textarea, select, label, [contenteditable="true"], [data-no-hurry]';

function isFree(target: EventTarget | null): boolean {
  return !(target instanceof Element && target.closest(KEEPS_ITS_GESTURES));
}

/**
 * A tap, a click or a key (space, enter, right arrow) anywhere on the table hurries the show along. Never needed: the
 * game goes on by itself. `hurry` says whether there was something to hurry; when there was not, the gesture goes on
 * to whatever else listens to it.
 */
export function useHurry(hurry: () => boolean): void {
  function handlePointer(event: PointerEvent): void {
    if (event.button === 0 && isFree(event.target)) hurry();
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.repeat || !isHurryKey(event.key) || !isFree(event.target)) return;
    if (hurry()) event.preventDefault();
  }

  onMounted(() => {
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('keydown', handleKey);
  });
  onUnmounted(() => {
    window.removeEventListener('pointerdown', handlePointer);
    window.removeEventListener('keydown', handleKey);
  });
}
