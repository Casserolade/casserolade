import { ref, watch } from 'vue';
import { TAGLINES } from '#src/client/const/taglines.ts';
import { savePseudo, savedPseudo } from '#src/client/services/localProfile.ts';
import { pickOne } from '#src/client/tools/pickOne.ts';
import { PLATEAUX, SECOND_TOUR } from '#src/data/plateaux.ts';

/**
 * What every home page shares, on a computer or a phone: the pseudo typed once and kept for the next visit, one of
 * the game's TV sets behind, and one of its subtitles under the logo, both drawn at each visit.
 */
export function useHomePage() {
  const pseudo = ref(savedPseudo());
  watch(pseudo, (value) => savePseudo(value));
  const plateauId = pickOne([...PLATEAUX, SECOND_TOUR].map((plateau) => plateau.id), Math.random()) ?? SECOND_TOUR.id;
  const tagline = pickOne(TAGLINES, Math.random()) ?? TAGLINES[0];
  return { pseudo, plateauId, tagline };
}
