import { horn, trumpet } from '#src/client/cutscenes/audio/instruments/brass.ts';
import { crash, hat, kick, snare } from '#src/client/cutscenes/audio/instruments/drums.ts';
import { stringPad, stringStab } from '#src/client/cutscenes/audio/instruments/strings.ts';
import { pluck, ticker } from '#src/client/cutscenes/audio/instruments/synths.ts';
import { timpani, timpaniRoll } from '#src/client/cutscenes/audio/instruments/timpani.ts';
import { defineMusic } from '#src/client/cutscenes/audio/score/defineMusic.ts';

/*
 * A breaking-news theme, original: 4/4 at 128, eight bars in D minor. Bars 1-2, the head: orchestral stabs and
 * kettle drums over a wire-service beep. Bars 3-8, the bed: urgent sixteenths, drums, then a brass call. Chords:
 * Dm, Dm, Bb, C, Dm, Bb, Gm, A.
 */

const DM = 'D3+A3+D4+F4+A4';
const BB = 'Bb2+F3+Bb3+D4+F4';
const A = 'A2+E3+A3+C#4+E4';
const STABS = `${DM}!:4 .:2 ${DM}:4 .:2 ${DM}:4 | ${DM}:2 ${DM}:2 ${DM}:4 ${BB}!:8 | .:80 | .:8 ${A}!:8`;
const KETTLE = 'D2!:6 D2:6 D2:4 | D2:2 D2:2 D2:4 Bb1!:8 | Bb1:16 | C2:16 | D2:16 | Bb1:16 | G2:16 | .:16';
const KETTLE_ROLL = '.:112 A2:16';

/** Root, root, octave, root, fifth, root, octave, root: twice a bar. */
function drive(root: string, octave: string, fifth: string): string {
  return `${root}! ${root} ${octave} ${root} ${fifth} ${root} ${octave} ${root} | `.repeat(2);
}
const DRIVE_DM = drive('D3', 'D4', 'A3');
const OSTINATO = DRIVE_DM + DRIVE_DM + drive('Bb2', 'Bb3', 'F3') + drive('C3', 'C4', 'G3') + DRIVE_DM + drive('Bb2', 'Bb3', 'F3') + drive('G2', 'G3', 'D3') + drive('A2', 'A3', 'E3');

const PAD = '.:32 Bb3+D4+F4:16 C4+E4+G4:16 A3+D4+F4:16 Bb3+D4+F4:16 G3+Bb3+D4:16 A3+C#4+E4:16';
const CALL = `.:64 | D5:3 A4:1 D5:2 E5:2 F5!:6 E5:2 | D5:3 Bb4:1 D5:2 F5:2 Bb5!:6 A5:2 |
  G5:3 F5:1 E5:2 D5:2 E5:4 F5:4 | E5:6 C#5:2 E5:4 A5!:4`;
const WIRE = 'A6 . A6 . A6 A6 . . A6 . A6 . A6 A6 . . | '.repeat(2) + '.:96';

const KICK = 'x:6 x:6 x:4 | x:2 x:2 x:4 x:8 | ' + 'x:6 x:2 x:6 x:2 | '.repeat(6);
const SNARE = '.:32 ' + '.:4 x:8 x:4 | '.repeat(5) + '.:4 x:8 x x x X';
const HATS = '.:32 ' + 'x:2 x?:2 x:2 x?:2 x:2 x?:2 x:2 x?:2 | '.repeat(6);
const CRASH = 'X:64 X:64';

export const JINGLE_INFO = defineMusic({
  bpm: 128,
  stepsPerBeat: 4,
  loopSteps: 128,
  room: 'hall',
  level: 1,
  tracks: [
    { kind: 'notes', instrument: trumpet, score: STABS, level: 0.5, reverb: 0.25, articulation: 0.55 },
    { kind: 'notes', instrument: stringStab, score: STABS, level: 0.6, pan: 0.2, reverb: 0.3, articulation: 0.5 },
    { kind: 'notes', instrument: timpani, score: KETTLE, level: 0.9, reverb: 0.25 },
    { kind: 'notes', instrument: timpaniRoll, score: KETTLE_ROLL, level: 0.8, reverb: 0.25 },
    { kind: 'notes', instrument: pluck, score: OSTINATO, level: 0.5, pan: -0.15, reverb: 0.12, articulation: 0.5 },
    { kind: 'notes', instrument: stringPad, score: PAD, level: 0.8, pan: 0.15, reverb: 0.35 },
    { kind: 'notes', instrument: horn, score: CALL, level: 1.1, pan: -0.1, reverb: 0.3, articulation: 0.9 },
    { kind: 'notes', instrument: trumpet, score: CALL, level: 0.45, pan: 0.1, reverb: 0.3, articulation: 0.85 },
    { kind: 'notes', instrument: ticker, score: WIRE, level: 0.8, pan: 0.45, reverb: 0.1 },
    { kind: 'notes', instrument: kick, score: KICK, level: 0.7 },
    { kind: 'notes', instrument: snare, score: SNARE, level: 0.45, reverb: 0.15 },
    { kind: 'notes', instrument: hat, score: HATS, level: 0.45, pan: 0.3 },
    { kind: 'notes', instrument: crash, score: CRASH, level: 0.55, pan: -0.2, reverb: 0.2 },
  ],
});
