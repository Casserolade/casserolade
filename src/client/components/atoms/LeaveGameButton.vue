<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import RoundButton from '#src/client/components/atoms/RoundButton.vue';

/** Unanswered, the question goes away by itself: nothing to close. */
const ASK_MS = 5000;

/**
 * Leaving a game in progress: a door in the corner of the table. One press asks, a second one leaves;
 * nothing pops up, and nothing waits for an answer. Sized by --leave-size on a parent.
 */
const emit = defineEmits<{ leave: [] }>();

const asking = ref(false);
let timer = 0;

function ask(): void {
  asking.value = true;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => (asking.value = false), ASK_MS);
}

function stay(): void {
  window.clearTimeout(timer);
  asking.value = false;
}

function leave(): void {
  window.clearTimeout(timer);
  emit('leave');
}

onUnmounted(() => window.clearTimeout(timer));
</script>

<template>
  <div class="leave-game" :class="{ asking }">
    <template v-if="asking">
      <span class="question" role="status">Quitter la partie ?</span>
      <button type="button" class="answer yes" @click="leave">Oui, quitter</button>
      <button type="button" class="answer" @click="stay">Non</button>
    </template>
    <RoundButton v-else class="door" icon="exit" label="Quitter la partie" @click="ask" />
  </div>
</template>

<style scoped>
.leave-game { --size: var(--leave-size, 3.2rem); display: flex; align-items: center; justify-content: flex-end; gap: calc(var(--size) * 0.15); height: var(--size); pointer-events: auto; }
/* The door is the corner's round button, with a slightly smaller icon. */
.door { --icon-share: 0.5; }
.answer:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
.question { padding: calc(var(--size) * 0.12) calc(var(--size) * 0.3); border-radius: 999px; background: rgb(10 12 22 / 0.92); color: #fff; font: 700 calc(var(--size) * 0.36) / 1.1 var(--font-card); white-space: nowrap; }
.answer {
  height: calc(var(--size) * 0.8);
  padding: 0 calc(var(--size) * 0.3);
  border-radius: 999px;
  border: calc(var(--size) * 0.05) solid #d8b450;
  background: linear-gradient(#2e3f74, #141c3c);
  color: #fff;
  font: 400 calc(var(--size) * 0.4) / 1 var(--font-number);
  letter-spacing: 1px;
  white-space: nowrap;
  cursor: pointer;
}
.yes { background: linear-gradient(#e0503a, #8a1a10); }
.answer:hover { filter: brightness(1.15); }
</style>
