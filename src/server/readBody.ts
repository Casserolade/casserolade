import type { IncomingMessage } from 'node:http';

/** The request's body as text, or null when it is longer than `maxBytes` or the request fails. Reads no further. */
export function readBody(request: IncomingMessage, maxBytes: number): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        resolve(null);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', () => resolve(null));
    request.on('close', () => resolve(null));
  });
}
