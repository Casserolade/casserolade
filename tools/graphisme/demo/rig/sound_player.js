/**
 * Plays short clips and exposes the current loudness so the jaw can follow the real voice.
 * The audio context must be created after a user click, because of browser autoplay rules.
 */
export class SoundPlayer {
  constructor() {
    this.context = null;
    this.analyser = null;
    this.buffers = new Map();
    this.samples = null;
  }

  ensureStarted() {
    if (this.context) return;
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.samples = new Float32Array(this.analyser.fftSize);
    this.analyser.connect(this.context.destination);
  }

  async load(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    const response = await fetch(url);
    const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    this.buffers.set(url, buffer);
    return buffer;
  }

  /** Resolves when the clip ends. Falls back to silence if the clip cannot be played. */
  async play(url) {
    try {
      this.ensureStarted();
      await this.context.resume();
      const buffer = await this.load(url);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.analyser);
      await new Promise((resolve) => { source.onended = resolve; source.start(); });
    } catch (error) {
      console.error('Sound failed', url, error);
    }
  }

  /** Root mean square of what is playing right now, from 0 to about 1. */
  readLevel() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    const sum = this.samples.reduce((total, sample) => total + sample * sample, 0);
    return Math.sqrt(sum / this.samples.length);
  }
}
