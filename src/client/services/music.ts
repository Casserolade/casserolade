import { ref, watch } from 'vue';
import { musicOutput, onVoiceStart, soundSettings } from '#src/client/services/soundEffects.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { musicOrder } from '#src/client/tools/musicOrder.ts';
import { trackMayPlay } from '#src/client/tools/trackMayPlay.ts';
import { MUSIQUES } from '#src/data/musiques.ts';
import type { Musique } from '#src/data/musiques.ts';

/** The music sits under everything: the table's sounds, and above all the real voices. */
const MUSIC_GAIN = 0.2;
/** While a real voice speaks, the music steps back to this share of its level. */
const DUCKED_SHARE = 0.3;
const FADE_SECONDS = 0.6;
const DUCK_SECONDS = 0.25;

/**
 * The background music of the table: one track after the other, streamed, through its own bus of the game's audio
 * output (its own volume: the game's volume and switch do not reach it). It plays while a game asks for it (`play`),
 * the music setting is on and
 * nothing holds it (a cutscene has its own soundtrack); it steps back under each real voice. The tracks come in a
 * random order, each once before any comes back; a track kept for the last breath is passed over unless the hero has a
 * single poll left when its turn comes.
 */
class MusicPlayer {
  /** The track that plays, for whoever shows it; null when the music is silent. */
  readonly current = ref<Musique | null>(null);
  private readonly element: HTMLAudioElement | null = typeof Audio === 'undefined' ? null : new Audio();
  private level: GainNode | null = null;
  private queue: Musique[] = [];
  private wanted = false;
  private holds = 0;
  private heroPolls: number | null = null;
  private duckTimer = 0;

  constructor() {
    if (!this.element) return;
    this.element.preload = 'none';
    this.element.addEventListener('ended', () => this.next());
    this.element.addEventListener('error', () => this.next());
    watch(soundSettings.music, () => this.sync());
    onVoiceStart((milliseconds) => this.duck(milliseconds));
  }

  /** A game is on screen: the music may play. */
  play(): void {
    this.wanted = true;
    this.sync();
  }

  /** The game left the screen. */
  stop(): void {
    this.wanted = false;
    this.sync();
  }

  /** The polls the player's hero has left, null outside a game: some tracks wait for the last one. */
  setHeroPolls(polls: number | null): void {
    this.heroPolls = polls;
  }

  /** Something else takes the sound (a cutscene); `release` gives it back. */
  hold(): void {
    this.holds++;
    this.sync();
  }

  release(): void {
    this.holds = Math.max(0, this.holds - 1);
    this.sync();
  }

  private shouldPlay(): boolean {
    return this.wanted && this.holds === 0 && soundSettings.music.value;
  }

  private sync(): void {
    const element = this.element;
    if (!element) return;
    if (!this.shouldPlay()) {
      element.pause();
      this.current.value = null;
      return;
    }
    if (!this.connect()) return;
    if (!element.src) this.next();
    else this.resume();
  }

  /** Into the music's bus, once: the element then follows the music's volume. False while audio cannot start. */
  private connect(): boolean {
    // Asked each time: it also wakes the audio context, asleep until the player's first gesture.
    const output = musicOutput();
    if (this.level) return true;
    if (!output || !this.element) return false;
    try {
      this.level = output.context.createGain();
      this.level.gain.value = MUSIC_GAIN;
      output.context.createMediaElementSource(this.element).connect(this.level);
      this.level.connect(output.bus);
      return true;
    } catch (error) {
      console.error('Music could not be connected', error);
      return false;
    }
  }

  private next(): void {
    if (!this.element || !this.shouldPlay()) return;
    const files = gameArt.manifest.value.sons.musique ?? {};
    if (this.queue.length === 0) {
      const tracks = MUSIQUES.filter((track) => files[track.fichier]);
      this.queue = musicOrder(tracks, tracks.map(() => Math.random()), this.current.value);
    }
    // The turn of a track that may not play now is simply lost: the next one takes it.
    let track = this.queue.shift();
    while (track && !trackMayPlay(track, this.heroPolls)) track = this.queue.shift();
    if (!track) return;
    this.element.src = assetUrl(files[track.fichier]);
    this.current.value = track;
    this.resume();
  }

  private resume(): void {
    const element = this.element;
    if (!element) return;
    this.current.value ??= MUSIQUES.find((track) => element.src.includes(`/${track.fichier}.`)) ?? null;
    this.fade(MUSIC_GAIN, FADE_SECONDS);
    // Refused before the player's first gesture: that gesture starts it.
    element.play().catch(() => window.addEventListener('pointerdown', () => this.sync(), { once: true }));
  }

  private duck(milliseconds: number): void {
    if (!this.level) return;
    this.fade(MUSIC_GAIN * DUCKED_SHARE, DUCK_SECONDS);
    window.clearTimeout(this.duckTimer);
    this.duckTimer = window.setTimeout(() => this.fade(MUSIC_GAIN, FADE_SECONDS), milliseconds);
  }

  private fade(target: number, seconds: number): void {
    if (!this.level) return;
    const now = this.level.context.currentTime;
    this.level.gain.cancelScheduledValues(now);
    this.level.gain.setTargetAtTime(target, now, seconds / 3);
  }
}

export const music = new MusicPlayer();
