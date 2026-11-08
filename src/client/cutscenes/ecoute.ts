import { BRUITAGES, MUSIQUES } from '#src/data/histoire/cinematique.ts';
import type { Bruitage, Musique } from '#src/data/histoire/cinematique.ts';
import { setSoundMuted, setSoundVolume, soundSettings } from '#src/client/services/soundEffects.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { encodeWav } from '#src/client/cutscenes/audio/wav/encodeWav.ts';
import { measureLevels } from '#src/client/cutscenes/audio/wav/measureLevels.ts';
import { loadSfxRecording, musicLoopSeconds, playSfx, renderMusic, renderSfx, sfxSeconds, startMusic } from '#src/client/cutscenes/cutsceneAudio.ts';
import '../styles/fonts.css';
import '../styles/tokens.css';
import '../styles/base.css';
import './ecoute.css';

/** The development page where the cutscenes' music and sound effects are heard, one button each. */

const SAMPLE_RATE = 48000;
/** A music renders two turns of its loop, and the tail of its last notes. */
const MUSIC_TAIL_SECONDS = 2;

/** The music playing on this page, and the button that started it. */
function createMusicToggle() {
  let playing: { button: HTMLButtonElement; stop: () => void } | null = null;
  function toggle(id: Musique, button: HTMLButtonElement): void {
    const wasPlaying = playing?.button === button;
    playing?.stop();
    playing?.button.setAttribute('aria-pressed', 'false');
    playing = null;
    if (wasPlaying) return;
    playing = { button, stop: startMusic(id) };
    button.setAttribute('aria-pressed', 'true');
  }
  return { toggle };
}
const musicToggle = createMusicToggle();

function formatDecibels(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1).replace('.', ',')} dBFS` : 'silence';
}

/** Renders offline, `seconds` long, what `schedule` puts into the context. */
async function renderOffline(seconds: number, schedule: (context: OfflineAudioContext) => Promise<void> | void): Promise<Float32Array[]> {
  const context = new OfflineAudioContext(2, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  await schedule(context);
  const rendered = await context.startRendering();
  return [rendered.getChannelData(0), rendered.getChannelData(1)];
}

/** Offers the rendered sound as a WAV file, and writes its levels next to its button. */
function offerWav(name: string, channels: Float32Array[], note: HTMLElement): void {
  const { peak, rms } = measureLevels(channels);
  note.textContent = `crête ${formatDecibels(peak)} · RMS ${formatDecibels(rms)}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([encodeWav(channels, SAMPLE_RATE)], { type: 'audio/wav' }));
  link.download = `${name}.wav`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

/** A line of the list: the button that plays, the one that renders, and what the render measured. */
function listItem(play: HTMLButtonElement, render: (note: HTMLElement) => Promise<void>): HTMLLIElement {
  const item = document.createElement('li');
  const note = document.createElement('span');
  note.className = 'ecoute-mesure';
  const wav = button('WAV', () => {
    note.textContent = 'rendu…';
    render(note).catch((error: unknown) => {
      console.error('Offline render failed', error);
      note.textContent = 'échec du rendu';
    });
  });
  item.append(play, wav, note);
  return item;
}

function musicItem(id: Musique): HTMLLIElement {
  const loop = musicLoopSeconds(id);
  const play = button(`${id} · ${loop.toFixed(1).replace('.', ',')} s`, () => musicToggle.toggle(id, play));
  play.setAttribute('aria-pressed', 'false');
  return listItem(play, async (note) => offerWav(id, await renderOffline(loop * 2 + MUSIC_TAIL_SECONDS, (context) => renderMusic(context, context.destination, id, loop * 2)), note));
}

function effectItem(id: Bruitage): HTMLLIElement {
  const play = button(id, () => playSfx(id));
  async function scheduleEffect(context: OfflineAudioContext): Promise<void> {
    renderSfx(context, context.destination, id, 0.05, await loadSfxRecording(context, id));
  }
  return listItem(play, async (note) => offerWav(id, await renderOffline(sfxSeconds(id) + 0.3, scheduleEffect), note));
}

function wireSoundSettings(): void {
  const muted = document.querySelector<HTMLInputElement>('#son-coupe');
  const volume = document.querySelector<HTMLInputElement>('#volume');
  if (!muted || !volume) return;
  muted.checked = soundSettings.muted.value;
  volume.value = String(soundSettings.volume.value);
  muted.addEventListener('change', () => setSoundMuted(muted.checked));
  volume.addEventListener('input', () => setSoundVolume(Number(volume.value)));
}

gameArt.load().catch((error: unknown) => console.error('Manifest could not load', error));
wireSoundSettings();
document.querySelector('#musiques')?.append(...MUSIQUES.filter((id) => id !== 'aucune').map(musicItem));
document.querySelector('#bruitages')?.append(...BRUITAGES.map(effectItem));
