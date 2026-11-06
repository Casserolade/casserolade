import type { Component, InjectionKey } from 'vue';

/**
 * The screens of the game for one kind of device: the computer's, drawn for a 1920×1080 table, or the phone's, held
 * upright (6 November 2026). The page's entry provides them; the flow of a game is the same for both.
 */
export interface ScreenSet {
  home: Component;
  hero: Component;
  recruit: Component;
  combat: Component;
  /** Around the game screens: the door to leave, and the chat of an online table. */
  frame: Component;
}

export const SCREEN_SET: InjectionKey<ScreenSet> = Symbol('screens');
