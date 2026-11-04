/** The site's base: '/' in development, './' in a build meant to be served from any folder. */
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/**
 * Where a path of manifest.json is served: assets/game is the public folder of the site. With a
 * relative base, the address is made absolute from the page: a relative url() inside a CSS
 * variable would otherwise resolve against the stylesheet's folder.
 */
export function assetUrl(relativePath: string): string {
  const path = `${BASE}${relativePath}`;
  if (BASE.startsWith('/') || typeof document === 'undefined') return path;
  return new URL(path, document.baseURI).href;
}
