import type { Recompense } from '#src/data/succes.ts';

/** What an achievement gives, in a few words. */
export function rewardLabel(reward: Recompense): string {
  return reward.type === 'titre' ? `Titre : « ${reward.titre} »` : 'Un héros de plus au choix';
}
