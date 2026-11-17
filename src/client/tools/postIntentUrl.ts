/** The address that opens a new post on X (Twitter), its text ready and a link under it. A picture cannot ride along: it is pasted. */
export function postIntentUrl(text: string, link: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
}
