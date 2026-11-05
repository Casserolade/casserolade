/** A collected phrase, as data/collecte/saillies/*.json and petites_phrases_*.json hold it. */
export interface CollectedPhrase {
  texte: string;
  moments: string[];
  fiabilite: string;
  audio?: string;
  source?: string;
  sources?: string[];
  date?: string;
  contexte?: string;
  /** The true words, confirmed by a source or by the user's ear: what the bubble shows. */
  texte_exact?: string;
  /** `transcription`: the words come from the speech recogniser, and wait for their true text. */
  texte_origine?: string;
  /** Removed by the user on the review page: never shown again. */
  vire?: boolean;
  /** Waits for the user's decision (an editorial doubt): not shown until then. */
  a_trancher?: string;
}

/** The words a bubble shows: the confirmed ones, never what the speech recogniser alone heard; none for a removed or doubtful one. */
export function shownText(p: CollectedPhrase): string | null {
  if (p.vire || p.a_trancher) return null;
  if (p.texte_exact) return p.texte_exact;
  return p.texte_origine === 'transcription' ? null : p.texte;
}
