import { PHONE_SHORT_SIDE } from '#src/client/const/phoneShortSide.ts';

/** The phone version (/m/) suits this screen: a phone, unless its player chose the computer version. */
export function prefersPhoneVersion({ coarsePointer, shortSide, computerChosen }: { coarsePointer: boolean; shortSide: number; computerChosen: boolean }): boolean {
  return coarsePointer && shortSide < PHONE_SHORT_SIDE && !computerChosen;
}
