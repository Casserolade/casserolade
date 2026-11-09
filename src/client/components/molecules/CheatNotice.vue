<script setup lang="ts">
/** A word, for a moment, at the top of the page: the code was taken. Nothing to close. */
defineProps<{ text: string }>();
</script>

<template>
  <Transition name="notice" appear>
    <p class="cheat-notice" role="status">{{ text }}</p>
  </Transition>
</template>

<style scoped>
.cheat-notice {
  position: fixed;
  z-index: 90;
  top: 1rem;
  left: 50%;
  translate: -50% 0;
  margin: 0;
  padding: 0.5rem 1.2rem;
  border: 3px solid #d8b450;
  border-radius: 999px;
  background: #141c3c;
  color: #ffe27a;
  font: 400 1.3rem / 1.1 var(--font-number);
  letter-spacing: 1px;
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.55);
  pointer-events: none;
}
.notice-enter-active { animation: notice-in 0.3s cubic-bezier(0.3, 1.4, 0.5, 1); }
.notice-leave-active { animation: notice-in 0.2s ease-in reverse; }
@keyframes notice-in { from { opacity: 0; transform: translateY(-120%); } }
</style>
