<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { playSound, setSoundMuted, setSoundVolume, soundSettings } from '#src/client/services/soundEffects.ts';

/**
 * The sound, in one corner: a click mutes or brings it back, the slider beside it sets the volume.
 * The same setting everywhere, kept for the next visit. Sized by --sound-size on a parent.
 */
const { muted, volume } = soundSettings;
const silent = computed(() => muted.value || volume.value === 0);
const percent = computed(() => Math.round(volume.value * 100));

function toggle(): void {
  if (silent.value) {
    if (volume.value === 0) setSoundVolume(0.5);
    setSoundMuted(false);
    playSound('tick');
  } else {
    setSoundMuted(true);
  }
}

function slide(event: Event): void {
  setSoundVolume(Number((event.target as HTMLInputElement).value) / 100);
  if (muted.value && volume.value > 0) setSoundMuted(false);
}
</script>

<template>
  <div class="sound-control" :class="{ silent }">
    <input
      class="slider"
      type="range"
      min="0"
      max="100"
      step="5"
      :value="silent ? 0 : percent"
      aria-label="Volume"
      @input="slide"
      @change="playSound('tick')"
    />
    <button type="button" class="toggle" :aria-pressed="silent" :aria-label="silent ? 'Remettre le son' : 'Couper le son'" :title="silent ? 'Remettre le son' : 'Couper le son'" @click="toggle">
      <GameIcon :name="silent ? 'soundOff' : 'soundOn'" />
    </button>
  </div>
</template>

<style scoped>
.sound-control {
  --size: var(--sound-size, 3.2rem);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: var(--size);
  pointer-events: auto;
}
.toggle {
  position: relative;
  z-index: 1;
  width: var(--size);
  height: var(--size);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: calc(var(--size) * 0.06) solid #d8b450;
  background: radial-gradient(circle at 40% 30%, #4a64a8, #16204a 70%);
  box-shadow: 0 calc(var(--size) * 0.07) calc(var(--size) * 0.15) rgb(0 0 0 / 0.6);
  color: #fff;
  font-size: calc(var(--size) * 0.55);
  cursor: pointer;
  transition: transform 0.1s, filter 0.1s;
}
.toggle:hover { transform: scale(1.06); filter: brightness(1.2); }
.toggle:active { transform: scale(0.94); }
.toggle:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
.silent .toggle { color: #9aa3b8; filter: saturate(0.4); }
/* The slider comes out of the button on hover or focus, toward the left. */
.slider {
  position: absolute;
  right: calc(var(--size) * 0.5);
  width: 0;
  height: calc(var(--size) * 0.56);
  margin: 0;
  padding: 0 calc(var(--size) * 0.6) 0 calc(var(--size) * 0.3);
  border-radius: 999px;
  border: calc(var(--size) * 0.04) solid #d8b450;
  background: linear-gradient(#1c2240, #0d1124);
  accent-color: #ffd84a;
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  transition: width 0.18s ease-out, opacity 0.18s;
  box-sizing: content-box;
}
.sound-control:hover .slider, .sound-control:focus-within .slider { width: calc(var(--size) * 2.4); opacity: 1; pointer-events: auto; }
@media (hover: none) { .slider { display: none; } }
</style>
