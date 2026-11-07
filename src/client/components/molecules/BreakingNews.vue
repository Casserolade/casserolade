<script setup lang="ts">
/**
 * The news channel's banner, as BFM runs it: a red « ALERTE INFO » block, and the news on a white strip. It slides in
 * at the foot of the screen; nothing to close, it goes with the combat.
 */
defineProps<{ news: string }>();
</script>

<template>
  <p class="breaking" role="status">
    <strong class="label">Alerte info</strong>
    <span class="news">{{ news }}</span>
  </p>
</template>

<style scoped>
.breaking {
  display: flex;
  align-items: stretch;
  margin: 0;
  filter: drop-shadow(0 calc(var(--s) * 8) calc(var(--s) * 18) rgb(0 0 0 / 0.55));
  animation: slide-in 0.5s cubic-bezier(0.2, 1.3, 0.4, 1);
}
.label {
  display: flex;
  align-items: center;
  padding: calc(var(--s) * 10) calc(var(--s) * 24);
  background: linear-gradient(#e8202e, #b8101c);
  color: #fff;
  font: 900 calc(var(--s) * 30) / 1 var(--font-card-title);
  letter-spacing: calc(var(--s) * 1);
  text-transform: uppercase;
  white-space: nowrap;
  animation: label-blink 1s steps(1) infinite;
}
.news {
  display: flex;
  align-items: center;
  padding: calc(var(--s) * 10) calc(var(--s) * 26);
  background: #ffffff;
  color: #10131c;
  font: 800 calc(var(--s) * 28) / 1.15 var(--font-card);
  text-transform: uppercase;
}
@keyframes slide-in { from { translate: -120% 0; } }
@keyframes label-blink { 50% { background: linear-gradient(#ff3a48, #d81826); } }
@media (prefers-reduced-motion: reduce) {
  .breaking, .label { animation: none; }
}
</style>
