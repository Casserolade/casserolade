<script setup lang="ts">
import { onUnmounted, ref } from 'vue';

/** Unanswered, the question goes away by itself: nothing to close. */
const ASK_MS = 4000;

/**
 * What a room's host may do to one of its players, at any time: mute its chat, or give it back, and put it out of
 * the room. Putting out asks once: a second press does it, and the question goes away by itself.
 */
defineProps<{ pseudo: string; muted: boolean }>();
const emit = defineEmits<{ mute: [muted: boolean]; kick: [] }>();

const asking = ref(false);
let timer = 0;

function kickOrAsk(): void {
  window.clearTimeout(timer);
  if (asking.value) {
    asking.value = false;
    emit('kick');
    return;
  }
  asking.value = true;
  timer = window.setTimeout(() => (asking.value = false), ASK_MS);
}

onUnmounted(() => window.clearTimeout(timer));
</script>

<template>
  <span class="moderation">
    <button type="button" class="act" :class="{ on: muted }" :aria-label="muted ? `Rendre le chat à ${pseudo}` : `Couper le chat de ${pseudo}`" @click="emit('mute', !muted)">{{ muted ? 'Rendre le chat' : 'Couper le chat' }}</button>
    <button type="button" class="act out" :class="{ asking }" :aria-label="asking ? `Confirmer : exclure ${pseudo} du salon` : `Exclure ${pseudo} du salon`" @click="kickOrAsk">{{ asking ? 'Confirmer ?' : 'Exclure' }}</button>
  </span>
</template>

<style scoped>
.moderation { display: inline-flex; flex-wrap: wrap; gap: 0.35em; font-size: var(--moderation-size, 0.82rem); }
.act { padding: 0.15em 0.65em; border-radius: 999px; border: 2px solid var(--color-border); background: rgb(5 8 20 / 0.75); color: var(--color-text); font: inherit; font-weight: 700; line-height: 1.3; white-space: nowrap; cursor: pointer; }
.act:hover { border-color: var(--color-text-muted); filter: brightness(1.2); }
.act:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 2px; }
/* A muted chat: the button that gives it back is filled, and says so. */
.on { border-color: var(--color-accent); background: var(--color-accent); color: var(--color-accent-text); }
.out { border-color: var(--color-danger); }
.asking { background: var(--color-danger); color: var(--color-ink); }
</style>
