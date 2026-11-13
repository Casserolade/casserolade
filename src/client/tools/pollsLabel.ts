import { splitPolls } from '#src/client/tools/splitPolls.ts';

/** What a hero has left, in words: its polls, and its electoral base (its armor) while some of it is left. */
export function pollsLabel(hp: number, startHp: number): string {
  const { polls, electoralBase } = splitPolls(hp, startHp);
  const words = `${polls} sondage${polls > 1 ? 's' : ''}`;
  return electoralBase > 0 ? `${words}, ${electoralBase} de socle électoral` : words;
}
