/**
 * The real voices already heard in this game: in a game, the same voice is never heard twice (5 November 2026). The
 * game store forgets them when a game starts; playVoice checks and records them.
 */
function createHeardVoices() {
  const heard = new Set<string>();

  function has(key: string): boolean {
    return heard.has(key);
  }

  function remember(key: string): void {
    heard.add(key);
  }

  function forget(): void {
    heard.clear();
  }

  return { has, remember, forget };
}

export const heardVoices = createHeardVoices();
