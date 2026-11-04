<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';

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
    <button v-else type="button" class="door" aria-label="Quitter la partie" title="Quitter la partie" @click="ask"><GameIcon name="exit" /></button>
  </div>
</template>

<style scoped>
.leave-game { --size: var(--leave-size, 3.2rem); display: flex; align-items: center; justify-content: flex-end; gap: calc(var(--size) * 0.15); height: var(--size); pointer-events: auto; }
.door {
  width: var(--size);
  height: var(--size);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: calc(var(--size) * 0.06) solid #d8b450;
  background: radial-gradient(circle at 40% 30%, #4a64a8, #16204a 70%);
  box-shadow: 0 calc(var(--size) * 0.07) calc(var(--size) * 0.15) rgb(0 0 0 / 0.6);
  color: #fff;
  font-size: calc(var(--size) * 0.5);
  cursor: pointer;
  transition: transform 0.1s, filter 0.1s;
}
.door:hover { transform: scale(1.06); filter: brightness(1.2); }
.door:focus-visible, .answer:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
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
