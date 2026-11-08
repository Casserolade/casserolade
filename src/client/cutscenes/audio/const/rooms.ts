/** The rooms a music can play in. */
export type RoomName = 'small' | 'hall' | 'church' | 'space';

/** A room's reverberation. */
export interface Room {
  /** How long its tail rings, to -60 dB. */
  seconds: number;
  /** How much darker the tail grows as it dies, from 0 (bright) to 1 (muffled). */
  damping: number;
  /** The silence before the first reflection. */
  predelay: number;
}

/** A classroom, a concert hall, a church nave, and outer space (long and bright, for the theremin). */
export const ROOMS: Record<RoomName, Room> = {
  small: { seconds: 0.7, damping: 0.55, predelay: 0.006 },
  hall: { seconds: 2.1, damping: 0.6, predelay: 0.018 },
  church: { seconds: 4.4, damping: 0.7, predelay: 0.03 },
  space: { seconds: 3.6, damping: 0.35, predelay: 0.04 },
};
