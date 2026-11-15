<script setup lang="ts">
import SettingRow from '#src/client/components/atoms/SettingRow.vue';
import VolumeSlider from '#src/client/components/atoms/VolumeSlider.vue';
import MobileSheet from '#src/client/components/molecules/MobileSheet.vue';
import { fullscreenMode } from '#src/client/stores/fullscreenMode.ts';
import { useSoundControls } from '#src/client/stores/useSoundControls.ts';

/**
 * The settings on a touch screen: a sheet from the bottom, with a row for the game's sounds and one for the music
 * (each its switch, and a wide slider under the thumb), and one for the visual effects; the slot adds what the screen
 * needs at its foot. A touch outside closes it; the game goes on behind.
 */
const emit = defineEmits<{ close: [] }>();
const {
  soundOn, soundPercent, soundLabel, toggleSound, slideSound, settleSound,
  musicOn, musicPercent, musicLabel, track, toggleMusic, slideMusic,
  effectsOn, effectsLabel, toggleEffects,
} = useSoundControls();
const fullscreenOn = fullscreenMode.active;
</script>

<template>
  <MobileSheet label="Réglages : sons du jeu, musique et effets visuels" @close="emit('close')">
    <section class="settings">
      <h2 class="title">Réglages</h2>
      <SettingRow :icon="soundOn ? 'soundOn' : 'soundOff'" :label="soundLabel" :on="soundOn" name="Sons du jeu" :state="soundOn ? `${soundPercent} %` : 'Coupés'" note="Voix, bruitages, cinématiques" @toggle="toggleSound">
        <VolumeSlider class="slider" :percent="soundOn ? soundPercent : 0" label="Volume des sons du jeu" @slide="slideSound" @settle="settleSound" />
      </SettingRow>
      <SettingRow :icon="musicOn ? 'musicOn' : 'musicOff'" :label="musicLabel" :on="musicOn" name="Musique" :state="musicOn ? `${musicPercent} %` : 'Coupée'" :note="track" @toggle="toggleMusic">
        <VolumeSlider class="slider" :percent="musicOn ? musicPercent : 0" label="Volume de la musique" @slide="slideMusic" />
      </SettingRow>
      <SettingRow :icon="effectsOn ? 'effectsOn' : 'effectsOff'" :label="effectsLabel" :on="effectsOn" name="Effets visuels" :state="effectsOn ? 'Activés' : 'Coupés'" note="Flashs, secousses, lumières qui vacillent" @toggle="toggleEffects" />
      <SettingRow v-if="fullscreenMode.supported" :icon="fullscreenOn ? 'fullscreenOn' : 'fullscreenOff'" :label="fullscreenOn ? 'Quitter le plein écran' : 'Passer en plein écran'" :on="fullscreenOn" name="Plein écran" :state="fullscreenOn ? 'Activé' : 'Coupé'" note="Sans les barres du navigateur" @toggle="fullscreenMode.toggle()" />
      <slot />
    </section>
  </MobileSheet>
</template>

<style scoped>
.settings { display: grid; gap: 1.2rem; padding: 1rem 1.2rem calc(1.4rem + env(safe-area-inset-bottom)); }
.title { margin: 0; color: var(--color-title); font: 400 1.7rem / 1 var(--font-number); letter-spacing: 0.05em; }
/* Wide, tall and drawn bigger than a pointer's slider: the thumb finds it. */
.slider { width: 100%; height: calc(2.75rem / var(--zoom)); --zoom: 1.7; zoom: var(--zoom); }
</style>
