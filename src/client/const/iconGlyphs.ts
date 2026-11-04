/** The only place that knows what the icons are drawn with. */
export const ICON_GLYPHS = {
  attack: '⚔',
  health: '♥',
  electoralBase: '🛡',
  gold: '★',
  money: '€',
  tier: '▲',
  freeze: '❄',
  roll: '↻',
  left: '◀',
  right: '▶',
  casserole: '🍳',
  lock: '🔒',
  time: '⏱',
  sell: '💰',
  recruit: '🤝',
  soundOn: '🔊',
  soundOff: '🔇',
} as const;

export type IconName = keyof typeof ICON_GLYPHS;
