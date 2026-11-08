import { bleep, saucer, spacePad } from '#src/client/cutscenes/audio/instruments/spaceSynths.ts';
import { theremin } from '#src/client/cutscenes/audio/instruments/theremin.ts';
import { defineMusic } from '#src/client/cutscenes/audio/score/defineMusic.ts';

/*
 * Flying saucers, original: 4/4 at 60, four bars of four seconds. A theremin sings one long phrase over a nebula
 * that slides by thirds (E minor, C minor, A flat, B), as fifties science fiction did; the onboard computer blips
 * in the echo, and a saucer crosses the sky. Sixteen steps a bar.
 */

const THEREMIN = 'B4:6 E5:2 G5:8 | G5:4 Eb5:4 C5:6 D5:2 | Eb5:4 Ab5:4 G5:6 Eb5:2 | F#5:4 A5:4 B5:6 .:2';
const NEBULA = 'E3+B3+G4:16 | C3+G3+Eb4:16 | Ab2+Eb3+C4:16 | B2+F#3+D#4:16';
const DEPTHS = 'E2:16 | C2:16 | Ab1:16 | B1:16';
const BLIPS = `.:2 E6 .:3 B6 .:4 G6 .:4 | . C7 .:4 G6 .:2 Eb7 .:6 | .:3 Ab6 .:2 C7 .:5 Eb7 .:3 |
  .:2 F#6 .:3 D#7 .:2 B6 .:6`;
const FLYBY = '.:32 x:10 .:22';

export const COSMIQUE = defineMusic({
  bpm: 60,
  stepsPerBeat: 4,
  loopSteps: 64,
  room: 'space',
  echo: { steps: 3, feedback: 0.42 },
  level: 1,
  tracks: [
    { kind: 'phrases', instrument: theremin, score: THEREMIN, level: 1, pan: -0.1, reverb: 0.45, echo: 0.22 },
    { kind: 'notes', instrument: spacePad, score: NEBULA, level: 1, reverb: 0.5 },
    { kind: 'notes', instrument: spacePad, score: DEPTHS, level: 0.8, reverb: 0.3 },
    { kind: 'notes', instrument: bleep, score: BLIPS, level: 0.9, pan: 0.4, reverb: 0.3, echo: 0.55 },
    { kind: 'notes', instrument: saucer, score: FLYBY, level: 1, reverb: 0.4, echo: 0.3 },
  ],
});
