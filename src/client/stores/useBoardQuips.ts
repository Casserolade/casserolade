import { onUnmounted, shallowRef, watch } from 'vue';
import { boardQuip } from '#src/client/tools/boardQuip.ts';
import type { BoardQuip } from '#src/client/tools/boardQuip.ts';
import { readingDelayMs } from '#src/client/tools/readingDelayMs.ts';
import type { Minion } from '#src/engine/types.ts';

/**
 * One bubble at a time over the board, gone by itself once read. The board as it first shows says nothing.
 * Silent: a politician is heard in its real voice only when it celebrates a victory (rule of the user,
 * 3 November 2026).
 */
export function useBoardQuips(board: () => Minion[]) {
  const quip = shallowRef<BoardQuip | null>(null);
  let timer = 0;

  function hideAfter(ms: number): void {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => (quip.value = null), ms);
  }

  watch(board, (after, before) => {
    if (!before) return;
    const said = boardQuip(before, after);
    if (!said) return;
    quip.value = said;
    hideAfter(readingDelayMs(said.line));
  });
  onUnmounted(() => window.clearTimeout(timer));
  return quip;
}
