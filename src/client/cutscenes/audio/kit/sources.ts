/** An oscillator that sounds from `at` to `end`, not connected. */
export function oscillator(context: BaseAudioContext, type: OscillatorType, frequency: number, at: number, end: number): OscillatorNode {
  const node = context.createOscillator();
  node.type = type;
  node.frequency.setValueAtTime(frequency, at);
  node.start(at);
  node.stop(end);
  return node;
}

/** A filter set from `at`, not connected. For a peaking filter, `gain` is its boost in decibels. */
export function biquad(context: BaseAudioContext, type: BiquadFilterType, frequency: number, q: number, at: number, gain = 0): BiquadFilterNode {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.setValueAtTime(frequency, at);
  node.Q.setValueAtTime(q, at);
  if (gain) node.gain.setValueAtTime(gain, at);
  return node;
}

/** A fixed gain, connected to `out`: a node, or a parameter it modulates (a vibrato's depth, a tremolo's). */
export function level(context: BaseAudioContext, out: AudioNode | AudioParam, value: number): GainNode {
  const node = context.createGain();
  node.gain.value = value;
  if (out instanceof AudioParam) node.connect(out);
  else node.connect(out);
  return node;
}

/**
 * A vibrato on the `detune` of these oscillators: `cents` deep at `rate` per second, coming in gently from `from`
 * over `swell` seconds, until `end`.
 */
export function vibrato(context: BaseAudioContext, targets: AudioParam[], from: number, end: number, rate: number, cents: number, swell = 0.3): void {
  const wobble = oscillator(context, 'sine', rate, from, end);
  const depth = context.createGain();
  depth.gain.setValueAtTime(0, from);
  depth.gain.linearRampToValueAtTime(cents, from + swell);
  wobble.connect(depth);
  targets.forEach((target) => depth.connect(target));
}
