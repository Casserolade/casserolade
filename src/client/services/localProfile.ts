const PLAYER_KEY = 'casserolade.joueur';
const PSEUDO_KEY = 'casserolade.pseudo';
/** What the server accepts as an anonymous player id (see parseClientMessage). */
const PLAYER_ID = /^[A-Za-z0-9-]{16,64}$/;
const MAX_PSEUDO_LENGTH = 24;

export interface ProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The browser's localStorage, or nothing when the page may not use it. */
export function browserStorage(): ProfileStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** A random id: randomUUID needs a secure page, getRandomValues works everywhere. */
function randomId(): string {
  if (typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // An insecure page: fall through.
    }
  }
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function read(storage: ProfileStorage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** True when the value is kept. */
export function write(storage: ProfileStorage | null, key: string, value: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Could not keep', key, error);
    return false;
  }
}

/** Without storage, the id still lasts as long as the page. */
let pageId: string | null = null;

/**
 * The anonymous id that lets the server find this browser's MMR: no account, no cookie.
 * Made once, then kept. Another browser starts again at 1000.
 */
export function playerId(storage: ProfileStorage | null = browserStorage(), makeId: () => string = randomId): string {
  const stored = read(storage, PLAYER_KEY);
  if (stored && PLAYER_ID.test(stored)) return stored;
  const id = makeId();
  if (write(storage, PLAYER_KEY, id)) return id;
  pageId ??= id;
  return pageId;
}

/** The pseudo typed last time, to find it again in every form. */
export function savedPseudo(storage: ProfileStorage | null = browserStorage()): string {
  return (read(storage, PSEUDO_KEY) ?? '').slice(0, MAX_PSEUDO_LENGTH);
}

export function savePseudo(pseudo: string, storage: ProfileStorage | null = browserStorage()): void {
  write(storage, PSEUDO_KEY, pseudo.trim().slice(0, MAX_PSEUDO_LENGTH));
}
