import type { Musique } from '#src/data/histoire/cinematique.ts';
import { COSMIQUE } from '#src/client/cutscenes/audio/musics/cosmique.ts';
import { FANFARE } from '#src/client/cutscenes/audio/musics/fanfare.ts';
import { GLAS } from '#src/client/cutscenes/audio/musics/glas.ts';
import { JINGLE_INFO } from '#src/client/cutscenes/audio/musics/jingleInfo.ts';
import { MARSEILLAISE_POURRIE } from '#src/client/cutscenes/audio/musics/marseillaisePourrie.ts';
import { PIANO_MUET } from '#src/client/cutscenes/audio/musics/pianoMuet.ts';
import { POURSUITE } from '#src/client/cutscenes/audio/musics/poursuite.ts';
import { SUSPENSE } from '#src/client/cutscenes/audio/musics/suspense.ts';
import type { Music } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/** Every music of the cutscenes; `aucune` is silence. */
export const MUSIC_LIBRARY: Record<Exclude<Musique, 'aucune'>, Music> = {
  poursuite: POURSUITE,
  marseillaise_pourrie: MARSEILLAISE_POURRIE,
  suspense: SUSPENSE,
  jingle_info: JINGLE_INFO,
  fanfare: FANFARE,
  glas: GLAS,
  piano_muet: PIANO_MUET,
  cosmique: COSMIQUE,
};
