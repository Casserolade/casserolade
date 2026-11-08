/** A bulb horn: a buzzing reed, squeezed sharp from under its pitch, through the resonance of its bell. */
export interface HornVoice {
  pitch: number;
  /** How long one squeeze lasts, in seconds. */
  length: number;
  /** Where the pitch starts as the bulb is squeezed, and where it ends as it is let go, as ratios of the pitch. */
  squeeze: number;
  letGo: number;
  /** The bell's resonance, in hertz, and its boost in decibels. */
  bell: number;
  bellGain: number;
  level: number;
}

/** The clown's horn, low and fat; the bicycle's, small and shrill. */
export const HORN_VOICES: Record<'clown' | 'bicycle', HornVoice> = {
  clown: { pitch: 320, length: 0.22, squeeze: 0.78, letGo: 0.93, bell: 1050, bellGain: 11, level: 0.13 },
  bicycle: { pitch: 560, length: 0.17, squeeze: 0.84, letGo: 1.05, bell: 1750, bellGain: 7, level: 0.12 },
};
