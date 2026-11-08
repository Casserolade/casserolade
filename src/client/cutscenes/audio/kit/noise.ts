import { seededRandom } from '#src/client/cutscenes/audio/kit/seededRandom.ts';

const NOISE_SECONDS = 3;
/** One buffer of white noise per audio context, drawn once and always the same. */
const buffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Three seconds of white noise, the same at every play: a looped music sounds the same at each turn. */
function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const cached = buffers.get(context);
  if (cached) return cached;
  const buffer = context.createBuffer(1, Math.ceil(NOISE_SECONDS * context.sampleRate), context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 0x1f2e3d4c;
  for (let index = 0; index < data.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    data[index] = (state >>> 0) / 2147483648 - 1;
  }
  buffers.set(context, buffer);
  return buffer;
}

/**
 * White noise from `at` for `seconds`, read from a place that `seed` chooses: two hits of the same seed are the
 * same hit. Not connected.
 */
export function noiseSource(context: BaseAudioContext, at: number, seconds: number, seed: number): AudioBufferSourceNode {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  source.loop = true;
  source.start(at, seededRandom(seed, 7) * (NOISE_SECONDS - 0.5));
  source.stop(at + seconds);
  return source;
}

/** A seed for a sound effect: each play draws another noise. */
export function freshSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}
