import { signed } from '#src/client/tools/signed.ts';

/** What floats above a card that gains or loses stats: "+2/+1", or nothing if nothing changed. */
export function statsChangeLabel(atkBefore: number, hpBefore: number, atk: number, hp: number): string | null {
  if (atk === atkBefore && hp === hpBefore) return null;
  return `${signed(atk - atkBefore)}/${signed(hp - hpBefore)}`;
}
