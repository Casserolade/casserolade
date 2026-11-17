import { computed, ref, shallowRef } from 'vue';
import { browserStorage } from '#src/client/services/localProfile.ts';
import type { ProfileStorage } from '#src/client/services/localProfile.ts';
import { readProgress, readTitle, writeProgress, writeTitle } from '#src/client/services/progressStorage.ts';
import type { Niveau, Succes } from '#src/data/succes.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { bilanDePartie } from '#src/histoire/bilanDePartie.ts';
import { apresResultat, titres } from '#src/histoire/succes.ts';
import type { Resultat } from '#src/histoire/succes.ts';
import { suivrePartie } from '#src/histoire/suiviDePartie.ts';
import type { SuiviDePartie } from '#src/histoire/suiviDePartie.ts';

/** What a finished game was, beyond what the player's view says of it. */
export interface FinishedGame {
  /** The player's final place, and the seats of the table. */
  place: number;
  seats: number;
  /** The bots' level, in a quick game. */
  niveau?: Niveau;
  /** A career's chapter, won; and the career, when it is a politician's own. */
  chapitre?: string;
  carriere?: string;
  /** Online: the humans still at the table, and whether the player hosts a public room. */
  humans?: number;
  publicHost?: boolean;
}

/**
 * The achievements board of this browser: what was unlocked, the titles won and the one shown. Quick games, career
 * and online games count; an achievement only gives a title, so online tables stay even.
 */
export function createAchievements(storage: ProfileStorage | null = browserStorage()) {
  const progress = shallowRef(readProgress(storage));
  /** Unlocked since the current game started: the end screen shows them, then they stay on the board. */
  const fresh = shallowRef<Succes[]>([]);
  const chosenTitle = ref(readTitle(storage));
  /** What the game in progress showed so far, which its last view no longer tells. */
  let tally: SuiviDePartie | null = null;

  const earnedTitles = computed(() => titres(progress.value));
  /** A title shown only if it was earned here: a stored one may come from an older board. */
  const title = computed(() => (chosenTitle.value && earnedTitles.value.includes(chosenTitle.value) ? chosenTitle.value : null));

  function startGame(): void {
    fresh.value = [];
    tally = null;
  }

  /** Each view of the game in progress: the polls lost on the way and the biggest politician are read from them. */
  function observe(view: PlayerView | null): void {
    if (view) tally = suivrePartie(tally, view);
  }

  function record(result: Resultat): Succes[] {
    const { progres, nouveaux } = apresResultat(progress.value, result);
    progress.value = progres;
    writeProgress(progres, storage);
    if (nouveaux.length > 0) fresh.value = [...fresh.value, ...nouveaux];
    return nouveaux;
  }

  /** The end of a game, for the player: its facts, read from the last view and from what the game showed. */
  function recordGame(view: PlayerView | null, game: FinishedGame): Succes[] {
    if (!view) return [];
    const faits = bilanDePartie(view, tally, { place: game.place, joueurs: game.seats, humains: game.humans ?? 0, hotePublic: game.publicHost ?? false });
    return record({ faits, niveau: game.niveau, heros: view.heroId, chapitre: game.chapitre, carriere: game.carriere });
  }

  function chooseTitle(next: string | null): void {
    chosenTitle.value = next;
    writeTitle(next, storage);
  }

  return { progress, fresh, title, earnedTitles, startGame, observe, record, recordGame, chooseTitle };
}

export type Achievements = ReturnType<typeof createAchievements>;

export const achievements = createAchievements();
