import { SHARE_INVITE } from '#src/client/const/shareInvite.ts';

/** Sent through the phone's share sheet, copied to be pasted, the sheet closed without sharing, or nothing possible. */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Shares the game: the share sheet on a phone, where it lists the apps people talk in; the link copied elsewhere,
 * where a share sheet is rarely what one wants. Never throws: the button shows the outcome.
 */
export async function shareGame(): Promise<ShareOutcome> {
  try {
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      await navigator.share(SHARE_INVITE);
      return 'shared';
    }
    await navigator.clipboard.writeText(SHARE_INVITE.url);
    return 'copied';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    console.error('Sharing the game failed', error);
    return 'failed';
  }
}
