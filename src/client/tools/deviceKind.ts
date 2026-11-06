import { PHONE_SHORT_SIDE } from '#src/client/const/phoneShortSide.ts';
import type { Device } from '#src/protocol/counterEvent.ts';

/** The kind of screen: a touch screen is a phone under the phone's short side, a tablet above it. */
export function deviceKind({ coarsePointer, shortSide }: { coarsePointer: boolean; shortSide: number }): Device {
  if (!coarsePointer) return 'ordinateur';
  return shortSide < PHONE_SHORT_SIDE ? 'telephone' : 'tablette';
}
