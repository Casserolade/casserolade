import type { BotLevel } from '#src/bots/bots.ts';

const KEY = 'casserolade.partie_locale';
const KINDS = ['solo', 'carriere', 'tutoriel'] as const;
const LEVELS: readonly BotLevel[] = ['debutant', 'facile', 'moyen', 'difficile'];

/** A game played in this page: it lives in the page, and a reload ends it. */
export type LocalGameKind = (typeof KINDS)[number];

export interface LocalGameMark {
  kind: LocalGameKind;
  /** A solo game starts again with the same bots, and the same context choice. */
  botLevel?: BotLevel;
  contexte?: string;
}

export interface MarkStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The tab's sessionStorage: it survives a reload, not a closed tab. Nothing when the page may not use it. */
function tabStorage(): MarkStorage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** A local game starts: if the page reloads before it ends, the home screen will say so. */
export function markLocalGame(mark: LocalGameMark, storage: MarkStorage | null = tabStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(mark));
  } catch (error) {
    console.error('Could not mark the local game', error);
  }
}

/** The game ended, or the player left it: nothing to say after a reload. */
export function clearLocalGame(storage: MarkStorage | null = tabStorage()): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    // Nothing kept, nothing to clear.
  }
}

/** The local game a reload cut short, once: reading it forgets it. */
export function takeInterruptedGame(storage: MarkStorage | null = tabStorage()): LocalGameMark | null {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
  clearLocalGame(storage);
  if (!raw) return null;
  try {
    const mark = JSON.parse(raw) as Partial<LocalGameMark>;
    if (!mark || !KINDS.includes(mark.kind as LocalGameKind)) return null;
    return {
      kind: mark.kind as LocalGameKind,
      ...(LEVELS.includes(mark.botLevel as BotLevel) ? { botLevel: mark.botLevel } : {}),
      ...(typeof mark.contexte === 'string' ? { contexte: mark.contexte } : {}),
    };
  } catch {
    return null;
  }
}

/** What the home screen says about it, and the button that starts it again. */
export function interruptedNotice(mark: LocalGameMark): { text: string; action: string } {
  switch (mark.kind) {
    case 'solo':
      return { text: 'Votre partie solo s\'est arrêtée quand la page a été rechargée.', action: 'Relancer une partie' };
    case 'carriere':
      return { text: 'Votre élection s\'est arrêtée quand la page a été rechargée. La carrière, elle, est gardée.', action: 'Reprendre la carrière' };
    case 'tutoriel':
      return { text: 'Le tutoriel s\'est arrêté quand la page a été rechargée.', action: 'Relancer le tutoriel' };
  }
}
