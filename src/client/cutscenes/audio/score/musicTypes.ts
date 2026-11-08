import type { RoomName } from '#src/client/cutscenes/audio/const/rooms.ts';

/** One note to play: its pitch, how long it is held, how hard, and where it sits in the music. */
export interface Note {
  /** Hertz; 0 for a drum hit. */
  frequency: number;
  seconds: number;
  /** 1 is a normal note; louder above, softer below. */
  velocity: number;
  /** Its place in its track, the same at each turn of the loop. */
  index: number;
  /** Which turn of the loop plays it, from 0. */
  iteration: number;
}

/** A note of a phrase, `offset` seconds after the phrase begins. */
export interface PhraseNote extends Note {
  offset: number;
}

/** Plays one note from `at` into `out`. Never kept: each call makes its own nodes, which stop by themselves. */
export type Instrument = (context: BaseAudioContext, out: AudioNode, at: number, note: Note) => void;

/** Plays a whole phrase of tied notes from `at`, as one gesture: a theremin glides from note to note. */
export type PhraseInstrument = (context: BaseAudioContext, out: AudioNode, at: number, notes: PhraseNote[]) => void;

/** A written event of a track: from `step`, `steps` long, one or several pitches (a chord). */
export interface ScoreEvent {
  step: number;
  steps: number;
  pitches: string[];
  velocity: number;
  index: number;
}

/** How a track sits in the mix. */
interface TrackMix {
  /** The written notes, see `parseTrack`. */
  score: string;
  level: number;
  /** -1 left … 1 right. */
  pan?: number;
  /** How much of it goes to the room's reverberation, and to the echo. */
  reverb?: number;
  echo?: number;
  /** The share of each written length that sounds: under 1, staccato. */
  articulation?: number;
  transpose?: number;
}

/** A track plays its notes one by one, or its phrases as wholes. */
export type TrackScore = TrackMix & ({ kind: 'notes'; instrument: Instrument } | { kind: 'phrases'; instrument: PhraseInstrument });

/** A loop of music, as written: its tempo, its length, its room and its tracks. */
export interface MusicScore {
  bpm: number;
  /** 4: the grid is the sixteenth note. 12 also allows triplets. */
  stepsPerBeat: number;
  loopSteps: number;
  room: RoomName;
  /** The echo, for the tracks that send to it: its delay in steps, and how much of each repeat comes back. */
  echo?: { steps: number; feedback: number };
  /** Evens out the loudness of the musics. */
  level: number;
  tracks: TrackScore[];
}

/** A track ready to play: its events found by the step they start on. */
export type Track = TrackScore & { byStep: Map<number, ScoreEvent[]> };

/** A music ready to play. */
export type Music = Omit<MusicScore, 'tracks'> & { stepSeconds: number; tracks: Track[] };
