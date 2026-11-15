/**
 * Whether a track may play now. A track kept for the last breath (`dernierSouffle`) only plays when the random order
 * lands on it while the player's hero has a single poll left; `heroPolls` is null outside a game.
 */
export function trackMayPlay(track: { dernierSouffle?: boolean }, heroPolls: number | null): boolean {
  return !track.dernierSouffle || heroPolls === 1;
}
