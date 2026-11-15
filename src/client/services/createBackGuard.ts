/** What the guard needs of the page: its history, and where popstate is heard. */
export interface BackGuardPage {
  history: Pick<History, 'pushState' | 'back'>;
  addEventListener(type: 'popstate', listener: () => void): void;
  removeEventListener(type: 'popstate', listener: () => void): void;
}

export interface BackGuard {
  /** Away from the home screen: a back gesture stays in the game. */
  hold(): void;
  /** Back home: the guard's history entry goes, and back leaves the site again. */
  release(): void;
  destroy(): void;
}

/**
 * On a phone, the back gesture (a swipe from the edge, the system's back button) left the site in the middle of a
 * game (15 November 2026). While held, the guard keeps one history entry of its own over the page's: a back gesture
 * only takes that entry, and the guard puts it back. Leaving a game stays a choice made in the game.
 */
export function createBackGuard(page: BackGuardPage): BackGuard {
  const state = { held: false, entryPushed: false, releasing: false };

  function pushEntry(): void {
    page.history.pushState({ casseroladeBackGuard: true }, '');
    state.entryPushed = true;
  }

  function onPopState(): void {
    if (state.releasing) {
      state.releasing = false;
      return;
    }
    state.entryPushed = false;
    if (state.held) pushEntry();
  }

  page.addEventListener('popstate', onPopState);

  return {
    hold() {
      state.held = true;
      if (!state.entryPushed) pushEntry();
    },
    release() {
      state.held = false;
      if (!state.entryPushed) return;
      state.entryPushed = false;
      state.releasing = true;
      page.history.back();
    },
    destroy() {
      page.removeEventListener('popstate', onPopState);
    },
  };
}
