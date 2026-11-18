import { KEYWORD_RULES } from '#src/client/const/keywordRules.ts';
import { DEBATE_SOURCE, gainSourceLabel } from '#src/client/tools/gainSourceLabel.ts';
import { signed } from '#src/client/tools/signed.ts';
import type { MinionGain } from '#src/engine/types.ts';

/** One line of a politician's bonuses: who gave it, what it gave. */
export interface GainLine {
  label: string;
  /** « +12/+12 »; empty when the source only gave keywords. */
  stats: string;
  /** The keywords it gave that the politician still has. */
  keywords: string[];
}

export interface GainList {
  /** Everything the lines add up to: « +41/+38 ». */
  total: string;
  lines: GainLine[];
}

/** Beyond this many sources, the smallest ones are said together: the sheet stays on the screen. */
const MAX_LINES = 8;

function weight(gain: MinionGain): number {
  return Math.abs(gain.atk) + Math.abs(gain.hp);
}

function statsOf(atk: number, hp: number): string {
  return atk === 0 && hp === 0 ? '' : `${signed(atk)}/${signed(hp)}`;
}

/**
 * The bonuses of a politician, one line per source, the heaviest first; what the combat on screen gave (`debate`)
 * comes last. `keywords`: those it has now; one given, then lost, is no longer said. Null when it only has its card.
 */
export function gainLines(gains: readonly MinionGain[], keywords: readonly string[], debate: { atk: number; hp: number } | null = null): GainList | null {
  const shown = gains
    .map((gain) => ({ ...gain, keywords: gain.keywords.filter((keyword) => keywords.includes(keyword)) }))
    .filter((gain) => weight(gain) > 0 || gain.keywords.length > 0)
    .sort((a, b) => weight(b) - weight(a));
  const fromDebate = debate && (debate.atk !== 0 || debate.hp !== 0) ? debate : null;
  if (shown.length === 0 && !fromDebate) return null;
  const kept = shown.length > MAX_LINES ? shown.slice(0, MAX_LINES - 1) : shown;
  const rest = shown.slice(kept.length);
  const lines: GainLine[] = kept.map((gain) => ({
    label: gainSourceLabel(gain.source, gain.times),
    stats: statsOf(gain.atk, gain.hp),
    keywords: gain.keywords.map((keyword) => KEYWORD_RULES[keyword].label),
  }));
  if (rest.length > 0) {
    const restKeywords = [...new Set(rest.flatMap((gain) => gain.keywords))];
    lines.push({
      label: `… et ${rest.length} autres`,
      stats: statsOf(rest.reduce((sum, gain) => sum + gain.atk, 0), rest.reduce((sum, gain) => sum + gain.hp, 0)),
      keywords: restKeywords.map((keyword) => KEYWORD_RULES[keyword].label),
    });
  }
  if (fromDebate) lines.push({ label: gainSourceLabel(DEBATE_SOURCE), stats: statsOf(fromDebate.atk, fromDebate.hp), keywords: [] });
  const atk = shown.reduce((sum, gain) => sum + gain.atk, 0) + (fromDebate?.atk ?? 0);
  const hp = shown.reduce((sum, gain) => sum + gain.hp, 0) + (fromDebate?.hp ?? 0);
  return { total: statsOf(atk, hp), lines };
}
