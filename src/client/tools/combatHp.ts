import type { CombatView, PlayerView } from '#src/engine/game.ts';

/** The weariness of the voters: past a round, every living player loses polls after the combats (engine, startCombats). */
function weariness(round: number, wearinessRound: number): number {
  return round >= wearinessRound ? round - wearinessRound + 1 : 0;
}

/**
 * The polls of both players around a combat, from the view the client had when the combat came in.
 * That view is the one of the recruitment, before the combat; after a reconnection, it may already
 * count it (its phase is then the combat of the same round).
 */
export function combatHp(combat: CombatView, view: Pick<PlayerView, 'hp' | 'phase' | 'round' | 'params' | 'table'>) {
  const tired = weariness(combat.round, view.params.wearinessRound);
  const ownLoss = combat.damage[combat.side] + tired;
  const enemyLoss = combat.damage[combat.side === 0 ? 1 : 0] + tired;
  const counted = view.phase === 'combat' && view.round === combat.round;
  const ownBefore = counted ? view.hp + ownLoss : view.hp;
  const row = view.table.find((entry) => entry.seat === combat.opponent.seat);
  const enemyBefore = row ? (counted ? row.hp + enemyLoss : row.hp) : null;
  return {
    own: { before: ownBefore, after: ownBefore - ownLoss },
    enemy: enemyBefore === null ? null : { before: enemyBefore, after: enemyBefore - enemyLoss },
    /** This combat takes the player's last polls. */
    eliminated: ownBefore - ownLoss <= 0,
  };
}
