import { tuba } from '#src/client/cutscenes/audio/instruments/brass.ts';
import { shaker, snare, woodblock } from '#src/client/cutscenes/audio/instruments/drums.ts';
import { piano } from '#src/client/cutscenes/audio/instruments/piano.ts';
import { sax } from '#src/client/cutscenes/audio/instruments/sax.ts';
import { defineMusic } from '#src/client/cutscenes/audio/score/defineMusic.ts';

/*
 * A chase in fast-forward, original: 2/4 at 180, a galop in C. A (8 bars), A' (8 bars), B (8 bars), then again.
 * A nasal sax in staccato, a tuba that hops from root to fifth, the piano's « pah » and the snare on the off-beats.
 * Eight sixteenths per bar.
 */

const A_HEAD = `E5:2 C5:2 G4:2 C5:2 | D#5 E5 G5:2 E5:2 C5:2 | D5:2 B4:2 G4:2 B4:2 | D5 C#5 D5 F5 E5:2 D5:2 |
  C5:2 E5:2 G5:2 C6!:2 | B5 A5 G5 F5 E5 D5 C5 B4 |`;
const A_END = 'A4:2 C5:2 B4:2 D5:2 | C5!:2 G4:2 C5:2 .:2 |';
const A2_END = 'A5:2 F5:2 D5:2 B4:2 | C5 D5 E5 G5 C6!:2 .:2 |';
const B = `A5!:2 A5 A5 G5:2 F5:2 | C5 D5 F5 A5 C6!:2 .:2 | G5!:2 G5 G5 F5:2 E5:2 | C5 D5 E5 G5 C6!:2 .:2 |
  F#5!:2 F#5 F#5 E5:2 D5:2 | A4 C5 D5 F#5 A5!:2 .:2 | B5 A5 G5 F#5 G5 A5 B5 C6 | D6!:2 B5 G5 F5 D5 B4 G4 |`;

const BASS_HEAD = 'C3:2 .:2 G2:2 .:2 | C3:2 .:2 E3:2 .:2 | G2:2 .:2 D3:2 .:2 | G2:2 .:2 B2:2 .:2 | C3:2 .:2 G2:2 .:2 | G2:2 .:2 F2:2 .:2 |';
const BASS_A_END = 'F2:2 .:2 G2:2 .:2 | C3:2 .:2 G2:2 B2:2 |';
const BASS_A2_END = 'F2:2 .:2 G2:2 .:2 | C3:2 .:2 A2:2 G2:2 |';
const BASS_B = `F2:2 .:2 C3:2 .:2 | F2:2 .:2 A2:2 .:2 | C3:2 .:2 G2:2 .:2 | C3:2 .:2 E3:2 .:2 |
  D3:2 .:2 A2:2 .:2 | D3:2 .:2 F#2:2 .:2 | G2:2 .:2 D3:2 .:2 | G2:2 .:2 A2:2 B2:2 |`;

/** The « pah » of each bar: the chord on both off-beats. */
function pah(first: string, second = first): string {
  return `.:2 ${first}:2 .:2 ${second}:2 |`;
}
const C = 'G3+C4+E4';
const G = 'G3+B3+D4';
const G7 = 'F3+B3+D4';
const F = 'F3+A3+C4';
const D7 = 'F#3+A3+C4';
const CHORDS_A = [C, C, G, G7, C, G7].map((chord) => pah(chord)).join(' ') + pah(F, G) + pah(C);
const CHORDS_B = [F, F, C, C, D7, D7, G, G7].map((chord) => pah(chord)).join(' ');

const OFF_BEATS = '.:2 x:4 x:2 | ';
const SNARE = `${OFF_BEATS.repeat(7)} .:2 x:2 x x x x | ${OFF_BEATS.repeat(7)} x:2 x:2 x x X X | ${OFF_BEATS.repeat(7)} x? x? x x x x X X`;
const SHAKER = 'x x? x x? x x? x x? | '.repeat(24);
/** Tok-tok in the breaks of B. */
const BLOCKS = `.:128 | .:8 | .:6 A5 E5 | .:8 | .:6 A5 E5 | .:8 | .:6 A5 E5 | .:16`;

export const POURSUITE = defineMusic({
  bpm: 180,
  stepsPerBeat: 4,
  loopSteps: 192,
  room: 'small',
  level: 1,
  tracks: [
    { kind: 'notes', instrument: sax, score: `${A_HEAD} ${A_END} ${A_HEAD} ${A2_END} ${B}`, level: 1, pan: -0.1, reverb: 0.18, articulation: 0.62 },
    { kind: 'notes', instrument: tuba, score: `${BASS_HEAD} ${BASS_A_END} ${BASS_HEAD} ${BASS_A2_END} ${BASS_B}`, level: 0.75, articulation: 0.7 },
    { kind: 'notes', instrument: piano, score: `${CHORDS_A} ${CHORDS_A} ${CHORDS_B}`, level: 0.6, pan: 0.25, reverb: 0.12, articulation: 0.55 },
    { kind: 'notes', instrument: snare, score: SNARE, level: 0.5, pan: 0.1, reverb: 0.1 },
    { kind: 'notes', instrument: shaker, score: SHAKER, level: 0.5, pan: 0.35 },
    { kind: 'notes', instrument: woodblock, score: BLOCKS, level: 0.7, pan: -0.3, reverb: 0.15 },
  ],
});
