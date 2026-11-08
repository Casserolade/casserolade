import { createEcho, createReverb } from '#src/client/cutscenes/audio/kit/rooms.ts';
import { level } from '#src/client/cutscenes/audio/kit/sources.ts';
import type { Music, Track } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/** How loud the musics play: well under the real voices, which play at 0.45. */
const MUSIC_GAIN = 0.16;

/** The mixing desk of one music: a strip per track, the room, the echo, and the music's own volume. */
export interface MusicGraph {
  /** The music's volume: faded out to stop it. */
  output: GainNode;
  /** The input of each track, in the order of the tracks. */
  inputs: AudioNode[];
}

/** A track's strip: its level and its place, then sends to the room and the echo. Returns its input. */
function trackStrip(context: BaseAudioContext, track: Track, output: AudioNode, reverb: AudioNode, echo: AudioNode | null): AudioNode {
  const input = context.createGain();
  input.gain.value = track.level;
  const place = context.createStereoPanner();
  place.pan.value = track.pan ?? 0;
  input.connect(place);
  place.connect(output);
  if (track.reverb) place.connect(level(context, reverb, track.reverb));
  if (track.echo && echo) place.connect(level(context, echo, track.echo));
  return input;
}

/** Builds the desk of this music into `destination`. Nothing plays yet. */
export function createMusicGraph(context: BaseAudioContext, destination: AudioNode, music: Music): MusicGraph {
  const output = level(context, destination, MUSIC_GAIN * music.level);
  const reverb = createReverb(context, music.room);
  reverb.connect(output);
  const echo = music.echo ? createEcho(context, output, music.echo.steps * music.stepSeconds, music.echo.feedback) : null;
  return { output, inputs: music.tracks.map((track) => trackStrip(context, track, output, reverb, echo)) };
}
