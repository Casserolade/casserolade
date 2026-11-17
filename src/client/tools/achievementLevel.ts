import type { BotLevel } from '#src/bots/bots.ts';
import type { Niveau } from '#src/data/succes.ts';

/** The bots' level of a quick game, as the achievements count it; none for the beginners' bots of the tutorial. */
export function achievementLevel(level: BotLevel | undefined): Niveau | undefined {
  return level === 'facile' || level === 'moyen' || level === 'difficile' ? level : undefined;
}
