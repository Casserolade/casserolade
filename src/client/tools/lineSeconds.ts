/** Seconds per character read without a voice, the shortest line, and the shortest real voice on screen. */
const READ_SECONDS_PER_CHAR = 0.07;
const MIN_LINE_SECONDS = 1.6;
const MIN_VOICE_SECONDS = 1;

/** How long a line stays on screen: its real voice, or the time to read it. */
export function lineSeconds(text: string, voiceSeconds?: number): number {
  if (voiceSeconds !== undefined) return Math.max(voiceSeconds, MIN_VOICE_SECONDS);
  return Math.max(MIN_LINE_SECONDS, text.length * READ_SECONDS_PER_CHAR);
}
