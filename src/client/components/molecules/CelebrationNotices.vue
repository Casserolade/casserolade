<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import type { CelebrationNotice } from '#src/client/tools/celebrationNotices.ts';

/**
 * What each Célébration gives, as it plays after the combat: a small TV chyron per politician, sliding in at the
 * bottom right of the table, the newest last, each gone after a few seconds. Nothing to close. `side` is the player's,
 * so that a rival's Célébration says it is the rival's.
 */
defineProps<{ notices: CelebrationNotice[]; side: 0 | 1 }>();
</script>

<template>
  <TransitionGroup tag="ol" name="notice" class="celebration-notices" aria-live="polite">
    <li v-for="notice in notices" :key="notice.at" class="notice" :class="{ rival: notice.side !== side }">
      <span class="tag"><GameIcon name="confetti" /> Célébration<template v-if="notice.side !== side"> adverse</template></span>
      <span class="body">
        <strong class="name">{{ notice.name }}</strong>
        <RichText class="gain" :text="notice.text" />
      </span>
      <span v-if="notice.repeats > 1" class="repeats" :title="`Joue ${notice.repeats} fois`">×{{ notice.repeats }}</span>
    </li>
  </TransitionGroup>
</template>

<style scoped>
.celebration-notices {
  position: absolute;
  right: calc(var(--s) * 36);
  bottom: calc(var(--s) * 36);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: calc(var(--s) * 8);
  margin: 0;
  padding: 0;
  list-style: none;
}
.notice {
  position: relative;
  display: flex;
  align-items: stretch;
  max-width: calc(var(--s) * 660);
  border-radius: calc(var(--s) * 10);
  overflow: hidden;
  background: linear-gradient(90deg, rgb(14 16 30 / 0.94), rgb(26 20 44 / 0.94));
  box-shadow: 0 calc(var(--s) * 8) calc(var(--s) * 24) rgb(0 0 0 / 0.5), inset 0 0 0 calc(var(--s) * 2) rgb(255 106 213 / 0.55);
  color: var(--color-text);
  animation: notice-away 0.5s 4s ease-in forwards;
}
/* The pink of the Célébration mark, the gold of the stars: a little party, no more. */
.tag {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 6);
  padding: 0 calc(var(--s) * 12);
  background: linear-gradient(#ff7ddc, #d23ba6);
  color: #fff;
  font: 400 calc(var(--s) * 19) / 1 var(--font-number);
  letter-spacing: calc(var(--s) * 1.2);
  text-transform: uppercase;
  text-shadow: 0 calc(var(--s) * 2) 0 rgb(0 0 0 / 0.35);
  white-space: nowrap;
}
.body { display: flex; flex-direction: column; justify-content: center; gap: calc(var(--s) * 1); padding: calc(var(--s) * 7) calc(var(--s) * 14); }
.name { color: #ffe27a; font: 700 calc(var(--s) * 16) / 1.1 var(--font-card); }
.gain { font: 400 calc(var(--s) * 19) / 1.2 var(--font-card); }
.gain :deep(strong) { color: #ffb8ec; }
.repeats { display: flex; align-items: center; padding: 0 calc(var(--s) * 11); background: rgb(255 216 74 / 0.16); color: #ffe27a; font: 400 calc(var(--s) * 24) / 1 var(--font-number); }
/* The rival's party is the rival's: the same chyron, dimmed. */
.rival { filter: saturate(0.45) brightness(0.85); }

.notice-enter-active { transition: translate 0.45s cubic-bezier(0.25, 1.4, 0.45, 1), opacity 0.3s; }
.notice-enter-from { translate: calc(var(--s) * 140) 0; opacity: 0; }
.notice-enter-active .tag :deep(.game-icon) { animation: pop 0.6s 0.15s cubic-bezier(0.3, 1.8, 0.5, 1); }
@keyframes pop { 40% { scale: 1.6; rotate: -18deg; } }
/* Read, it slides away and leaves the stack: the newer ones below never move. */
@keyframes notice-away { to { opacity: 0; translate: calc(var(--s) * 60) 0; display: none; } }
@media (prefers-reduced-motion: reduce) {
  .notice-enter-active { transition: opacity 0.3s; }
  .notice-enter-from { translate: 0 0; }
  .notice { animation-name: notice-fade; }
  @keyframes notice-fade { to { opacity: 0; display: none; } }
}
</style>
