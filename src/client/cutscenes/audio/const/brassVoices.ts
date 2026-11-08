import type { Envelope } from '#src/client/cutscenes/audio/kit/envelopes.ts';

/** What makes one brass instrument sound like itself. */
export interface BrassVoice {
  /** How far its filter opens at full breath, in multiples of the pitch. */
  brightness: number;
  /** The lips: how far under the note it starts, in cents, before sliding up to it. */
  scoop: number;
  /** The detune between its two reeds, in cents. */
  spread: number;
  envelope: Envelope;
  level: number;
}

/** Bright and bold for the tunes; round and soft for the chords; short and fat for the oom-pah. */
export const BRASS_VOICES: Record<'trumpet' | 'horn' | 'tuba', BrassVoice> = {
  trumpet: { brightness: 8, scoop: 38, spread: 7, envelope: { attack: 0.022, decay: 0.16, sustain: 0.72, release: 0.07 }, level: 0.2 },
  horn: { brightness: 3.2, scoop: 18, spread: 9, envelope: { attack: 0.07, decay: 0.3, sustain: 0.85, release: 0.22 }, level: 0.13 },
  tuba: { brightness: 4.5, scoop: 26, spread: 5, envelope: { attack: 0.016, decay: 0.09, sustain: 0.62, release: 0.06 }, level: 0.42 },
};
