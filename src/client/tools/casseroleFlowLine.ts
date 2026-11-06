/** Room for the icon before each name, as many characters as the icon is wide. */
const ICON_ROOM = '··';

/**
 * The casseroles of a card as its rules box measures them (fittedRulesSize): one flow of names, each with room for
 * its icon, wrapping like the text around it.
 */
export function casseroleFlowLine(names: string[]): string {
  return names.map((name) => `${ICON_ROOM} ${name}`).join('  ');
}
