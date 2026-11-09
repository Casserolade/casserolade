import { ref } from 'vue';
import { CINEMA_CHEAT } from '#src/client/const/cinemaCheat.ts';
import { typedTail } from '#src/client/tools/typedTail.ts';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(CINEMA_CHEAT.storageKey) === '1';
  } catch {
    return false;
  }
}

/** A key typed into a field is someone writing, not a code. */
function isTypingField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

/**
 * The cinema cheat of this browser: the code word turns it on, the same word again turns it off. `justToggled` says it
 * for a moment, so the player sees the code was taken.
 */
function createCinemaCheat() {
  const enabled = ref(readEnabled());
  const justToggled = ref(false);
  let tail = '';
  let listening = false;
  let noticeTimer = 0;

  function set(value: boolean): void {
    enabled.value = value;
    justToggled.value = true;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => (justToggled.value = false), 2600);
    try {
      if (value) localStorage.setItem(CINEMA_CHEAT.storageKey, '1');
      else localStorage.removeItem(CINEMA_CHEAT.storageKey);
    } catch (error) {
      console.error('Cinema cheat could not be saved', error);
    }
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || isTypingField(event.target)) return;
    tail = typedTail(tail, event.key, CINEMA_CHEAT.word.length);
    if (tail !== CINEMA_CHEAT.word) return;
    tail = '';
    set(!enabled.value);
  }

  /** Once, for the whole page: the keyboard, and the code given in the address (for phones). */
  function listen(): void {
    if (listening) return;
    listening = true;
    window.addEventListener('keydown', handleKey);
    const url = new URL(window.location.href);
    if (url.searchParams.get(CINEMA_CHEAT.urlParameter)?.toLowerCase() !== CINEMA_CHEAT.word) return;
    set(true);
    url.searchParams.delete(CINEMA_CHEAT.urlParameter);
    window.history.replaceState(window.history.state, '', url);
  }

  return { enabled, justToggled, listen };
}

export const cinemaCheat = createCinemaCheat();
