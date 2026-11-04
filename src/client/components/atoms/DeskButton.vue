<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import type { GameIconName } from '#src/client/const/gameIcons.ts';

/**
 * A round button of the host's desk: an icon and a price. A free use says so, and the free uses left
 * show as a count. Its name is for screen readers and on hover.
 */
withDefaults(defineProps<{ icon: GameIconName; label: string; cost?: number | null; freeLeft?: number; disabled?: boolean; pressed?: boolean; tone?: 'blue' | 'gold' | 'ice' }>(), {
  cost: null,
  freeLeft: 0,
  pressed: undefined,
  tone: 'blue',
});
</script>

<template>
  <button type="button" class="desk-button" :class="`tone-${tone}`" :disabled="disabled" :aria-pressed="pressed" :aria-label="label" :title="label">
    <span class="medal"><GameIcon :name="icon" /><slot /></span>
    <span v-if="cost === 0" class="cost free">Gratuit</span>
    <span v-else-if="cost !== null" class="cost"><GameIcon name="coin" />{{ cost }}</span>
    <span v-if="freeLeft > 1" class="free-left">×{{ freeLeft }}</span>
  </button>
</template>

<style scoped>
.desk-button { position: relative; display: block; width: calc(var(--s) * 86); height: calc(var(--s) * 86); padding: 0; background: none; border: none; cursor: pointer; }
.medal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: calc(var(--s) * 5) solid #d8b450;
  background: radial-gradient(circle at 40% 30%, #4a64a8, #16204a 70%);
  box-shadow: 0 calc(var(--s) * 6) calc(var(--s) * 12) rgb(0 0 0 / 0.65), inset 0 calc(var(--s) * 3) 0 rgb(255 255 255 / 0.2);
  color: #fff;
  font-size: calc(var(--s) * 46);
  transition: transform 0.1s, filter 0.1s;
}
.tone-gold .medal { background: radial-gradient(circle at 40% 30%, #3f8a4a, #12401e 70%); }
.tone-ice .medal { background: radial-gradient(circle at 40% 30%, #6fb7e8, #1a4a78 70%); }
.cost {
  position: absolute;
  right: calc(var(--s) * -14);
  top: calc(var(--s) * -10);
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 2);
  padding: calc(var(--s) * 2) calc(var(--s) * 10) calc(var(--s) * 2) calc(var(--s) * 4);
  border-radius: calc(var(--s) * 20);
  border: calc(var(--s) * 3) solid #1a1206;
  background: linear-gradient(#ffe27a, #e8a612);
  color: var(--color-ink);
  font: 400 calc(var(--s) * 30) / 1 var(--font-number);
}
.cost.free { padding: calc(var(--s) * 4) calc(var(--s) * 10); background: linear-gradient(#b6ff9e, #3fae3a); font-size: calc(var(--s) * 22); }
.free-left {
  position: absolute;
  right: calc(var(--s) * -10);
  bottom: calc(var(--s) * -6);
  padding: calc(var(--s) * 2) calc(var(--s) * 8);
  border-radius: calc(var(--s) * 16);
  border: calc(var(--s) * 3) solid #1a1206;
  background: #3fae3a;
  color: #fff;
  font: 400 calc(var(--s) * 24) / 1 var(--font-number);
}
.cost .game-icon { --icon-edge: transparent; color: #a8660a; font-size: calc(var(--s) * 24); }
.desk-button:hover:not(:disabled) .medal { transform: translateY(calc(var(--s) * -3)) scale(1.06); filter: brightness(1.2); }
.desk-button:active:not(:disabled) .medal { transform: scale(0.94); }
.desk-button:focus-visible .medal { outline: calc(var(--s) * 4) solid var(--color-accent); outline-offset: calc(var(--s) * 3); }
.desk-button:disabled { cursor: not-allowed; }
.desk-button:disabled .medal { filter: grayscale(0.85) brightness(0.55); }
.desk-button:disabled .cost { filter: grayscale(1); }
.desk-button[aria-pressed='true'] .medal { border-color: #bfe8ff; box-shadow: 0 0 calc(var(--s) * 18) rgb(150 210 255 / 0.9), inset 0 calc(var(--s) * 3) 0 rgb(255 255 255 / 0.3); }
</style>
