/**
 * The little sounds of the table, made in code with the Web Audio API: no file, no voice.
 * Soft and cartoonish, short, and quiet next to the real voices. Each recipe plays from `at`, in context seconds.
 */

export type SynthName =
  | 'buy'
  | 'play'
  | 'sell'
  | 'roll'
  | 'freeze'
  | 'thaw'
  | 'upgrade'
  | 'clang'
  | 'scandal'
  | 'forget'
  | 'spell'
  | 'triple'
  | 'discover'
  | 'lunge'
  | 'hit'
  | 'fall'
  | 'bonk'
  | 'celebrate'
  | 'tick';

export interface SynthOptions {
  /** Multiplies every frequency: the slight variation of each play. */
  pitch: number;
  /** Multiplies the loudness. */
  gain: number;
}

interface ToneOptions {
  type?: OscillatorType;
  from: number;
  to?: number;
  start?: number;
  duration: number;
  gain: number;
  attack?: number;
}

interface NoiseOptions {
  start?: number;
  duration: number;
  gain: number;
  attack?: number;
  filter: BiquadFilterType;
  from: number;
  to?: number;
  q?: number;
}

const SILENT = 0.0001;
let noiseBuffer: AudioBuffer | null = null;

function whiteNoise(context: BaseAudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/** A gain that rises in `attack` and dies away exponentially: every sound here is a pluck or a puff. */
function envelope(context: BaseAudioContext, out: AudioNode, at: number, { gain, attack = 0.004, duration }: { gain: number; attack?: number; duration: number }): GainNode {
  const node = context.createGain();
  node.gain.setValueAtTime(SILENT, at);
  node.gain.linearRampToValueAtTime(gain, at + attack);
  node.gain.exponentialRampToValueAtTime(SILENT, at + Math.max(duration, attack + 0.01));
  node.connect(out);
  return node;
}

function tone(context: BaseAudioContext, out: AudioNode, at: number, options: SynthOptions, { type = 'sine', from, to, start = 0, duration, gain, attack }: ToneOptions): OscillatorNode {
  const begin = at + start;
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from * options.pitch, begin);
  if (to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(to * options.pitch, begin + duration);
  oscillator.connect(envelope(context, out, begin, { gain: gain * options.gain, attack, duration }));
  oscillator.start(begin);
  oscillator.stop(begin + duration + 0.02);
  return oscillator;
}

function noise(context: BaseAudioContext, out: AudioNode, at: number, options: SynthOptions, { start = 0, duration, gain, attack, filter, from, to, q = 0.8 }: NoiseOptions): void {
  const begin = at + start;
  const source = context.createBufferSource();
  source.buffer = whiteNoise(context);
  const shape = context.createBiquadFilter();
  shape.type = filter;
  shape.Q.value = q;
  shape.frequency.setValueAtTime(from * options.pitch, begin);
  if (to !== undefined) shape.frequency.exponentialRampToValueAtTime(to * options.pitch, begin + duration);
  source.connect(shape);
  shape.connect(envelope(context, out, begin, { gain: gain * options.gain, attack, duration }));
  source.start(begin, Math.random() * 0.5);
  source.stop(begin + duration + 0.02);
}

type Recipe = (context: BaseAudioContext, out: AudioNode, at: number, options: SynthOptions) => void;

/** Each sound, and how long it rings, in seconds. */
export const SYNTH_SOUNDS: Record<SynthName, { seconds: number; play: Recipe }> = {
  // A bubble rising: the recruit jumps into the hand.
  buy: {
    seconds: 0.2,
    play: (c, o, t, v) => {
      tone(c, o, t, v, { from: 320, to: 680, duration: 0.09, gain: 0.32 });
      tone(c, o, t, v, { type: 'triangle', from: 680, to: 1020, start: 0.05, duration: 0.12, gain: 0.16 });
    },
  },
  // A soft cardboard thump on the carpet.
  play: {
    seconds: 0.22,
    play: (c, o, t, v) => {
      tone(c, o, t, v, { from: 170, to: 52, duration: 0.18, gain: 0.55 });
      noise(c, o, t, v, { filter: 'lowpass', from: 900, to: 200, duration: 0.07, gain: 0.3 });
      tone(c, o, t, v, { type: 'triangle', from: 440, to: 300, duration: 0.05, gain: 0.12 });
    },
  },
  // Two notes of a coin.
  sell: {
    seconds: 0.32,
    play: (c, o, t, v) => {
      tone(c, o, t, v, { type: 'triangle', from: 988, duration: 0.07, gain: 0.2 });
      tone(c, o, t, v, { type: 'triangle', from: 1319, start: 0.06, duration: 0.26, gain: 0.2 });
      tone(c, o, t, v, { from: 2637, start: 0.06, duration: 0.12, gain: 0.04 });
    },
  },
  // Cards riffled: four quick brushes and a breath of air.
  roll: {
    seconds: 0.3,
    play: (c, o, t, v) => {
      for (let index = 0; index < 4; index++) noise(c, o, t, v, { filter: 'bandpass', from: 2600, to: 1500, start: index * 0.045, duration: 0.05, gain: 0.22, q: 1.4 });
      noise(c, o, t, v, { filter: 'bandpass', from: 400, to: 1800, duration: 0.24, gain: 0.08, attack: 0.08 });
    },
  },
  // Ice crystals: a high crackle and three glassy notes.
  freeze: {
    seconds: 0.45,
    play: (c, o, t, v) => {
      noise(c, o, t, v, { filter: 'highpass', from: 5000, duration: 0.22, gain: 0.08, attack: 0.02 });
      [1568, 2093, 2637].forEach((from, index) => tone(c, o, t, v, { type: 'triangle', from, start: index * 0.035, duration: 0.35, gain: 0.07 }));
    },
  },
  // A drop of water.
  thaw: {
    seconds: 0.12,
    play: (c, o, t, v) => tone(c, o, t, v, { from: 1100, to: 480, duration: 0.09, gain: 0.14 }),
  },
  // Four notes climbing.
  upgrade: {
    seconds: 0.5,
    play: (c, o, t, v) => {
      [523, 659, 784, 1047].forEach((from, index) => tone(c, o, t, v, { type: 'triangle', from, start: index * 0.06, duration: index === 3 ? 0.32 : 0.12, gain: 0.17 }));
      tone(c, o, t, v, { from: 2093, start: 0.18, duration: 0.25, gain: 0.04 });
    },
  },
  // A pan on a head: a metallic ring with inharmonic partials.
  clang: {
    seconds: 0.55,
    play: (c, o, t, v) => {
      noise(c, o, t, v, { filter: 'highpass', from: 3000, duration: 0.025, gain: 0.18 });
      [[1, 0.2, 0.5], [2.76, 0.12, 0.34], [5.4, 0.07, 0.2], [8.93, 0.04, 0.12]].forEach(([ratio, gain, duration]) =>
        tone(c, o, t, v, { from: 540 * ratio, duration, gain }));
    },
  },
  // A puff of smoke.
  scandal: {
    seconds: 0.4,
    play: (c, o, t, v) => {
      noise(c, o, t, v, { filter: 'lowpass', from: 1400, to: 260, duration: 0.36, gain: 0.32, attack: 0.03 });
      tone(c, o, t, v, { from: 96, to: 60, duration: 0.2, gain: 0.18 });
    },
  },
  // Sparkles: the pans turn into medals.
  forget: {
    seconds: 0.45,
    play: (c, o, t, v) => {
      [2093, 2794, 2349, 3136, 2637, 3520].forEach((from, index) => tone(c, o, t, v, { from, start: index * 0.04, duration: 0.09, gain: 0.07 }));
      tone(c, o, t, v, { type: 'triangle', from: 1047, duration: 0.4, gain: 0.06, attack: 0.05 });
    },
  },
  // A small magic whoosh.
  spell: {
    seconds: 0.3,
    play: (c, o, t, v) => {
      tone(c, o, t, v, { from: 380, to: 1500, duration: 0.18, gain: 0.12, attack: 0.03 });
      noise(c, o, t, v, { filter: 'bandpass', from: 700, to: 3200, duration: 0.22, gain: 0.07, attack: 0.05, q: 1.2 });
      tone(c, o, t, v, { from: 2349, start: 0.16, duration: 0.12, gain: 0.05 });
    },
  },
  // A short fanfare: the chord, then the octave.
  triple: {
    seconds: 0.6,
    play: (c, o, t, v) => {
      [523, 659, 784].forEach((from) => tone(c, o, t, v, { type: 'triangle', from, duration: 0.22, gain: 0.11 }));
      [659, 784, 1047].forEach((from) => tone(c, o, t, v, { type: 'triangle', from, start: 0.14, duration: 0.42, gain: 0.11 }));
    },
  },
  // Cards turned over.
  discover: {
    seconds: 0.35,
    play: (c, o, t, v) => {
      tone(c, o, t, v, { from: 784, duration: 0.1, gain: 0.12 });
      tone(c, o, t, v, { from: 1175, start: 0.09, duration: 0.24, gain: 0.12 });
    },
  },
  // The air moves as a medallion dashes.
  lunge: {
    seconds: 0.16,
    play: (c, o, t, v) => noise(c, o, t, v, { filter: 'bandpass', from: 500, to: 1600, duration: 0.14, gain: 0.24, attack: 0.04, q: 1.2 }),
  },
  // A soft, padded punch.
  hit: {
    seconds: 0.16,
    play: (c, o, t, v) => {
      tone(c, o, t, v, { from: 150, to: 48, duration: 0.13, gain: 0.42 });
      noise(c, o, t, v, { filter: 'lowpass', from: 1600, to: 300, duration: 0.07, gain: 0.26 });
    },
  },
  // The slide whistle of something heavy falling.
  fall: {
    seconds: 0.45,
    play: (c, o, t, v) => tone(c, o, t, v, { from: 1500, to: 380, duration: 0.42, gain: 0.13, attack: 0.03 }),
  },
  // The heavy thing lands: a bonk, and a spring wobbling.
  bonk: {
    seconds: 0.5,
    play: (c, o, t, v) => {
      tone(c, o, t, v, { from: 210, to: 62, duration: 0.24, gain: 0.5 });
      noise(c, o, t, v, { filter: 'lowpass', from: 1200, to: 200, duration: 0.1, gain: 0.3 });
      const spring = tone(c, o, t, v, { type: 'triangle', from: 190, start: 0.04, duration: 0.42, gain: 0.14 });
      const wobble = c.createOscillator();
      const depth = c.createGain();
      wobble.frequency.value = 17;
      depth.gain.setValueAtTime(70 * v.pitch, t);
      depth.gain.exponentialRampToValueAtTime(5, t + 0.45);
      wobble.connect(depth);
      depth.connect(spring.frequency);
      wobble.start(t);
      wobble.stop(t + 0.48);
    },
  },
  // Ta-da, with a pop of confetti.
  celebrate: {
    seconds: 0.5,
    play: (c, o, t, v) => {
      noise(c, o, t, v, { filter: 'highpass', from: 2500, duration: 0.04, gain: 0.12 });
      [784, 988, 1175, 1568].forEach((from, index) => tone(c, o, t, v, { type: 'triangle', from, start: 0.03 + index * 0.05, duration: index === 3 ? 0.35 : 0.1, gain: 0.1 }));
    },
  },
  // The volume being set.
  tick: {
    seconds: 0.08,
    play: (c, o, t, v) => tone(c, o, t, v, { type: 'triangle', from: 880, duration: 0.06, gain: 0.2 }),
  },
};
