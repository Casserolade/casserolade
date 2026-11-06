import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

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
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

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
async function findFile(root: string, urlPath: string): Promise<string | null> {
  const paths = urlPath.endsWith('/') ? [`${urlPath}index.html`] : extname(urlPath) ? [urlPath] : [urlPath, `${urlPath}.html`, `${urlPath}/index.html`];
  for (const path of paths) {
    const candidate = resolveInside(root, path);
    if (candidate && (await stat(candidate).catch(() => null))?.isFile()) return candidate;
  }
  return null;
}

/** Serves the built client. Nothing outside its folder can be reached. */
export async function serveStatic(root: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const urlPath = new URL(request.url ?? '/', 'http://localhost').pathname;
  const file = await findFile(root, urlPath);
  if (!file) {
    response.writeHead(404, SECURITY_HEADERS).end('Introuvable');
    return;
  }
  response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}
