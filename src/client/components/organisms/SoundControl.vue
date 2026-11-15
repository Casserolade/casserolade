<script setup lang="ts">
import RoundButton from '#src/client/components/atoms/RoundButton.vue';
import VolumeKnob from '#src/client/components/atoms/VolumeKnob.vue';
import SettingsButton from '#src/client/components/organisms/SettingsButton.vue';
import { useSoundControls } from '#src/client/stores/useSoundControls.ts';

/** A screen that is touched has no hover to bring a slider out: it gets one button and the settings' sheet. */
const TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

/**
 * The player's settings, in one corner. With a pointer: the game's sounds, the music and the visual effects (the set's
 * flashes and faltering lights, the shaking, the bursts) each have their round switch, and the two sounds a slider
 * that comes out on hover: each has its own volume. On a touch screen: one button, which opens the same settings in a
 * sheet (SettingsButton). Sized by --sound-size on a parent.
 */
const {
  soundOn, soundPercent, soundLabel, toggleSound, slideSound, settleSound,
  musicOn, musicPercent, musicLabel, track, toggleMusic, slideMusic,
  effectsOn, effectsLabel, toggleEffects,
} = useSoundControls();
</script>

<template>
  <div class="sound-control">
    <SettingsButton v-if="TOUCH" label="Réglages : sons du jeu, musique, effets visuels" />
    <template v-else>
      <RoundButton class="effects small" :icon="effectsOn ? 'effectsOn' : 'effectsOff'" :label="effectsLabel" :dim="!effectsOn" :aria-pressed="effectsOn" @click="toggleEffects" />
      <VolumeKnob
        class="music small"
        :icon="musicOn ? 'musicOn' : 'musicOff'"
        :label="track && musicOn ? `${musicLabel} (${track})` : musicLabel"
        slider-label="Volume de la musique"
        :on="musicOn"
        :percent="musicPercent"
        @toggle="toggleMusic"
        @slide="slideMusic"
      />
      <VolumeKnob
        class="sound main"
        :icon="soundOn ? 'soundOn' : 'soundOff'"
        :label="soundLabel"
        slider-label="Volume des sons du jeu"
        :on="soundOn"
        :percent="soundPercent"
        @toggle="toggleSound"
        @slide="slideSound"
        @settle="settleSound"
      />
    </template>
  </div>
</template>

<style scoped>
.sound-control {
  --full: var(--sound-size, 3.2rem);
  --size: var(--full);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: calc(var(--full) * 0.12);
  height: var(--full);
  pointer-events: auto;
}
.main { --size: var(--full); }
.small { --size: calc(var(--full) * 0.72); }
</style>
