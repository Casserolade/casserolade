import gsap from 'gsap';
import type { PlayableCutscene } from '#src/client/cutscenes/PlayableCutscene.ts';
import { soundSettings } from '#src/client/services/soundEffects.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import type { CinematiqueComposee } from '#src/data/histoire/cinematique.ts';

/** A HyperFrames episode as the export writes it (composed/<career>/epN.ts). */
export interface ComposedEpisode {
  duration: number;
  styles: string;
  markup: string;
  mountScenes: (engine: typeof gsap) => Record<string, gsap.core.Timeline>;
}

interface Clip {
  element: HTMLElement;
  start: number;
  end: number;
  shown: boolean | null;
}

/** Loaded only when a career plays one of them. */
const EPISODES = import.meta.glob('./*/ep*.ts') as Record<string, () => Promise<{ episode: ComposedEpisode }>>;
/** The mixes peak at -1 dBFS: at the default volume they sit with the game's voices. */
const SOUND_GAIN = 0.9;
/** The picture follows the sound: a larger gap than this is closed at once. */
const MAX_DRIFT = 0.12;
/** A sound that does not load in this time is left out: the film plays in silence. */
const SOUND_WAIT_MS = 4000;

function soundReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    audio.addEventListener('canplay', done, { once: true });
    audio.addEventListener('error', done, { once: true });
    window.setTimeout(done, SOUND_WAIT_MS);
  });
}

/** The episodes write their images from the site's root: elsewhere than at /, they go through assetUrl. */
function resolveAssetPaths(root: HTMLElement): void {
  if (assetUrl('') === '/') return;
  for (const element of root.querySelectorAll<HTMLElement>('[href^="/"], [src^="/"]')) {
    for (const attribute of ['href', 'src']) {
      const value = element.getAttribute(attribute);
      if (value?.startsWith('/')) element.setAttribute(attribute, assetUrl(value.slice(1)));
    }
  }
}

/**
 * A career cutscene written with HyperFrames (the shōnen episodes of Durif), played like the others: its scenes are
 * placed on the game's page, run with the game's GSAP, and nested in one paused timeline, each at its start, each shown
 * only in its window (as the HyperFrames runtime does). Its sound is one mix: the picture follows it.
 */
export class ComposedCutscene implements PlayableCutscene {
  readonly timeline = gsap.timeline({ paused: true });
  private readonly root: HTMLElement;
  private readonly audio: HTMLAudioElement;
  private readonly clips: Clip[];
  private readonly follow = () => this.followSound();

  static async load(container: HTMLElement, scene: CinematiqueComposee): Promise<ComposedCutscene> {
    const load = EPISODES[`./${scene.episode}.ts`];
    if (!load) throw new Error(`Unknown composed cutscene: ${scene.episode}`);
    const { episode } = await load();
    const cutscene = new ComposedCutscene(container, scene, episode);
    await soundReady(cutscene.audio);
    return cutscene;
  }

  private constructor(container: HTMLElement, scene: CinematiqueComposee, episode: ComposedEpisode) {
    this.root = document.createElement('div');
    this.root.className = 'composed-cutscene';
    const style = document.createElement('style');
    style.textContent = episode.styles;
    this.root.append(style);
    this.root.insertAdjacentHTML('beforeend', episode.markup);
    container.append(this.root);
    resolveAssetPaths(this.root);
    this.audio = new Audio(assetUrl(scene.son));
    this.audio.preload = 'auto';
    this.audio.volume = Math.min(1, soundSettings.volume.value * SOUND_GAIN);
    this.audio.muted = soundSettings.muted.value;

    const scenes = episode.mountScenes(gsap);
    const film = this.root.querySelector<HTMLElement>('[data-composition-id="main"]');
    for (const host of film?.querySelectorAll<HTMLElement>('[data-composition-id]') ?? []) {
      const timeline = scenes[host.dataset.compositionId ?? ''];
      if (timeline) this.timeline.add(timeline.paused(false), Number(host.dataset.start));
    }
    this.timeline.set({}, {}, episode.duration);
    this.clips = [...(film?.querySelectorAll<HTMLElement>('[data-start]') ?? [])].map((element) => {
      const host = element.parentElement?.closest<HTMLElement>('[data-composition-id]');
      const offset = host && host !== film ? Number(host.dataset.start) : 0;
      const start = offset + Number(element.dataset.start);
      const length = element.dataset.duration === undefined ? Infinity : Number(element.dataset.duration);
      return { element, start, end: start + length, shown: null };
    });
    this.timeline.eventCallback('onUpdate', () => this.showClips(this.timeline.time()));
    this.timeline.seek(0, false);
    this.showClips(0);
  }

  play(): void {
    this.timeline.play(0);
    this.audio.currentTime = 0;
    // A browser that refuses the sound without a fresh gesture still shows the film, in silence.
    this.audio.play().catch(() => undefined);
    gsap.ticker.add(this.follow);
  }

  finish(): void {
    gsap.ticker.remove(this.follow);
    this.audio.pause();
    this.timeline.progress(1, true);
    this.timeline.pause();
  }

  destroy(): void {
    gsap.ticker.remove(this.follow);
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.timeline.kill();
    this.root.remove();
  }

  /** Each timed element is on screen only during its window: a scene in the film, a line inside its scene. */
  private showClips(time: number): void {
    for (const clip of this.clips) {
      const shown = time >= clip.start && time < clip.end;
      if (shown === clip.shown) continue;
      clip.shown = shown;
      clip.element.style.visibility = shown ? '' : 'hidden';
    }
  }

  private followSound(): void {
    const audio = this.audio;
    if (audio.paused || audio.seeking || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;
    if (Math.abs(this.timeline.time() - audio.currentTime) > MAX_DRIFT) this.timeline.seek(audio.currentTime, false);
  }
}
