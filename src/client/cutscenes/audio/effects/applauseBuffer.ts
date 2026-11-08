const APPLAUSE_SECONDS = 3.4;
const CLAPPERS = 34;
/** The loudest the applause gets, once drawn. */
const APPLAUSE_PEAK = 0.34;
/** A clap: its hands ring like a small cavity, for a few milliseconds. */
const CLAP_SECONDS = 0.06;
const CLAP_DECAY_SECONDS = 0.011;
/** The buffers drawn, per audio context. */
const buffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** A small xorshift: the applause is drawn the same each time, and cheaply. */
function createRandom(seed: number): () => number {
  let state = seed;
  return function random(): number {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** How full the room claps at `time`: it bursts out, holds, and thins away. */
function crowdSwell(time: number): number {
  return Math.min(1, time / 0.25) * Math.min(1, Math.max(0, (APPLAUSE_SECONDS - 0.2 - time) / 1.3));
}

/** One clap, added into the two channels: noise through a band-pass, struck and dying fast. */
function addClap(channels: Float32Array[], rate: number, start: number, center: number, gains: number[], random: () => number): void {
  const omega = (2 * Math.PI * center) / rate;
  const alpha = Math.sin(omega) / (2 * 1.6);
  const norm = 1 + alpha;
  const [b0, b2, a1, a2] = [alpha / norm, -alpha / norm, (-2 * Math.cos(omega)) / norm, (1 - alpha) / norm];
  let [x1, x2, y1, y2] = [0, 0, 0, 0];
  const length = Math.min(Math.floor(CLAP_SECONDS * rate), channels[0].length - start);
  for (let index = 0; index < length; index++) {
    const x = random() * 2 - 1;
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    [x2, x1, y2, y1] = [x1, x, y1, y];
    const shape = Math.min(1, index / (0.0008 * rate)) * Math.exp(-index / (CLAP_DECAY_SECONDS * rate));
    channels.forEach((channel, side) => (channel[start + index] += y * shape * gains[side]));
  }
}

/** Scales the buffer so that its loudest sample is `peak`. */
function normalize(channels: Float32Array[], peak: number): void {
  const loudest = Math.max(...channels.map((channel) => channel.reduce((most, value) => Math.max(most, Math.abs(value)), 0)));
  if (loudest > 0) channels.forEach((channel) => channel.forEach((value, index) => (channel[index] = (value * peak) / loudest)));
}

/**
 * A room that applauds, drawn sample by sample: thirty-odd pairs of hands, each at its own pace, place and pitch.
 * Drawn once per audio context, in a few milliseconds.
 */
export function applauseBuffer(context: BaseAudioContext): AudioBuffer {
  const cached = buffers.get(context);
  if (cached) return cached;
  const rate = context.sampleRate;
  const buffer = context.createBuffer(2, Math.ceil(APPLAUSE_SECONDS * rate), rate);
  const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  const random = createRandom(0x5eed1234);
  for (let clapper = 0; clapper < CLAPPERS; clapper++) {
    const pace = 3.3 + random() * 2.5;
    const angle = random() * (Math.PI / 2);
    const gains = [Math.cos(angle), Math.sin(angle)].map((side) => side * (0.45 + random() * 0.55));
    const center = 650 + random() * 2100;
    for (let time = random() * 0.3; time < APPLAUSE_SECONDS - CLAP_SECONDS; time += (0.85 + random() * 0.3) / pace) {
      const swell = crowdSwell(time + random() * 0.4);
      if (swell > 0.02) addClap(channels, rate, Math.floor(time * rate), center * (0.9 + random() * 0.2), gains.map((gain) => gain * swell), random);
    }
  }
  normalize(channels, APPLAUSE_PEAK);
  buffers.set(context, buffer);
  return buffer;
}
