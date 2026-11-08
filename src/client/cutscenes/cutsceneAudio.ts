import type { Bruitage, Musique } from '#src/data/histoire/cinematique.ts';
import { soundOutput } from '#src/client/services/soundEffects.ts';
import { loadRecordedSound } from '#src/client/cutscenes/audio/effects/loadRecordedSound.ts';
import { SOUND_EFFECT_LIBRARY } from '#src/client/cutscenes/audio/effects/soundEffectLibrary.ts';
import type { RecordedLayer } from '#src/client/cutscenes/audio/effects/soundEffectTypes.ts';
import { level } from '#src/client/cutscenes/audio/kit/sources.ts';
import { MUSIC_LIBRARY } from '#src/client/cutscenes/audio/musics/musicLibrary.ts';
import { createMusicGraph } from '#src/client/cutscenes/audio/score/musicGraph.ts';
import { MusicPlayer } from '#src/client/cutscenes/audio/score/musicPlayer.ts';
import { MusicScheduler } from '#src/client/cutscenes/audio/score/musicScheduler.ts';
import type { Music } from '#src/client/cutscenes/audio/score/musicTypes.ts';

/**
 * The music and the sound effects of the cutscenes, made in code, through the game's sound output: muted, they
 * play nothing; the player's volume applies. The same recipes render offline (an OfflineAudioContext), to files.
 */

/** A recorded layer this late is dropped: a punch heard after its gag is worse than none. */
const RECORDED_LATE_SECONDS = 0.2;
const SFX_DELAY_SECONDS = 0.005;

function stopNothing(): void {}

/** The music playing now, alone: a new one ends the last. */
function createJukebox() {
  let playing: MusicPlayer | null = null;
  function stop(player: MusicPlayer | null = playing): void {
    player?.stop();
    if (player === playing) playing = null;
  }
  function play(player: MusicPlayer): void {
    stop();
    playing = player;
  }
  return { play, stop };
}
const jukebox = createJukebox();

function musicOf(id: Musique): Music | null {
  if (id === 'aucune') return null;
  const music = MUSIC_LIBRARY[id] as Music | undefined;
  if (!music) console.error('Unknown cutscene music', id);
  return music ?? null;
}

function playBuffer(context: BaseAudioContext, out: AudioNode, buffer: AudioBuffer, gain: number, at: number): void {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(level(context, out, gain));
  source.start(at);
}

/** Lays the recorded part of a sound effect over the made part, as soon as it is loaded, if still in time. */
function layRecorded(context: BaseAudioContext, out: AudioNode, { name, gain }: RecordedLayer, at: number): void {
  void loadRecordedSound(context, name).then((buffer) => {
    if (buffer && context.currentTime <= at + RECORDED_LATE_SECONDS) playBuffer(context, out, buffer, gain, Math.max(at, context.currentTime));
  });
}

/** Loads the recorded sounds ahead, when a cutscene begins: the first punch lands on time. */
function warmRecordedSounds(context: BaseAudioContext): void {
  for (const effect of Object.values(SOUND_EFFECT_LIBRARY)) {
    if (effect.recorded) void loadRecordedSound(context, effect.recorded.name);
  }
}

/** Starts a music, looped without a seam, and stops the one that played. Returns what stops it, with a short fade. */
export function startMusic(id: Musique): () => void {
  jukebox.stop();
  const music = musicOf(id);
  const output = music ? soundOutput() : null;
  if (!music || !output) return stopNothing;
  warmRecordedSounds(output.context);
  try {
    const player = new MusicPlayer(output.context, output.master, music);
    jukebox.play(player);
    return () => jukebox.stop(player);
  } catch (error) {
    console.error('Cutscene music could not start', id, error);
    return stopNothing;
  }
}

/** Plays a sound effect now. */
export function playSfx(id: Bruitage): void {
  const effect = SOUND_EFFECT_LIBRARY[id] as (typeof SOUND_EFFECT_LIBRARY)[Bruitage] | undefined;
  if (!effect) console.error('Unknown cutscene sound', id);
  const output = effect ? soundOutput() : null;
  if (!effect || !output) return;
  const at = output.context.currentTime + SFX_DELAY_SECONDS;
  try {
    effect.play(output.context, output.master, at);
  } catch (error) {
    console.error('Cutscene sound could not play', id, error);
  }
  if (effect.recorded) layRecorded(output.context, output.master, effect.recorded, at);
}

/** Schedules `seconds` seconds of a music from time 0, into `destination`: for an OfflineAudioContext. */
export function renderMusic(context: BaseAudioContext, destination: AudioNode, id: Musique, seconds: number): void {
  const music = musicOf(id);
  if (!music) return;
  const graph = createMusicGraph(context, destination, music);
  new MusicScheduler(context, music, graph.inputs, 0).scheduleUntil(seconds);
}

/** Schedules a sound effect at `at`, into `destination`, with its recorded part when it has one and it is given. */
export function renderSfx(context: BaseAudioContext, destination: AudioNode, id: Bruitage, at = 0, recorded: AudioBuffer | null = null): void {
  const effect = SOUND_EFFECT_LIBRARY[id];
  effect.play(context, destination, at);
  if (recorded && effect.recorded) playBuffer(context, destination, recorded, effect.recorded.gain, at);
}

/** The recorded part of a sound effect, decoded for this context; null when it has none. */
export function loadSfxRecording(context: BaseAudioContext, id: Bruitage): Promise<AudioBuffer | null> {
  const recorded = SOUND_EFFECT_LIBRARY[id].recorded;
  return recorded ? loadRecordedSound(context, recorded.name) : Promise.resolve(null);
}

/** How long a music lasts before it loops, in seconds; 0 for silence. */
export function musicLoopSeconds(id: Musique): number {
  const music = musicOf(id);
  return music ? music.loopSteps * music.stepSeconds : 0;
}

/** How long a sound effect rings, in seconds. */
export function sfxSeconds(id: Bruitage): number {
  return SOUND_EFFECT_LIBRARY[id].seconds;
}
