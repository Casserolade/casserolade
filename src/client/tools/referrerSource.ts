import { HOST_NAME } from '#src/protocol/counterEvent.ts';

function withoutWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

/**
 * The site a visit came from, by its host name without « www. ». Empty when the visit came straight, from this very
 * site, or from somewhere without a proper host name.
 */
export function referrerSource(referrer: string, ownHost: string): string {
  let host: string;
  try {
    host = withoutWww(new URL(referrer).hostname);
  } catch {
    return '';
  }
  return host === withoutWww(ownHost) || !HOST_NAME.test(host) ? '' : host;
}
