<script setup lang="ts">
import RoundButton from '#src/client/components/atoms/RoundButton.vue';
import VolumeSlider from '#src/client/components/atoms/VolumeSlider.vue';
import type { GameIconName } from '#src/client/const/gameIcons.ts';

/**
 * A sound and its volume, for a pointer that hovers: a click on the button cuts it or brings it back, and its slider
 * comes out of the button, toward the left, on hover or focus, pushing its neighbours aside. Sized by --size on a
 * parent.
 */
defineProps<{ icon: GameIconName; label: string; sliderLabel: string; on: boolean; percent: number }>();
const emit = defineEmits<{ toggle: []; slide: [percent: number]; settle: [] }>();
</script>

<template>
  <span class="knob">
    <span class="pill">
      <VolumeSlider class="slider" :percent="on ? percent : 0" :label="sliderLabel" @slide="(value) => emit('slide', value)" @settle="emit('settle')" />
    </span>
    <RoundButton class="button" :icon="icon" :label="label" :dim="!on" :aria-pressed="on" @click="emit('toggle')" />
  </span>
</template>

<style scoped>
.knob { display: flex; align-items: center; justify-content: flex-end; height: var(--size); }
.button { position: relative; z-index: 1; }
/*
 * The slider waits, closed, behind the button; on hover or focus its pill opens toward the left and pushes aside what
 * stands there, so that nothing is ever covered: from one knob the pointer reaches the next.
 */
.pill {
  display: flex;
  align-items: center;
  width: 0;
  height: calc(var(--size) * 0.56);
  padding: 0;
  border: 0 solid var(--color-frame);
  border-radius: 999px;
  background: linear-gradient(#1c2240, #0d1124);
  box-shadow: 0 calc(var(--size) * 0.07) calc(var(--size) * 0.15) rgb(0 0 0 / 0.6);
  opacity: 0;
  overflow: hidden;
  transition: width 0.18s ease-out, padding 0.18s ease-out, margin 0.18s ease-out, opacity 0.18s;
  box-sizing: border-box;
}
.slider { flex: 1; min-width: 0; }
.knob:hover .pill, .knob:has(:focus-visible) .pill {
  width: calc(var(--size) * 3.4);
  margin-right: calc(var(--size) * -0.5);
  padding: 0 calc(var(--size) * 0.66) 0 calc(var(--size) * 0.3);
  border-width: calc(var(--size) * 0.04);
  opacity: 1;
}
</style>
