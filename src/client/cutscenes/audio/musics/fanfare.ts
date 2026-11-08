import { horn, trumpet, tuba } from '#src/client/cutscenes/audio/instruments/brass.ts';
import { glockenspiel } from '#src/client/cutscenes/audio/instruments/bells.ts';
import { crash, snare } from '#src/client/cutscenes/audio/instruments/drums.ts';
import { timpani, timpaniRoll } from '#src/client/cutscenes/audio/instruments/timpani.ts';
import { defineMusic } from '#src/client/cutscenes/audio/score/defineMusic.ts';

/*
 * A victory fanfare, original: 4/4 at 120, eight bars in B flat, twelve steps a beat for the triplets (a triplet
 * eighth is 4 steps, a sixteenth 3, a quarter 12). Two trumpets in thirds, horns holding the chords, low brass and
 * kettle drums on the strong beats, a marching snare, a glockenspiel for the sparkle. Chords: Bb, Eb Bb, Cm, F7,
 * Bb, Eb F, Bb Gm, F Bb.
 */

const TUNE = `F4:4 F4:4 F4:4 Bb4:18 D5:6 F5!:12 | Eb5:12 D5:6 C5:6 D5:24 | G4:4 G4:4 G4:4 C5:18 Eb5:6 G5!:12 |
  F5:12 Eb5:6 D5:6 C5:24 | D5:4 D5:4 D5:4 F5:18 D5:6 Bb5!:12 | C6!:12 Bb5:6 A5:6 G5:12 A5:12 |
  Bb5!:18 F5:6 D5:18 Bb4:6 | C5:12 A4:6 F4:6 Bb4:24`;
const SECOND = `D4:4 D4:4 D4:4 F4:18 Bb4:6 D5:12 | C5:12 Bb4:6 A4:6 Bb4:24 | Eb4:4 Eb4:4 Eb4:4 G4:18 C5:6 Eb5:12 |
  C5:12 C5:6 Bb4:6 A4:24 | Bb4:4 Bb4:4 Bb4:4 D5:18 Bb4:6 F5:12 | G5:12 G5:6 F5:6 Eb5:12 F5:12 |
  F5:18 D5:6 Bb4:18 F4:6 | A4:12 F4:6 C4:6 D4:24`;

const BB = 'F3+Bb3+D4';
const EB = 'G3+Bb3+Eb4';
const F = 'A3+C4+F4';
const HORNS = `${BB}:24 ${BB}:24 | ${EB}:24 ${BB}:24 | G3+C4+Eb4:48 | A3+C4+Eb4:48 | ${BB}:48 | ${EB}:24 ${F}:24 |
  ${BB}:24 G3+Bb3+D4:24 | ${F}:24 ${BB}:24`;
const LOW_BRASS = `Bb2:12 .:12 F2:12 .:12 | Eb2:12 .:12 Bb2:12 .:12 | C3:12 .:12 G2:12 .:12 | F2:12 .:12 A2:12 .:12 |
  Bb2:12 .:12 D3:12 .:12 | Eb2:12 .:12 F2:12 .:12 | Bb2:12 .:12 G2:12 .:12 | F2:12 .:12 Bb2:12 .:12`;

const KETTLE = 'Bb2!:24 F2:24 | .:48 | .:48 | .:48 | Bb2!:24 F2:24 | .:48 | .:48 | F2:24 .:24';
const KETTLE_ROLL = '.:360 F2:24';
const MARCH = 'X:12 x:6 x:6 X:12 x:3 x:3 x:3 x:3 | ';
const SNARE = MARCH.repeat(7) + 'X:12 x:12 x:3 x:3 x:3 x:3 x:3 x:3 x:3 X:3';
const CRASH = 'X:192 X:192';

export const FANFARE = defineMusic({
  bpm: 120,
  stepsPerBeat: 12,
  loopSteps: 384,
  room: 'hall',
  level: 1,
  tracks: [
    { kind: 'notes', instrument: trumpet, score: TUNE, level: 1, pan: -0.15, reverb: 0.3, articulation: 0.88 },
    { kind: 'notes', instrument: trumpet, score: SECOND, level: 0.7, pan: 0.15, reverb: 0.3, articulation: 0.88 },
    { kind: 'notes', instrument: glockenspiel, score: TUNE, level: 0.5, pan: 0.3, reverb: 0.35, transpose: 12 },
    { kind: 'notes', instrument: horn, score: HORNS, level: 1, pan: 0.2, reverb: 0.35, articulation: 0.92 },
    { kind: 'notes', instrument: tuba, score: LOW_BRASS, level: 0.65, reverb: 0.2, articulation: 0.8 },
    { kind: 'notes', instrument: timpani, score: KETTLE, level: 0.9, reverb: 0.3 },
    { kind: 'notes', instrument: timpaniRoll, score: KETTLE_ROLL, level: 0.8, reverb: 0.3 },
    { kind: 'notes', instrument: snare, score: SNARE, level: 0.4, pan: -0.1, reverb: 0.2 },
    { kind: 'notes', instrument: crash, score: CRASH, level: 0.5, pan: 0.1, reverb: 0.25 },
  ],
});
