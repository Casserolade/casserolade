import type { DropGuide } from '#src/client/tools/dropGuideFor.ts';

/** The word on the counter line: what the drop does, or why it would not. */
export function dropGuideLabel(guide: DropGuide): string {
  if (guide.mode === 'sell') return 'Vendre';
  if (guide.blocked === 'budget') return 'Trop cher';
  if (guide.blocked === 'hand') return 'Main pleine';
  return 'Acheter';
}
