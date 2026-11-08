/** A recorded sound of the game (the manifest's `sons.bruitages`), and the gain it is laid over at. */
export interface RecordedLayer {
  name: string;
  gain: number;
}

/** A sound effect of the cutscenes: a recipe made in code, and sometimes a recorded sound on top. */
export interface SoundEffect {
  /** How long it rings, in seconds. */
  seconds: number;
  recorded?: RecordedLayer;
  /** Plays the made part from `at`, into `out`. */
  play(context: BaseAudioContext, out: AudioNode, at: number): void;
}
