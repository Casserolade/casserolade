/**
 * The time of a filmed-live cutscene, read from its sound: the picture follows the audio, never the other way round.
 * Audio clocks tick coarsely on some browsers, so between two ticks the time runs on from the last one (at most 0.3 s).
 * Without sound (refused by the browser, or failed), the clock runs from the page's own time.
 */
export class AudioClock {
  private anchorAudio = -1;
  private anchorNow = 0;
  private silentStart: number | null = null;
  private readonly audio: HTMLAudioElement;

  constructor(audio: HTMLAudioElement) {
    this.audio = audio;
  }

  /** The browser would not play the sound: the film goes on in silence, from now. */
  runSilently(now: number): void {
    this.silentStart = now - this.audio.currentTime * 1000;
  }

  timeAt(now: number): number {
    if (this.silentStart !== null) return (now - this.silentStart) / 1000;
    const audioTime = this.audio.currentTime;
    if (this.audio.paused || this.audio.seeking) {
      this.anchorAudio = -1;
      return audioTime;
    }
    if (audioTime !== this.anchorAudio) {
      this.anchorAudio = audioTime;
      this.anchorNow = now;
      return audioTime;
    }
    return audioTime + Math.min(0.3, (now - this.anchorNow) / 1000);
  }
}
