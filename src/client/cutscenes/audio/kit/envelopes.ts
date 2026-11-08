/** Quiet enough to be silence, and above zero: an exponential ramp cannot reach zero. */
export const SILENT = 0.0001;

/** How a held note speaks: it rises, settles, holds, and lets go. Times in seconds, `sustain` a share of the peak. */
export interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** A gain that rises in `attack` and dies away exponentially, silent at `at + seconds`: a pluck, a hit, a puff. */
export function pluckGain(context: BaseAudioContext, out: AudioNode, at: number, peak: number, attack: number, seconds: number): GainNode {
  const node = context.createGain();
  node.gain.setValueAtTime(SILENT, at);
  node.gain.linearRampToValueAtTime(Math.max(peak, SILENT * 2), at + attack);
  node.gain.exponentialRampToValueAtTime(SILENT, at + Math.max(seconds, attack + 0.01));
  node.connect(out);
  return node;
}

/**
 * The gain of a held note: it settles at `peak × sustain`, holds until `at + hold`, then lets go. `end` is when it
 * has fallen silent: the sources that feed it stop there.
 */
export function heldGain(context: BaseAudioContext, out: AudioNode, at: number, peak: number, hold: number, envelope: Envelope): { gain: GainNode; end: number } {
  const { attack, decay, sustain, release } = envelope;
  const held = Math.max(hold, attack + 0.005);
  const node = context.createGain();
  node.gain.setValueAtTime(0, at);
  node.gain.linearRampToValueAtTime(peak, at + attack);
  node.gain.setTargetAtTime(peak * sustain, at + attack, Math.max(decay, 0.003) / 3);
  node.gain.setTargetAtTime(0, at + held, Math.max(release, 0.005) / 5);
  node.connect(out);
  return { gain: node, end: at + held + release * 1.6 };
}
