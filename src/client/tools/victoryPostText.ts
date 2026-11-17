import type { VictoryCardModel } from '#src/client/tools/victoryCardModel.ts';

/** The words that go with a shared victory card: who was elected, and the biggest politician of the board. */
export function victoryPostText(card: VictoryCardModel): string {
  const board = card.leader ? ` Mon plateau de fin, ${card.leader.name} en tête (${card.leader.atk}/${card.leader.hp}) :` : '';
  return `Élu sur Casserolade avec ${card.heroName} !${board}`;
}
