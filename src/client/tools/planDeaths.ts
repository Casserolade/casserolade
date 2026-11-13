import { deathKind } from '#src/client/tools/deathKind.ts';
import type { DeathKind, KillingBlow } from '#src/client/tools/deathKind.ts';
import type { CombatEvent, CombatUnit } from '#src/engine/types.ts';

export interface DeathPlan {
  kind: DeathKind;
  /** The blow that ends the combat: slow motion, and the whole studio shakes. */
  finale: boolean;
}

interface Fall {
  uid: number;
  side: 0 | 1;
  plan: DeathPlan;
}

/**
 * How each politician of the combat dies (deathKind), read from the whole journal before it plays: by uid. A Retour en
 * politique dies for good too, and its reincarnation is a new unit, with its own uid. The last death of the beaten side is the finale, and it explodes (a Polémique
 * still burns).
 */
export function planDeaths(log: CombatEvent[]): Map<number, DeathPlan> {
  const units = new Map<number, { unit: CombatUnit; side: 0 | 1 }>();
  const health = new Map<number, number>();
  const lastBlow = new Map<number, KillingBlow>();
  const poisoned = new Set<number>();
  const falls: Fall[] = [];
  let beaten: 0 | 1 | null = null;
  let emptied = [false, false];
  const meet = (unit: CombatUnit, side: 0 | 1) => {
    units.set(unit.uid, { unit, side });
    health.set(unit.uid, unit.hp);
  };
  for (const event of log) {
    switch (event.e) {
      case 'debut':
        event.sides.forEach((side, index) => side.forEach((unit) => meet(unit, index as 0 | 1)));
        break;
      case 'invocation':
      case 'retour':
        meet(event.unit, event.side);
        break;
      case 'stats':
        health.set(event.uid, event.hp);
        break;
      case 'degats':
        lastBlow.set(event.uid, { value: event.value, before: health.get(event.uid) ?? event.hp + event.value });
        health.set(event.uid, event.hp);
        break;
      case 'polemique':
        poisoned.add(event.uid);
        break;
      case 'mort': {
        const known = units.get(event.uid);
        falls.push({ uid: event.uid, side: known?.side ?? 0, plan: { kind: deathKind(known?.unit, lastBlow.get(event.uid), poisoned.has(event.uid)), finale: false } });
        break;
      }
      case 'fin':
        beaten = event.winner === null ? null : event.winner === 0 ? 1 : 0;
        emptied = [event.sides[0].length === 0, event.sides[1].length === 0];
        break;
      default:
    }
  }
  const finale = falls.findLast((fall) => (beaten === null ? emptied[0] && emptied[1] : emptied[beaten] && fall.side === beaten));
  if (finale) finale.plan = { kind: finale.plan.kind === 'burn' ? 'burn' : 'explode', finale: true };
  return new Map(falls.map((fall) => [fall.uid, fall.plan]));
}
