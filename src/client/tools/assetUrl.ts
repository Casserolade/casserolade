/** The site's base: '/' in development, './' in a build meant to be served from any folder. */
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

declare const __ASSET_VERSIONS__: Record<string, string> | undefined;
/** In a build, each file's version by its path (vite.config.ts); none in development and in the tests. */
const VERSIONS: Record<string, string> = typeof __ASSET_VERSIONS__ === 'undefined' ? {} : __ASSET_VERSIONS__;

/**
 * Where a path of manifest.json is served: assets/game is the public folder of the site. In a build, the address
 * names the file's version (?v=…): the browser keeps it until the file changes. With a relative base, the address is
 * made absolute from the page: a relative url() inside a CSS variable would otherwise resolve against the stylesheet's
 * folder.
 */
export function assetUrl(relativePath: string): string {
  const version = Object.hasOwn(VERSIONS, relativePath) ? VERSIONS[relativePath] : null;
  const path = `${BASE}${relativePath}${version ? `?v=${version}` : ''}`;
  if (BASE.startsWith('/') || typeof document === 'undefined') return path;
  return new URL(path, document.baseURI).href;
}
