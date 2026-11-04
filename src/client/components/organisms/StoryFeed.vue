<script setup lang="ts">
import { computed } from 'vue';
import { speakerName } from '#src/client/tools/speakerName.ts';
import type { Ligne } from '#src/data/histoire/chapitres.ts';
import { remplir } from '#src/histoire/campagne.ts';

/** The career's line of the moment, on a slip of paper beside the table. It goes by itself. */
const props = defineProps<{ line: Ligne; heroId: string; bossId: string | null }>();

const speaker = computed(() => speakerName(props.line.qui));
</script>

<template>
  <Transition name="slip" mode="out-in" appear>
    <p :key="line.texte" class="feed" aria-live="polite">
      <strong v-if="speaker" class="speaker">{{ speaker }}</strong>
      {{ remplir(line.texte, heroId, bossId) }}
    </p>
  </Transition>
</template>

<style scoped>
/* Nothing to close and nothing in the way. */
.feed {
  width: 100%;
  padding: calc(var(--s) * 14) calc(var(--s) * 16);
  border-radius: calc(var(--s) * 18);
  border: calc(var(--s) * 4) solid var(--color-ink);
  background: #fffbe8;
  color: var(--color-ink);
  box-shadow: calc(var(--s) * 5) calc(var(--s) * 7) 0 rgb(0 0 0 / 0.35);
  font: 600 calc(var(--s) * 23) / 1.25 var(--font-card);
  rotate: 1deg;
}
.speaker { display: block; margin-bottom: calc(var(--s) * 4); color: #c8102e; font: 400 calc(var(--s) * 26) / 1 var(--font-number); letter-spacing: calc(var(--s) * 1); }
.slip-enter-active { animation: slip-in 0.35s cubic-bezier(0.3, 1.5, 0.5, 1); }
.slip-leave-active { animation: slip-in 0.15s ease-in reverse; }
@keyframes slip-in { from { transform: translateX(30%) rotate(6deg); opacity: 0; } }
/* On a phone the top console is short: the line floats, and lets taps through. */
@media (max-width: 1099px) {
  .feed { position: fixed; z-index: 7; inset-inline: var(--space-2); bottom: 64px; width: auto; pointer-events: none; }
}
</style>
