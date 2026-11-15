import { computed } from 'vue';
import { music as musicPlayer } from '#src/client/services/music.ts';
import { playSound, setMusicOn, setMusicVolume, setSoundMuted, setSoundVolume, soundSettings } from '#src/client/services/soundEffects.ts';
import { visualEffects } from '#src/client/stores/visualEffects.ts';

/** A volume brought back from zero by its switch comes back here. */
const RESTORED_VOLUME = 0.5;

/**
 * The player's sound and comfort settings, for whichever control shows them (the knobs of the corner, the phone's
 * sheet): the game's sounds and the music each have their switch and their own volume, and neither moves the other;
 * the visual effects have their switch. The same settings everywhere, kept for the next visit.
 */
export function useSoundControls() {
  const { muted, volume, music, musicVolume } = soundSettings;
  const soundOn = computed(() => !muted.value && volume.value > 0);
  const musicOn = computed(() => music.value && musicVolume.value > 0);
  const effectsOn = visualEffects.on;
  /** The track that plays, as its credit reads; empty when the music is silent. */
  const track = computed(() => {
    const playing = musicPlayer.current.value;
    return playing ? `« ${playing.titre} », ${playing.auteur}` : '';
  });

  function toggleSound(): void {
    if (soundOn.value) return setSoundMuted(true);
    if (volume.value === 0) setSoundVolume(RESTORED_VOLUME);
    setSoundMuted(false);
    playSound('tick');
  }

  function slideSound(percent: number): void {
    setSoundVolume(percent / 100);
    if (muted.value && percent > 0) setSoundMuted(false);
  }

  /** A tick at the volume just chosen: the player hears what was set. */
  function settleSound(): void {
    playSound('tick');
  }

  function toggleMusic(): void {
    if (musicOn.value) return setMusicOn(false);
    if (musicVolume.value === 0) setMusicVolume(RESTORED_VOLUME);
    setMusicOn(true);
  }

  function slideMusic(percent: number): void {
    setMusicVolume(percent / 100);
    if (!music.value && percent > 0) setMusicOn(true);
  }

  function toggleEffects(): void {
    visualEffects.set(!effectsOn.value);
    playSound('tick');
  }

  return {
    soundOn,
    soundPercent: computed(() => Math.round(volume.value * 100)),
    soundLabel: computed(() => (soundOn.value ? 'Couper les sons du jeu' : 'Remettre les sons du jeu')),
    toggleSound,
    slideSound,
    settleSound,
    musicOn,
    musicPercent: computed(() => Math.round(musicVolume.value * 100)),
    musicLabel: computed(() => (musicOn.value ? 'Couper la musique' : 'Remettre la musique')),
    track,
    toggleMusic,
    slideMusic,
    effectsOn,
    effectsLabel: computed(() => (effectsOn.value ? 'Couper les effets visuels (flashs, lumières qui vacillent, secousses)' : 'Remettre les effets visuels')),
    toggleEffects,
  };
}
