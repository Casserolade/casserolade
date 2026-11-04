import type { Campagne } from '#src/histoire/campagne.ts';

const CAMPAIGN_KEY = 'plateau.campagne';

/** The story has no account: its progress lives in this browser. Private windows may refuse. */
export function loadCampaign(): Campagne | null {
  try {
    const saved = localStorage.getItem(CAMPAIGN_KEY);
    return saved ? (JSON.parse(saved) as Campagne) : null;
  } catch (error) {
    console.error('Could not read the saved campaign', error);
    return null;
  }
}

export function saveCampaign(campaign: Campagne | null): void {
  try {
    if (campaign) localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
    else localStorage.removeItem(CAMPAIGN_KEY);
  } catch (error) {
    console.error('Could not save the campaign', error);
  }
}
