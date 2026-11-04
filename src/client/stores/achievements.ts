import { computed, ref, shallowRef } from 'vue';
import { browserStorage } from '#src/client/services/localProfile.ts';
import type { ProfileStorage } from '#src/client/services/localProfile.ts';
import { readProgress, readTitle, writeProgress, writeTitle } from '#src/client/services/progressStorage.ts';
import type { Succes } from '#src/data/succes.ts';
import { apresResultat, herosAuChoix, titres } from '#src/histoire/succes.ts';
import type { Resultat } from '#src/histoire/succes.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { Classement } from '#src/protocol/messages.ts';

/** The human's seat in every local game: solo, career, tutorial. */
const HUMAN_SEAT = 0;

/**
 * The achievements board of this browser: what was unlocked, the titles won and the one shown.
 * Only local games count; online tables stay even, whatever a reward gives.
 */
export function createAchievements(storage: ProfileStorage | null = browserStorage()) {
  const progress = shallowRef(readProgress(storage));
  /** Unlocked since the current game started: the end screen shows them, then they stay on the board. */
  const fresh = shallowRef<Succes[]>([]);
  const chosenTitle = ref(readTitle(storage));

  const earnedTitles = computed(() => titres(progress.value));
  /** A title shown only if it was earned here: a stored one may come from an older board. */
  const title = computed(() => (chosenTitle.value && earnedTitles.value.includes(chosenTitle.value) ? chosenTitle.value : null));
  const heroChoices = computed(() => herosAuChoix(progress.value));

  function startGame(): void {
    fresh.value = [];
  }

  function record(result: Resultat): Succes[] {
    const { progres, nouveaux } = apresResultat(progress.value, result);
    progress.value = progres;
    writeProgress(progres, storage);
    if (nouveaux.length > 0) fresh.value = [...fresh.value, ...nouveaux];
    return nouveaux;
  }

  /** The end of a local game: the human's place, and what they did in it. */
  function recordGame(ranking: Classement, view: PlayerView | null, extra: Omit<Resultat, 'place' | 'stats'> = {}): Succes[] {
    const place = ranking.find((row) => row.seat === HUMAN_SEAT)?.place;
    return record({ ...extra, place, stats: view?.stats });
  }

  function chooseTitle(next: string | null): void {
    chosenTitle.value = next;
    writeTitle(next, storage);
  }

  return { progress, fresh, title, earnedTitles, heroChoices, startGame, record, recordGame, chooseTitle };
}

export type Achievements = ReturnType<typeof createAchievements>;

export const achievements = createAchievements();
