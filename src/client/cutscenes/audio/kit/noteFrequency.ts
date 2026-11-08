/** The letters of the octave, at their distance in semitones from C. */
const LETTERS = 'C.D.EF.G.A.B';
const NOTE_PATTERN = /^([A-G])(#|b)?(-?\d)$/;

/**
 * The frequency of a written note (« A4 » is 440 Hz, « C#5 », « Bb2 »), moved by `transpose` semitones.
 * 0 for anything else: a drum hit is written « x » and has no pitch.
 */
export function noteFrequency(note: string, transpose = 0): number {
  const match = NOTE_PATTERN.exec(note);
  if (!match) return 0;
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const midi = (Number(octave) + 1) * 12 + LETTERS.indexOf(letter) + shift + transpose;
  return 440 * 2 ** ((midi - 69) / 12);
}
