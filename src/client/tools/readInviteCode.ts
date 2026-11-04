/** The room code in a page's query string, or an empty string. */
export function readInviteCode(search: string): string {
  return (new URLSearchParams(search).get('salon') ?? '').trim().toUpperCase();
}
