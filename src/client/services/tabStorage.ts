export interface TabStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The tab's sessionStorage: it survives a reload, not a closed tab. Nothing when the page may not use it. */
export function tabStorage(): TabStorage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}
