import { createBadRecorder } from '#src/client/cutscenes/audio/instruments/badRecorder.ts';
import { defineMusic } from '#src/client/cutscenes/audio/score/defineMusic.ts';

/*
 * La Marseillaise (Rouget de Lisle, 1792, public domain), its first two lines on a school recorder, sounding an
 * octave above the voice, in G: « Allons enfants de la Patrie, le jour de gloire est arrivé ! Contre nous de la
 * tyrannie, l'étendard sanglant est levé ». The loop starts on the upbeat « Al-lons en- », sixteen steps a bar.
 */
const TUNE = `D5 D5:3 D5 | G5:4 G5:4 A5:4 A5:4 | D6:6 B5:2 G5:2 .:1 G5:1 B5:3 G5:1 | E5:4 C6:8 A5:3 F#5:1 |
  G5:8 .:4 G5:3 A5:1 | B5:4 B5:4 B5:4 C6:3 B5:1 | B5:4 A5:4 .:4 A5:3 B5:1 | C6:4 C6:4 C6:4 D6:3 C6:1 | B5:8 .:3`;

/**
 * The first time through, the tune is still heard: « Pa-tri- » squeaks, « ar-ri- » forgets its sharp, « vé »
 * runs out of breath, « L'é- » comes late, and « est le- » squeals. After that, luck decides.
 */
const recorder = createBadRecorder({ 7: 'squeak', 16: 'wrong', 17: 'crack', 27: 'late', 32: 'squeal' });

export const MARSEILLAISE_POURRIE = defineMusic({
  bpm: 100,
  stepsPerBeat: 4,
  loopSteps: 128,
  room: 'small',
  level: 1,
  tracks: [{ kind: 'notes', instrument: recorder, score: TUNE, level: 1, reverb: 0.22, articulation: 0.92 }],
});
