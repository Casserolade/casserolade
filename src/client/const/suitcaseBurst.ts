/**
 * The banknotes that burst out of the Ko-fi link when the reporter's suitcase lands in it: where each one flies
 * (pixels from the middle of the link), how far it turns as it flutters down, its delay, and its note.
 */
export const SUITCASE_BURST = [
  { x: -78, y: -64, spin: -220, delay: 0, note: 'cent' },
  { x: -46, y: -92, spin: 160, delay: 0.04, note: 'cinq-cents' },
  { x: -12, y: -110, spin: -140, delay: 0.02, note: 'cinquante' },
  { x: 20, y: -98, spin: 250, delay: 0.06, note: 'cent' },
  { x: 54, y: -80, spin: -190, delay: 0.01, note: 'cinq-cents' },
  { x: 86, y: -52, spin: 120, delay: 0.05, note: 'cent' },
  { x: -96, y: -24, spin: 200, delay: 0.08, note: 'cinquante' },
  { x: 102, y: -18, spin: -160, delay: 0.09, note: 'cent' },
] as const;
