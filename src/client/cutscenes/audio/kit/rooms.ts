import { ROOMS } from '#src/client/cutscenes/audio/const/rooms.ts';
import type { RoomName } from '#src/client/cutscenes/audio/const/rooms.ts';

/** The impulses already drawn, per audio context: drawing one takes a few milliseconds. */
const impulses = new WeakMap<BaseAudioContext, Map<RoomName, AudioBuffer>>();
const FADE_IN_SECONDS = 0.004;

/**
 * The impulse response of a room, in stereo: noise that dies away exponentially and grows darker as it dies. Always
 * the same, so that a looped music joins without a seam.
 */
function roomImpulse(context: BaseAudioContext, name: RoomName): AudioBuffer {
  const known = impulses.get(context) ?? new Map<RoomName, AudioBuffer>();
  impulses.set(context, known);
  const cached = known.get(name);
  if (cached) return cached;
  const { seconds, damping, predelay } = ROOMS[name];
  const rate = context.sampleRate;
  const silence = Math.floor(predelay * rate);
  const buffer = context.createBuffer(2, silence + Math.ceil(seconds * rate), rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let state = 0x2468ace1 + channel * 7919;
    let dark = 0;
    for (let index = silence; index < data.length; index++) {
      const time = (index - silence) / rate;
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      const white = (state >>> 0) / 2147483648 - 1;
      const openness = 1 - damping * Math.min(1, time / seconds) ** 0.6;
      dark += (white - dark) * openness;
      data[index] = dark * Math.exp((-6.9 * time) / seconds) * Math.min(1, time / FADE_IN_SECONDS);
    }
  }
  known.set(name, buffer);
  return buffer;
}

/** A reverberation for this room, not connected. */
export function createReverb(context: BaseAudioContext, name: RoomName): ConvolverNode {
  const reverb = context.createConvolver();
  reverb.buffer = roomImpulse(context, name);
  return reverb;
}

/**
 * An echo that repeats every `seconds`, each repeat `feedback` as loud and a little darker, into `out`. Returns its
 * input.
 */
export function createEcho(context: BaseAudioContext, out: AudioNode, seconds: number, feedback: number): AudioNode {
  const delay = context.createDelay(Math.max(1, seconds * 2));
  delay.delayTime.value = seconds;
  const darker = context.createBiquadFilter();
  darker.type = 'lowpass';
  darker.frequency.value = 3200;
  const loop = context.createGain();
  loop.gain.value = feedback;
  delay.connect(darker);
  darker.connect(loop);
  loop.connect(delay);
  darker.connect(out);
  return delay;
}
