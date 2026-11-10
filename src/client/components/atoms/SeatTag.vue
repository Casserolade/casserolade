<script setup lang="ts">
/**
 * Who a hero of the combat is, online: a pseudo on a plate under its portrait. `live`: the combat of a survivor
 * followed from outside the game, said in red as on a news channel.
 */
withDefaults(defineProps<{ label: string; live?: boolean }>(), { live: false });
</script>

<template>
  <span class="seat-tag" :class="{ live }"><b v-if="live" class="on-air">En direct</b><span class="label">{{ label }}</span></span>
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
.on-air { flex: none; padding: calc(var(--s) * 2) calc(var(--s) * 10); border-radius: calc(var(--s) * 8); background: #e0182c; color: #fff; font: 400 calc(var(--s) * 22) / 1.1 var(--font-number); letter-spacing: calc(var(--s) * 1); animation: on-air 1.4s ease-in-out infinite; }
@keyframes on-air { 50% { opacity: 0.65; } }
@media (prefers-reduced-motion: reduce) { .on-air { animation: none; } }
</style>
