<script setup lang="ts">
import type { StudioCardText } from '#src/client/tools/studioCardText.ts';

/**
 * A set's card, as a channel shows one in a corner: a label on the band's colour, and under it a value in large type
 * (a counter, a clock, two clocks side by side) or the sign of the moment. A value that changes pops in.
 * Sized by --s; coloured by --band and --ink.
 */
defineProps<{ text: StudioCardText }>();
</script>

<template>
  <p class="card" :class="{ sign: !text.label }" aria-hidden="true">
    <strong v-if="text.label" class="label">{{ text.label }}</strong>
    <span class="values">
      <span v-for="(value, index) in text.values" :key="text.values.length > 1 ? index : value" class="value" :class="{ live: text.values.length > 1 && index === text.live, waiting: text.values.length > 1 && index !== text.live }">{{ value }}</span>
    </span>
    <small v-if="text.note" class="note">{{ text.note }}</small>
  </p>
</template>

<style scoped>
.card {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0;
  filter: drop-shadow(0 calc(var(--s) * 6) calc(var(--s) * 12) rgb(0 0 0 / 0.5));
  white-space: nowrap;
}
.label {
  padding: calc(var(--s) * 4) calc(var(--s) * 12) calc(var(--s) * 3);
  background: var(--band);
  color: var(--ink);
  font: 700 calc(var(--s) * 17) / 1 var(--font-card-title);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.values { display: flex; gap: calc(var(--s) * 4); }
.value {
  padding: calc(var(--s) * 5) calc(var(--s) * 14) calc(var(--s) * 3);
  background: #f6f4ee;
  color: #10131f;
  font: 400 calc(var(--s) * 36) / 1 var(--font-number);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  animation: value-pop 0.35s cubic-bezier(0.2, 1.4, 0.4, 1);
}
/* The sign of the moment: the band's own colour, as wide as its words. */
.sign .value { background: var(--band); color: var(--ink); font-size: calc(var(--s) * 28); text-transform: uppercase; }
/* Two speaking times: the one that runs is lit, the other waits. */
.waiting { opacity: 0.55; }
.live { box-shadow: inset 0 calc(var(--s) * -5) 0 var(--band); }
.note { padding: calc(var(--s) * 3) calc(var(--s) * 12); background: #10131f; color: #ffd84a; font: 700 calc(var(--s) * 15) / 1 var(--font-card-title); letter-spacing: 0.06em; text-transform: uppercase; }
@keyframes value-pop {
  from { transform: scale(0.82); opacity: 0.4; }
  to { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) { .value { animation: none; } }
</style>
