import { churchBell } from '#src/client/cutscenes/audio/instruments/bells.ts';
import { muffledDrum } from '#src/client/cutscenes/audio/instruments/drums.ts';
import { organ } from '#src/client/cutscenes/audio/instruments/synths.ts';
import { defineMusic } from '#src/client/cutscenes/audio/score/defineMusic.ts';

/*
 * The knell: a great bell in D tolls every three seconds in a stone nave, a muffled drum under every other toll,
 * and an organ, barely there, that goes from D minor to B flat to A and back. One step a second, twelve seconds.
 */

const BELL = 'D3!:3 D3:3 D3:3 D3?:3';
const DRUM = 'x:6 x?:6';
const ORGAN = 'D2+A2+D3+F3:6 Bb1+F2+D3+F3:3 A1+E2+C#3+E3:3';

export const GLAS = defineMusic({
  bpm: 60,
  stepsPerBeat: 1,
  loopSteps: 12,
  room: 'church',
  level: 1,
  tracks: [
    { kind: 'notes', instrument: churchBell, score: BELL, level: 1, reverb: 0.5 },
    { kind: 'notes', instrument: muffledDrum, score: DRUM, level: 0.55, reverb: 0.35 },
    { kind: 'notes', instrument: organ, score: ORGAN, level: 0.8, reverb: 0.5, articulation: 1 },
  ],
});
