import type { MixerState } from '#src/client/tools/soundMixer.ts';

/** The voice that spoke was cut short (the player passed its line): the floor is free again from `now`. */
export function releaseSpeech(state: MixerState, now: number): void {
  state.speakingUntil = Math.min(state.speakingUntil, now);
}
