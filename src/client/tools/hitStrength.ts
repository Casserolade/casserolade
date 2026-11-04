/** From a scratch to a knockout blow, about 0.6 to 2: how big the flash, the number and the sound of a hit are. */
export function hitStrength(damage: number, healthBefore: number): number {
  const lethal = damage >= healthBefore ? 0.3 : 0;
  return Math.min(2, 0.6 + damage / 8 + lethal);
}
