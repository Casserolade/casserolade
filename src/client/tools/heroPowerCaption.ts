import type { HeroPowerStatus } from '#src/client/tools/heroPowerStatus.ts';

/** The line under the power's button: why it waits, or how often it serves. */
export function heroPowerCaption(status: HeroPowerStatus): string {
  if (status.refusal) return status.refusal;
  return status.power.frequency === 'partie' ? 'Une fois par partie' : 'Une fois par manche';
}
