import type { IncomingMessage, ServerResponse } from 'node:http';
import { MAX_COUNTER_BYTES } from '../protocol/counterEvent.ts';
import type { CounterEvent } from '../protocol/counterEvent.ts';
import { parseCounterEvent } from '../protocol/parseCounterEvent.ts';
import { isRobot } from './isRobot.ts';
import { readBody } from './readBody.ts';

const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export interface CounterHandling {
  /** The pages of the game, the only ones whose events count. */
  allowedOrigins: readonly string[];
  /** The request's address, used for the rate limit only. */
  addressOf: (request: IncomingMessage) => string;
  /** False when this address sent too many events lately. */
  allow: (address: string) => boolean;
  record: (event: CounterEvent) => void;
  /** A robot ran a page and sent its event: it is counted apart, and nothing else. */
  recordRobot: () => void;
}

function answer(response: ServerResponse, status: number): void {
  response.writeHead(status, HEADERS).end();
}

/**
 * The counter (POST /compteur): one event of a page, checked, then added to the day's totals. A refused event only
 * gets its status: the page sends and forgets.
 */
export async function handleCounter(request: IncomingMessage, response: ServerResponse, handling: CounterHandling): Promise<void> {
  if (request.method !== 'POST') return answer(response, 405);
  if (!handling.allowedOrigins.includes(request.headers.origin ?? '')) return answer(response, 403);
  if (!handling.allow(handling.addressOf(request))) return answer(response, 429);
  if (Number(request.headers['content-length'] ?? 0) > MAX_COUNTER_BYTES) return answer(response, 413);
  const body = await readBody(request, MAX_COUNTER_BYTES);
  const event = body === null ? null : parseCounterEvent(body);
  if (!event) return answer(response, 400);
  if (isRobot(request.headers['user-agent'])) handling.recordRobot();
  else handling.record(event);
  answer(response, 204);
}
