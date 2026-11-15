import { ref } from 'vue';

const STORAGE_KEY = 'casserolade-plein-ecran';

function storedChoice(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

function pageCanGoFullscreen(): boolean {
  return typeof document !== 'undefined' && Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
}

/** Full screen needs a touch first: a game taken up again on loading has none, and stays in the bars. */
function touchedJustNow(): boolean {
  return typeof navigator === 'undefined' || !navigator.userActivation || navigator.userActivation.isActive;
}

function pageIsFullscreen(): boolean {
  return typeof document !== 'undefined' && document.fullscreenElement !== null;
}

/**
 * Full screen on a phone (15 November 2026): the browser's bars leave the game the whole screen. A game started by a
 * touch goes full screen, the home screen gives the bars back; the switch in the settings is kept for the next visit.
 * An iPhone has no full screen for a page: it gets one from the home screen, by the site's manifest.
 */
function createFullscreenMode() {
  const supported = pageCanGoFullscreen();
  const wanted = ref(storedChoice());
  const active = ref(pageIsFullscreen());

  if (supported) document.addEventListener('fullscreenchange', () => (active.value = pageIsFullscreen()));

  function enter(): void {
    if (!supported || pageIsFullscreen() || !touchedJustNow()) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch((error: unknown) => {
      console.error('Full screen refused', error);
    });
  }

  function leave(): void {
    if (!supported || !pageIsFullscreen()) return;
    document.exitFullscreen().catch((error: unknown) => console.error('Full screen could not be left', error));
  }

  /** A game starts: full screen, if the player keeps it on. */
  function enterIfWanted(): void {
    if (wanted.value) enter();
  }

  /** The switch of the settings: it also goes in or out right away (the touch on it allows it). */
  function toggle(): void {
    wanted.value = !active.value;
    try {
      localStorage.setItem(STORAGE_KEY, wanted.value ? '1' : '0');
    } catch (error) {
      console.error('Full screen setting could not be saved', error);
    }
    if (wanted.value) enter();
    else leave();
  }

  return { supported, active, enterIfWanted, leave, toggle };
}

export const fullscreenMode = createFullscreenMode();
