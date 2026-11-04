/** How one sound is played: a pitch and a loudness, each a little different every time. */
export interface SoundVariation {
  pitch: number;
  gain: number;
}

/** Under this gap, the same sound again is dropped: twelve hits in a row must not machine-gun. */
export const DEFAULT_GAP_MS = 60;
/** At most this many sounds ring at once; the rest are dropped. */
export const MAX_VOICES = 8;
const PITCH_SPREAD = 0.06;
const GAIN_SPREAD = 0.12;

/** The bookkeeping of the mixer: when each sound last started, and when the ringing ones stop. */
export interface MixerState {
  lastStart: Map<string, number>;
  endsAt: number[];
  /** When the real voice that speaks now is done: one voice at a time, never cut by another. */
  speakingUntil: number;
}

export function createMixerState(): MixerState {
  return { lastStart: new Map(), endsAt: [], speakingUntil: 0 };
}

/**
 * Whether a sound may start now. When it may, the state remembers it.
 * `now` and `durationMs` are in milliseconds, on any clock that only goes forward.
 */
export function claimVoice(state: MixerState, name: string, now: number, durationMs: number, gapMs = DEFAULT_GAP_MS): boolean {
  const last = state.lastStart.get(name);
  if (last !== undefined && now - last < gapMs) return false;
  state.endsAt = state.endsAt.filter((end) => end > now);
  if (state.endsAt.length >= MAX_VOICES) return false;
  state.lastStart.set(name, now);
  state.endsAt.push(now + durationMs);
  return true;
}

/** A slight random change of pitch and loudness, from a number in [0, 1) for each. */
export function varySound(pitchRandom: number, gainRandom: number): SoundVariation {
  return {
    pitch: 1 + (pitchRandom * 2 - 1) * PITCH_SPREAD,
    gain: 1 + (gainRandom * 2 - 1) * GAIN_SPREAD,
  };
}

/**
 * Whether a real voice may speak now: only when no other is speaking. It never cuts the one that
 * speaks; when it may, it takes the floor for its whole length. The table's sounds never keep it
 * quiet (a celebration rings with confetti), but it counts among them while it speaks.
 */
export function claimSpeech(state: MixerState, now: number, durationMs: number): boolean {
  if (now < state.speakingUntil) return false;
  state.speakingUntil = now + durationMs;
  state.endsAt = state.endsAt.filter((end) => end > now);
  state.endsAt.push(now + durationMs);
  state.lastStart.set('voice', now);
  return true;
}
