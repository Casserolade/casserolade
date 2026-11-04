import type { CombatEvent } from '#src/engine/types.ts';

/** A killing blow of at least this much… */
const CRITICAL_DAMAGE = 8;
/** …and at least this many times the health it took away. */
const CRITICAL_OVERKILL = 3;
/** The big gags stay rare: the hardest blows of the combat only. */
const MAX_CRITICAL_KILLS = 2;

/**
 * The units that die from a critical hit: the anvil, the piano and the hammer fall on them only.
 * Every other death goes out in light. Read from the whole journal, before the combat plays.
 */
export function pickCriticalKills(log: CombatEvent[]): Set<number> {
  const health = new Map<number, number>();
  const blows: { uid: number; value: number }[] = [];
  for (const event of log) {
    if (event.e === 'debut') for (const unit of [...event.sides[0], ...event.sides[1]]) health.set(unit.uid, unit.hp);
    if (event.e === 'invocation') health.set(event.unit.uid, event.unit.hp);
    if (event.e === 'stats' || event.e === 'retour') health.set(event.uid, event.hp);
    if (event.e !== 'degats') continue;
    const before = health.get(event.uid) ?? event.hp + event.value;
    health.set(event.uid, event.hp);
    if (event.hp <= 0 && event.value >= CRITICAL_DAMAGE && event.value >= CRITICAL_OVERKILL * Math.max(1, before)) {
      blows.push({ uid: event.uid, value: event.value });
    }
  }
  const hardest = blows.sort((a, b) => b.value - a.value).slice(0, MAX_CRITICAL_KILLS);
  return new Set(hardest.map((blow) => blow.uid));
}
