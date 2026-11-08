const HEADER_BYTES = 44;
const FLOAT_FORMAT = 3;
const BYTES_PER_SAMPLE = 4;

function writeText(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index++) view.setUint8(offset + index, text.charCodeAt(index));
}

/** A WAV file of these channels, in 32-bit floats: nothing rounded, nothing clipped, a level above 1 stays visible. */
export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const frames = channels[0]?.length ?? 0;
  const blockAlign = channels.length * BYTES_PER_SAMPLE;
  const dataBytes = frames * blockAlign;
  const view = new DataView(new ArrayBuffer(HEADER_BYTES + dataBytes));
  writeText(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, FLOAT_FORMAT, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true);
  writeText(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let frame = 0; frame < frames; frame++) {
    channels.forEach((channel, number) => view.setFloat32(HEADER_BYTES + frame * blockAlign + number * BYTES_PER_SAMPLE, channel[frame], true));
  }
  return view.buffer;
}
