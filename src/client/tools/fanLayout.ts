export interface FanSlot {
  /** Horizontal offset of the card's center from the middle of the hand. */
  x: number;
  /** Vertical offset: the cards at the ends dip, the hovered one rises. */
  y: number;
  angle: number;
  scale: number;
  z: number;
}

export interface FanOptions {
  /** Distance between two neighbours when there is room. */
  step: number;
  /** The whole hand never gets wider than this, between the first and last centers. */
  maxSpan: number;
  /** Degrees between two neighbours, and the most a card ever tilts. */
  anglePerCard: number;
  maxAngle: number;
  /** How far the ends dip, per card away from the middle, squared. */
  dip: number;
  /** The hovered card: how much it grows and rises, and how far its neighbours step aside. */
  hoverScale: number;
  hoverLift: number;
  hoverSpread: number;
}

/**
 * A hand held in an arc, as in a card game: overlapping cards, tilted away from the middle.
 * The hovered card straightens, rises and grows; its neighbours step aside to let it be read.
 */
export function fanLayout(count: number, hovered: number | null, options: FanOptions): FanSlot[] {
  const middle = (count - 1) / 2;
  const step = count > 1 ? Math.min(options.step, options.maxSpan / (count - 1)) : 0;
  const anglePerCard = Math.min(options.anglePerCard, count > 1 ? (options.maxAngle * 2) / (count - 1) : 0);
  return Array.from({ length: count }, (_, index) => {
    const away = index - middle;
    const isHovered = index === hovered;
    const push = hovered === null || isHovered ? 0 : Math.sign(index - hovered) * options.hoverSpread / Math.max(1, Math.abs(index - hovered));
    return {
      x: away * step + push,
      y: isHovered ? -options.hoverLift : away * away * options.dip,
      angle: isHovered ? 0 : away * anglePerCard,
      scale: isHovered ? options.hoverScale : 1,
      z: isHovered ? count + 1 : index,
    };
  });
}
