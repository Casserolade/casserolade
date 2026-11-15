<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import type { GameIconName } from '#src/client/const/gameIcons.ts';

/**
 * A round button of the table's corners: an icon in a gold ring. `dim` shows what it stands for as switched off; its
 * icon should change too, the colour never says it alone. Sized by --size on a parent.
 */
defineProps<{ icon: GameIconName; label: string; dim?: boolean }>();
</script>

<template>
  <button type="button" class="round" :class="{ dim }" :aria-label="label" :title="label"><GameIcon :name="icon" /></button>
</template>

<style scoped>
.round {
  flex: none;
  width: var(--size);
  height: var(--size);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: calc(var(--size) * 0.06) solid var(--color-frame);
  background: radial-gradient(circle at 40% 30%, #4a64a8, #16204a 70%);
  box-shadow: 0 calc(var(--size) * 0.07) calc(var(--size) * 0.15) rgb(0 0 0 / 0.6);
  color: #fff;
  font-size: calc(var(--size) * var(--icon-share, 0.55));
  cursor: pointer;
  transition: transform 0.1s, filter 0.1s, opacity 0.18s;
}
.round:hover { transform: scale(1.06); filter: brightness(1.2); }
.round:active { transform: scale(0.94); }
.round:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
.dim { color: #9aa3b8; filter: saturate(0.4); }
.dim:hover { filter: saturate(0.4) brightness(1.2); }
</style>
