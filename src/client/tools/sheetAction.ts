/**
 * What a button of the phone's card does: recruit from the shop, lay down or cast from the hand, send back.
 * `cast_all`: a whole pile of Tracts on the politician to point at.
 */
export interface SheetAction {
  id: 'buy' | 'play' | 'cast' | 'cast_all' | 'sell';
  label: string;
  /** Budget it costs (a coin on the button), or brings back (`gain`). */
  cost?: number;
  gain?: number;
  /** Why it cannot be done now: the button is greyed, and says why under it. */
  reason: string | null;
  primary: boolean;
}
