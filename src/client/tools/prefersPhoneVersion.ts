/** Under this short side, in CSS pixels, a touch screen is a phone, held either way; a tablet keeps the table. */
const PHONE_SHORT_SIDE = 600;

/** The phone version (/m/) suits this screen: a phone, unless its player chose the computer version. */
export function prefersPhoneVersion({ coarsePointer, shortSide, computerChosen }: { coarsePointer: boolean; shortSide: number; computerChosen: boolean }): boolean {
  return coarsePointer && shortSide < PHONE_SHORT_SIDE && !computerChosen;
}
