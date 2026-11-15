<script setup lang="ts">
import RoundButton from '#src/client/components/atoms/RoundButton.vue';
import type { GameIconName } from '#src/client/const/gameIcons.ts';

/**
 * One setting of the phone's sheet: its switch, its name, its state in words and a note; what sets it finely (a
 * slider) goes in the slot, on a line of its own, as wide as the sheet.
 */
defineProps<{ icon: GameIconName; label: string; on: boolean; name: string; state: string; note?: string }>();
const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="row">
    <RoundButton class="switch" :icon="icon" :label="label" :dim="!on" :aria-pressed="on" @click="emit('toggle')" />
    <p class="words">
      <strong class="name">{{ name }}</strong>
      <span class="state" :class="{ off: !on }">{{ state }}</span>
      <small v-if="note" class="note">{{ note }}</small>
    </p>
    <slot />
  </div>
</template>

<style scoped>
.row { --size: 3rem; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 0.3rem 0.8rem; }
.words { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 0 0.6rem; margin: 0; }
.name { font: 400 1.35rem / 1.1 var(--font-number); letter-spacing: 0.04em; color: var(--color-title); }
.state { font: 700 1.05rem / 1.1 var(--font-card); color: var(--color-text); }
.state.off { color: var(--color-text-muted); }
.note { grid-column: 1 / -1; color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.2; }
/* What the slot holds takes the whole width, under the switch and the words. */
.row > :deep(:nth-child(n + 3)) { grid-column: 1 / -1; }
</style>
