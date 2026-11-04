import { DROP_ZONES } from '#src/client/const/dropZones.ts';
import type { Zone } from '#src/client/stores/useTableGestures.ts';

/** The zone of the table at this height (table pixels): the shop side above the counter line, then the board band, then the hand. */
export function zoneForTableY(y: number): Zone {
  if (y < DROP_ZONES.counterY) return 'shop';
  return y < DROP_ZONES.handY ? 'board' : 'hand';
}
