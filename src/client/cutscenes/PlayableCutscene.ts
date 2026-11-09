import type gsap from 'gsap';

/**
 * What the cutscene player plays, whatever made the cutscene: puppets described in data (`Cutscene`) or a HyperFrames
 * composition (`ComposedCutscene`). One paused GSAP timeline on the game's page, the same four gestures.
 */
export interface PlayableCutscene {
  readonly timeline: gsap.core.Timeline;
  play(): void;
  /** Straight to the end, silently. */
  finish(): void;
  destroy(): void;
}
