/** What the room settings say about the bots that will fill the table. */
export function botsAtTableLabel(bots: number): string {
  if (bots <= 0) return 'Sans bot : la table est complète.';
  return bots === 1 ? 'Un bot complète la table.' : `${bots} bots complètent la table.`;
}
