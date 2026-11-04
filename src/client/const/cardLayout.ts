// Coordinates on the reference 512x732 card frame (see tools/graphisme/cadres_3d.py).
export const CARD_LAYOUT = {
  width: 512,
  height: 732,
  artX: 30,
  artY: 30,
  artWidth: 452,
  artHeight: 426,
  feetX: 256,
  feetY: 434,
  ribbonY: 417,
  ribbonHeight: 92,
  nameY: 456,
  nameMaxWidth: 400,
  campY: 516,
  textY: 588,
  textWidth: 300,
  textMaxHeight: 130,
  attackMedal: { x: 58, y: 678, size: 118 },
  healthMedal: { x: 454, y: 678, size: 118 },
};

// The reduced card of the table: the art window, the ribbon, and the medals hanging under it.
export const TOKEN_LAYOUT = {
  width: 512,
  height: 600,
  frameHeight: 515,
  medalSize: 124,
  medalY: 538,
  attackX: 62,
  healthX: 450,
  iconY: 545,
  iconSize: 64,
};
