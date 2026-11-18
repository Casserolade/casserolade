<script setup lang="ts">
import OnAirBadge from '#src/client/components/atoms/OnAirBadge.vue';

/**
 * Who a hero of the combat is, online: a pseudo on a plate under its portrait. `live`: the combat of a survivor
 * followed from outside the game, said in red as on a news channel.
 */
withDefaults(defineProps<{ label: string; live?: boolean }>(), { live: false });
</script>

<template>
  <span class="seat-tag" :class="{ live }"><OnAirBadge v-if="live" /><span class="label">{{ label }}</span></span>
</template>

<style scoped>
.seat-tag {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--s) * 10);
  max-width: calc(var(--s) * 520);
  padding: calc(var(--s) * 6) calc(var(--s) * 18);
  border-radius: calc(var(--s) * 30);
  border: calc(var(--s) * 3) solid #111;
  background: #fff7d6;
  color: var(--color-ink);
  font: 800 calc(var(--s) * 24) / 1.15 var(--font-card);
  box-shadow: calc(var(--s) * 4) calc(var(--s) * 5) 0 rgb(0 0 0 / 0.35);
  white-space: nowrap;
  pointer-events: none;
}
.label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
</style>
