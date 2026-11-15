<script setup lang="ts">
import { computed } from 'vue';

/** A character scrolls by in about this long: the band is read at the pace of a news channel's. */
const SECONDS_PER_CHARACTER = 0.19;

/**
 * The channel's ticker, at the foot of the screen: its label, then its lines scrolling one after the other, for ever.
 * `still`: the first line only, without moving (the visual effects are off). Sized by --s; coloured by --band and --ink.
 */
const props = defineProps<{ label: string; lines: string[]; still: boolean }>();

const seconds = computed(() => Math.max(18, props.lines.join('   ').length * SECONDS_PER_CHARACTER));
</script>

<template>
  <p class="ticker" :class="{ still }" aria-hidden="true">
    <strong class="label">{{ label }}</strong>
    <span class="window">
      <span v-if="still" class="line">{{ lines[0] }}</span>
      <!-- The lines twice over: when the first run has scrolled away, the second is exactly where it started. -->
      <span v-else class="run" :style="{ animationDuration: `${seconds}s` }">
        <span v-for="pass in 2" :key="pass" class="pass">
          <span v-for="line in lines" :key="line" class="line">{{ line }}</span>
        </span>
      </span>
    </span>
  </p>
</template>

<style scoped>
.ticker {
  display: flex;
  align-items: stretch;
  height: calc(var(--s) * 38);
  margin: 0;
  background: rgb(8 10 20 / 0.82);
  border-top: calc(var(--s) * 3) solid var(--band);
  color: #f4f6fb;
  font: 700 calc(var(--s) * 21) / 1 var(--font-card);
  white-space: nowrap;
}
.label {
  display: flex;
  align-items: center;
  padding: 0 calc(var(--s) * 18);
  background: var(--band);
  color: var(--ink);
  font: 400 calc(var(--s) * 22) / 1 var(--font-number);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.window { position: relative; flex: 1; display: flex; align-items: center; overflow: hidden; }
.run { display: inline-flex; will-change: transform; animation: ticker-scroll linear infinite; }
.pass { display: inline-flex; }
.line { padding: 0 calc(var(--s) * 26); }
.line::after { content: '•'; margin-left: calc(var(--s) * 52); color: var(--band); }
.still .line::after { content: none; }
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) { .run { animation: none; } }
</style>
