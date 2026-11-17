import { RAYONS, SUCCES } from '#src/data/succes.ts';
import type { Rayon, Succes } from '#src/data/succes.ts';

export interface AchievementShelf {
  id: Rayon;
  name: string;
  items: (Succes & { won: boolean })[];
  wonCount: number;
}

/** The achievements board, shelf by shelf, in the order of the game's list: each achievement, won or not. */
export function achievementShelves(won: readonly string[]): AchievementShelf[] {
  return (Object.keys(RAYONS) as Rayon[]).map((id) => {
    const items = SUCCES.filter((item) => item.rayon === id).map((item) => ({ ...item, won: won.includes(item.id) }));
    return { id, name: RAYONS[id], items, wonCount: items.filter((item) => item.won).length };
  });
}
