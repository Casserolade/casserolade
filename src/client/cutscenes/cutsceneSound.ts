import type { CutsceneCue } from '#src/client/cutscenes/createCutscene.ts';
import { playVoice, stopVoice } from '#src/client/services/soundEffects.ts';
import { heardVoices } from '#src/client/stores/heardVoices.ts';

interface CutsceneAudio {
  startMusic: (id: string) => () => void;
  playSfx: (id: string) => void;
}

/** The cutscenes' music and sound effects (cutsceneAudio.ts), loaded the first time a cutscene plays. */
const AUDIO_MODULE = import.meta.glob('./cutsceneAudio.ts') as Record<string, () => Promise<Partial<CutsceneAudio>>>;

/**
 * The sound of one cutscene: its music, its sound effects, and the real voices of its lines. A cutscene is its own
 * show: the voices heard in the game before do not keep it quiet. Stopped, everything falls silent at once.
 */
export class CutsceneSound {
  private audio: Promise<Partial<CutsceneAudio> | null>;
  private stopMusic: (() => void) | null = null;
  private stopped = false;

  constructor() {
    heardVoices.forget();
    const load = AUDIO_MODULE['./cutsceneAudio.ts'];
    this.audio = load ? load().catch(() => null) : Promise.resolve(null);
  }

  cue(cue: CutsceneCue): void {
    if (this.stopped) return;
    if (cue.kind === 'music-stop') {
      this.endMusic();
      return;
    }
    const { kind, id } = cue;
    if (kind === 'voice') void playVoice(id);
    else void this.audio.then((audio) => this.playAudio(audio, kind, id));
  }

  stop(): void {
    this.stopped = true;
    this.endMusic();
    stopVoice();
  }

  private playAudio(audio: Partial<CutsceneAudio> | null, kind: 'music' | 'sfx', id: string): void {
    if (this.stopped || !audio) return;
    if (kind === 'sfx') audio.playSfx?.(id);
    else {
      this.endMusic();
      this.stopMusic = audio.startMusic?.(id) ?? null;
    }
  }

  private endMusic(): void {
    this.stopMusic?.();
    this.stopMusic = null;
  }
}
