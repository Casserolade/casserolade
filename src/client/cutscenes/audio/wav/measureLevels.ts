function decibels(value: number): number {
  return value > 0 ? 20 * Math.log10(value) : -Infinity;
}

/** The peak and the RMS of a recording, in dBFS: 0 is full scale. */
export function measureLevels(channels: Float32Array[]): { peak: number; rms: number } {
  let peak = 0;
  let energy = 0;
  let count = 0;
  for (const channel of channels) {
    for (const value of channel) {
      peak = Math.max(peak, Math.abs(value));
      energy += value * value;
    }
    count += channel.length;
  }
  return { peak: decibels(peak), rms: decibels(Math.sqrt(energy / Math.max(1, count))) };
}
