import { createReadStream } from 'node:fs';
import type { Stats } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { contentHash } from './assetVersions.ts';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/**
 * How long a browser keeps a file. An address that names its content keeps it a year without asking again: Vite's
 * bundles (/assets/, hashed names) and the game's files asked with their version (?v=…, assetUrl). Anything else,
 * the pages and manifest.json first, is asked again each time, and answered « not modified » in a few bytes.
 */
const KEEP_FOREVER = 'public, max-age=31536000, immutable';
const ASK_AGAIN = 'no-cache';
const BUNDLES = '/assets/';

/** Each file's version, computed once while it stays the same (a rebuild under a running server changes it). */
const versions = new Map<string, { size: number; mtimeMs: number; version: Promise<string> }>();

function versionOf(file: string, stats: Stats): Promise<string> {
  const known = versions.get(file);
  if (known && known.size === stats.size && known.mtimeMs === stats.mtimeMs) return known.version;
  const version = readFile(file).then(contentHash);
  versions.set(file, { size: stats.size, mtimeMs: stats.mtimeMs, version });
  return version;
}

function resolveInside(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const absolute = resolve(join(root, decoded));
  return absolute === root || absolute.startsWith(root + sep) ? absolute : null;
}

/**
 * The file behind a URL: itself, a page named without its extension (/a-propos for a-propos.html), or the index of a
 * folder (/m/ and /m for m/index.html, the phone version).
 */
async function findFile(root: string, urlPath: string): Promise<{ file: string; stats: Stats } | null> {
  const paths = urlPath.endsWith('/') ? [`${urlPath}index.html`] : extname(urlPath) ? [urlPath] : [urlPath, `${urlPath}.html`, `${urlPath}/index.html`];
  for (const path of paths) {
    const candidate = resolveInside(root, path);
    const stats = candidate ? await stat(candidate).catch(() => null) : null;
    if (candidate && stats?.isFile()) return { file: candidate, stats };
  }
  return null;
}

/**
 * Serves the built client. Nothing outside its folder can be reached. Each file carries its version as an ETag: what
 * the browser already has comes back « not modified », and an address that names its version is kept for good.
 */
export async function serveStatic(root: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const found = await findFile(root, url.pathname);
  if (!found) {
    response.writeHead(404, SECURITY_HEADERS).end('Introuvable');
    return;
  }
  const version = await versionOf(found.file, found.stats);
  const etag = `"${version}"`;
  // An old page may still ask for an old version: it gets today's file, to be asked again next time.
  const named = url.pathname.startsWith(BUNDLES) || url.searchParams.get('v') === version;
  const caching = { ETag: etag, 'Cache-Control': named ? KEEP_FOREVER : ASK_AGAIN };
  if (request.headers['if-none-match']?.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag)) {
    response.writeHead(304, { ...SECURITY_HEADERS, ...caching }).end();
    return;
  }
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    ...caching,
    'Content-Type': MIME_TYPES[extname(found.file)] ?? 'application/octet-stream',
    'Content-Length': found.stats.size,
  });
  createReadStream(found.file).pipe(response);
}
