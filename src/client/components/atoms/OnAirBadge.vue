<script setup lang="ts">
/** « En direct », in red as on a news channel: what is on screen is someone else's game, live. */
</script>

<template>
  <b class="on-air">En direct</b>
</template>

<style scoped>
.on-air { flex: none; padding: calc(var(--s) * 2) calc(var(--s) * 10); border-radius: calc(var(--s) * 8); background: #e0182c; color: #fff; font: 400 calc(var(--s) * 22) / 1.1 var(--font-number); letter-spacing: calc(var(--s) * 1); animation: on-air 1.4s ease-in-out infinite; }
@keyframes on-air { 50% { opacity: 0.65; } }
@media (prefers-reduced-motion: reduce) { .on-air { animation: none; } }
</style>
