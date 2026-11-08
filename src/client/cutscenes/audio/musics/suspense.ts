import { celesta } from '#src/client/cutscenes/audio/instruments/bells.ts';
import { woodblock } from '#src/client/cutscenes/audio/instruments/drums.ts';
import { tremoloStrings } from '#src/client/cutscenes/audio/instruments/strings.ts';
import { heartbeat } from '#src/client/cutscenes/audio/instruments/synths.ts';
import { timpani, timpaniRoll } from '#src/client/cutscenes/audio/instruments/timpani.ts';
import { defineMusic } from '#src/client/cutscenes/audio/score/defineMusic.ts';

/*
 * Suspense, original: 4/4 at 120, eight bars in A minor, two bars a chord: Am, F, Am, B flat (the dark step back
 * down into A). Trembling strings that swell, a heart that beats, a clock that ticks, a lonely ping, and a kettle
 * drum that rolls into the next turn.
 */

const STRINGS = 'A2+A3+C4+E4:32 | F2+A3+C4+E4:32 | A2+A3+C4+E4:32 | Bb2+Bb3+D4+F4:32';

/** Lub-dub, twice a bar for two bars, on the root of the chord. */
function beats(root: string): string {
  return `${root}? ${root} .:6 ${root}? ${root} .:6 | `.repeat(2);
}
const HEART = `${beats('A1')} ${beats('F1')} ${beats('A1')} ${beats('Bb1')}`;
const CLOCK = 'C7:4 G6:4 C7:4 G6:4 | '.repeat(8);
const PINGS = '.:16 E6:16 | .:16 E6:16 | .:16 E6:16 | .:16 F6!:16';
const DRUM = 'A2!:120 .:8';
const ROLL = '.:120 Bb2:8';

export const SUSPENSE = defineMusic({
  bpm: 120,
  stepsPerBeat: 4,
  loopSteps: 128,
  room: 'hall',
  level: 1,
  tracks: [
    { kind: 'notes', instrument: tremoloStrings, score: STRINGS, level: 1, reverb: 0.35, articulation: 0.97 },
    { kind: 'notes', instrument: heartbeat, score: HEART, level: 0.8 },
    { kind: 'notes', instrument: woodblock, score: CLOCK, level: 0.32, pan: 0.3, reverb: 0.15 },
    { kind: 'notes', instrument: celesta, score: PINGS, level: 0.8, pan: -0.35, reverb: 0.6 },
    { kind: 'notes', instrument: timpani, score: DRUM, level: 0.8, reverb: 0.3 },
    { kind: 'notes', instrument: timpaniRoll, score: ROLL, level: 0.8, reverb: 0.3 },
  ],
});
