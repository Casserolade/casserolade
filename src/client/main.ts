import { computerChosen } from '#src/client/services/versionChoice.ts';
import { prefersPhoneVersion } from '#src/client/tools/prefersPhoneVersion.ts';

/**
 * A phone goes to its own version (/m/), with what the address carried, a room's invitation for one. The check runs
 * before the game loads: a phone does not download the computer version to leave it.
 */
const phone = prefersPhoneVersion({
  coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  shortSide: Math.min(window.screen.width, window.screen.height),
  computerChosen: computerChosen(),
});
if (phone) window.location.replace(`/m/${window.location.search}${window.location.hash}`);
else import('./desktop.ts').catch((error: unknown) => console.error('The game failed to load', error));
