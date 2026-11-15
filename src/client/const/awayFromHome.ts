import type { InjectionKey } from 'vue';

/**
 * What the page does when the player leaves the home screen for a game, the career or the tutorial, and when they
 * come back. Provided by the phone's entry (the back gesture held, full screen); the computer provides nothing.
 */
export interface AwayFromHome {
  leaveHome(): void;
  backHome(): void;
}

export const AWAY_FROM_HOME: InjectionKey<AwayFromHome> = Symbol('awayFromHome');
