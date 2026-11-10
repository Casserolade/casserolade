import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

/**
 * A file's version: the start of its content's hash. The same file keeps it from one deployment to the next, a changed
 * file gets a new one: its address changes with it, and browsers keep it as long as it lives (serveStatic.ts).
 */
export function contentHash(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('base64url').slice(0, 10);
}

/** What the pages load from assets/game; the per-character and per-effect JSON files only feed manifest.json. */
const LOADED = new Set(['.webp', '.png', '.svg', '.mp3', '.woff2', '.ico']);

function isLoaded(path: string): boolean {
  const extension = extname(path);
  return LOADED.has(extension) || (extension === '.json' && !path.includes('/'));
}

/**
 * The version of each file the pages load from a folder, by its path in it (« personnages/macron.webp »): the build
 * gives it to assetUrl (vite.config.ts), which adds it to each address as ?v=….
 */
export function assetVersions(dir: string): Record<string, string> {
  const versions: Record<string, string> = {};
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = join(entry.parentPath, entry.name);
    const path = relative(dir, file).split(sep).join('/');
    if (isLoaded(path)) versions[path] = contentHash(readFileSync(file));
  }
  return versions;
}
