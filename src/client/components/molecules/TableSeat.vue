<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';

/** One seat at a table that has not started: who sits there, in a few words. */
withDefaults(defineProps<{
  name: string;
  /** Under the name: host, you, disconnected, a vote… */
  note?: string;
  kind?: 'human' | 'bot' | 'empty';
  me?: boolean;
  /** Lit up: a yes vote, a connected host. */
  lit?: boolean;
}>(), { note: '', kind: 'human', me: false, lit: false });
</script>

<template>
  <li class="seat" :class="[kind, { me, lit }]">
    <span class="badge" aria-hidden="true">
      <GameIcon v-if="kind === 'bot'" name="robot" />
      <GameIcon v-else-if="kind === 'empty'" name="people" />
      <template v-else>{{ name.charAt(0).toUpperCase() }}</template>
    </span>
    <span class="who">
      <strong>{{ name }}</strong>
      <span v-if="note || $slots.default" class="note"><slot />{{ note }}</span>
    </span>
  </li>
</template>

<style scoped>
.seat { display: flex; align-items: center; gap: 0.7rem; min-width: 0; padding: 0.55rem 0.8rem; border-radius: 16px; border: 3px solid rgb(255 255 255 / 0.12); background: rgb(5 8 20 / 0.7); }
.me { border-color: var(--color-accent); box-shadow: 0 0 18px rgb(255 197 61 / 0.3); }
.bot, .empty { border-style: dashed; }
.empty { opacity: 0.6; }
.badge { flex: none; display: grid; place-items: center; width: 2.8rem; height: 2.8rem; border-radius: 50%; background: linear-gradient(160deg, #3c4c86, #1a2244); border: 3px solid #9aa3b4; color: #fff; font: 400 1.6rem / 1 var(--font-number); }
.bot .badge { background: #20263a; color: #9aa3b4; font-size: 1.4rem; }
.lit .badge { border-color: #7dff9e; }
.who { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.who strong { overflow: hidden; color: #fff; font-size: 1.1rem; white-space: nowrap; text-overflow: ellipsis; }
.bot .who strong, .empty .who strong { color: #b8bfcf; }
.note { color: #9aa3b4; font-size: 0.9rem; }
.lit .note { color: #7dff9e; font-weight: 700; }
</style>
