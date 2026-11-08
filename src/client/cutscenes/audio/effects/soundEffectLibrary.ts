import type { Bruitage } from '#src/data/histoire/cinematique.ts';
import { BOING, SIFFLET, TELEPORTATION, TIROIR_CAISSE } from '#src/client/cutscenes/audio/effects/cartoon.ts';
import { APPLAUDISSEMENTS, HUEES } from '#src/client/cutscenes/audio/effects/crowd.ts';
import { KLAXON, POUET, SIRENE } from '#src/client/cutscenes/audio/effects/horns.ts';
import { BIP } from '#src/client/cutscenes/audio/effects/electronics.ts';
import { CHUTE, COUP, MASSE } from '#src/client/cutscenes/audio/effects/impacts.ts';
import { CLOCHE, GONG, TAMBOUR } from '#src/client/cutscenes/audio/effects/percussion.ts';
import type { SoundEffect } from '#src/client/cutscenes/audio/effects/soundEffectTypes.ts';

/** Every sound effect of the cutscenes. */
export const SOUND_EFFECT_LIBRARY: Record<Bruitage, SoundEffect> = {
  coup: COUP,
  masse: MASSE,
  boing: BOING,
  klaxon: KLAXON,
  sifflet: SIFFLET,
  applaudissements: APPLAUDISSEMENTS,
  huees: HUEES,
  cloche: CLOCHE,
  tambour: TAMBOUR,
  gong: GONG,
  chute: CHUTE,
  pouet: POUET,
  sirene: SIRENE,
  teleportation: TELEPORTATION,
  tiroir_caisse: TIROIR_CAISSE,
  bip: BIP,
};
