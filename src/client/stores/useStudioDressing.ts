import { computed } from 'vue';
import { STUDIO_DETAILS } from '#src/client/const/studioDetails.ts';
import { TICKER_WORDS } from '#src/client/const/tickerWords.ts';
import { visualEffects } from '#src/client/stores/visualEffects.ts';
import { tickerVisit } from '#src/client/tools/tickerVisit.ts';

/** The ticker scrolls this many of the channel's lines on one visit: about a minute before the first one comes back. */
const TICKER_LINES_PER_VISIT = 8;

/**
 * The broadcast dressing of a TV set, for whichever screen shows it (the computer's table, the phone's band): the
 * set's detail, its colours as CSS variables, and the ticker's lines, drawn again each time the set comes on screen
 * (no two visits scroll the same nonsense). `still`: the visual effects are off, nothing moves.
 */
export function useStudioDressing(plateauId: () => string) {
  const detail = computed(() => STUDIO_DETAILS[plateauId()] ?? null);
  const still = computed(() => visualEffects.calm.value);
  const colors = computed(() => (detail.value ? { '--band': detail.value.band, '--ink': detail.value.ink } : {}));
  /** Drawn once per set shown: the draw holds until the set changes. */
  const tickerLines = computed(() => (detail.value?.ticker ? tickerVisit(detail.value.ticker.lines, TICKER_WORDS, TICKER_LINES_PER_VISIT, Math.random) : []));
  return { detail, still, colors, tickerLines };
}
