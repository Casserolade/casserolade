/** The link to share: opening it lands on the home screen, with the code filled in. */
export function buildInviteLink(origin: string, code: string): string {
  return `${origin}/?salon=${encodeURIComponent(code)}`;
}
