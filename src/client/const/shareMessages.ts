import type { ShareOutcome } from '#src/client/services/shareGame.ts';

/** What the share button says once pressed. When nothing worked, the address to type. */
export const SHARE_MESSAGES: Record<ShareOutcome, string> = {
  shared: 'Merci ! Un électeur de plus.',
  copied: 'Lien copié : il n\'y a plus qu\'à le coller.',
  cancelled: '',
  failed: 'L\'adresse : casserolade.fr',
};
