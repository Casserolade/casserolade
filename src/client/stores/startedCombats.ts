/**
 * The combats whose playback has started, kept across remounts of the combat screen. On the dev server, saving a
 * file the screen depends on remounts it (Vite hot reload), and the combat used to start again from the top, two
 * or three times in a row (5 November 2026). A combat already started now goes straight to its end.
 */
export const startedCombats: WeakSet<object> = import.meta.hot?.data.startedCombats ?? new WeakSet();
if (import.meta.hot) import.meta.hot.data.startedCombats = startedCombats;
