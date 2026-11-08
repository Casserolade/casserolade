import { piano } from '#src/client/cutscenes/audio/instruments/piano.ts';
import { defineMusic } from '#src/client/cutscenes/audio/score/defineMusic.ts';

/*
 * A ragtime of the silent-film pit, original: 2/4 at 100, sixteen bars in C on an out-of-tune upright. The right
 * hand syncopates (short, long, short) and climbs chromatically into its notes; the left hand strides, a bass
 * octave on each beat and a chord on each off-beat. Eight sixteenths a bar.
 */

const TUNE = `G5 G5:2 E5 F5 F#5 G5:2 | A5 G5:2 E5 C5:2 E5:2 | D5 D5:2 B4 C5 C#5 D5:2 | F5 D5:2 B4 G4:2 .:2 |
  G5 G5:2 E5 F5 F#5 G5:2 | Bb5 G5:2 E5 C5:2 Bb4:2 | A4 C5:2 F5 D5 F5:2 B5 | C6!:2 G5 E5 C5:2 .:2 |
  A5 A5:2 F5 G5 G#5 A5:2 | C6 A5:2 F5 C5:2 F5:2 | G5 G5:2 E5 F5 F#5 G5:2 | A5 G5:2 E5 C#5:2 A4:2 |
  F#5 A5:2 F#5 D5:2 C5:2 | B4 D5:2 F5 A5:2 G5:2 | E5 G5:2 C6 B5 A5 G5 F5 | E5:2 C5:2 D5 E5 F5 F#5`;

/** A bar of stride: bass octave, chord, bass octave, chord. A second chord changes the harmony halfway. */
function stride(bass: string, fifth: string, chord: string, second = chord): string {
  return `${bass}!:2 ${chord}:2 ${fifth}:2 ${second}:2 |`;
}
const C = 'E3+G3+C4';
const G7 = 'D3+F3+B3';
const C7 = 'E3+G3+Bb3';
const F = 'F3+A3+C4';
const LEFT_HAND = [
  stride('C2+C3', 'G1+G2', C), stride('C2+C3', 'G1+G2', C), stride('G1+G2', 'D2+D3', G7), stride('G1+G2', 'D2+D3', G7),
  stride('C2+C3', 'G1+G2', C), stride('C2+C3', 'G1+G2', C7), stride('F1+F2', 'G1+G2', F, G7), stride('C2+C3', 'G1+G2', C),
  stride('F1+F2', 'C2+C3', F), stride('F1+F2', 'A1+A2', F), stride('C2+C3', 'G1+G2', C), stride('A1+A2', 'E2+E3', 'E3+G3+C#4'),
  stride('D2+D3', 'A1+A2', 'D3+F#3+C4'), stride('G1+G2', 'D2+D3', G7), stride('C2+C3', 'G1+G2', C, G7), stride('C2+C3', 'G1+G2', C),
].join(' ');

export const PIANO_MUET = defineMusic({
  bpm: 100,
  stepsPerBeat: 4,
  loopSteps: 128,
  room: 'small',
  level: 1,
  tracks: [
    { kind: 'notes', instrument: piano, score: TUNE, level: 1, pan: 0.15, reverb: 0.15, articulation: 0.85 },
    { kind: 'notes', instrument: piano, score: TUNE, level: 0.45, pan: 0.05, reverb: 0.15, articulation: 0.85, transpose: -12 },
    { kind: 'notes', instrument: piano, score: LEFT_HAND, level: 0.75, pan: -0.15, reverb: 0.15, articulation: 0.7 },
  ],
});
