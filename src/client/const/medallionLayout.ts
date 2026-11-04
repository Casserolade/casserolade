/**
 * The medallion, in its own units: 150 wide, 180 high (MedallionToken.vue draws the same in CSS).
 * The puppet stands in card units (CARD_LAYOUT), scaled and shifted so its head fills the oval.
 */
export const MEDALLION_LAYOUT = {
  width: 150,
  height: 180,
  /** The frame is this thick; the portrait is the oval inside it. */
  ring: 7,
  figureScale: 0.44,
  figureX: -100,
  figureY: -42,
  statSize: 60,
  statInset: -12,
  statBottom: -6,
};
