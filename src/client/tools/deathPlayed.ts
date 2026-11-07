import type { DeathKind } from '#src/client/tools/deathKind.ts';

/** These deaths draw with a shader of their own: WebGL only. */
const SHADED: ReadonlySet<DeathKind> = new Set(['burn', 'tv-off']);

/**
 * The death that actually plays. Asked for less motion, nobody is thrown across the screen nor blown up: it breaks, or
 * goes out in light. Without WebGL, the deaths drawn with a shader go out in light.
 */
export function deathPlayed(kind: DeathKind, reducedMotion: boolean, webgl: boolean): DeathKind {
  const calmer = kind === 'eject' || kind === 'pop' ? 'light' : kind === 'explode' ? 'shatter' : kind;
  const chosen = reducedMotion ? calmer : kind;
  return SHADED.has(chosen) && !webgl ? 'light' : chosen;
}
