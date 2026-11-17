<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';

/**
 * One seat at a table: who sits there, in a few words, beside the name what ranks them (`rank`), and under them what
 * the host may do to them (`actions`).
 */
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
      <span class="named"><strong>{{ name }}</strong><slot name="rank" /></span>
      <span v-if="note || $slots.default" class="note"><slot />{{ note }}</span>
    </span>
    <span v-if="$slots.actions" class="actions"><slot name="actions" /></span>
  </li>
</template>

<style scoped>
.seat { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.6rem; min-width: 0; padding: 0.4rem 0.6rem; border-radius: 12px; border: 2px solid rgb(255 255 255 / 0.12); background: rgb(5 8 20 / 0.7); }
.me { border-color: var(--color-accent); box-shadow: 0 0 12px rgb(255 197 61 / 0.25); }
.bot, .empty { border-style: dashed; }
.empty { opacity: 0.6; }
.badge { flex: none; display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border-radius: 50%; background: linear-gradient(160deg, #3c4c86, #1a2244); border: 2px solid #9aa3b4; color: #fff; font: 400 1.25rem / 1 var(--font-number); }
.bot .badge { background: #20263a; color: #9aa3b4; font-size: 1.1rem; }
.lit .badge { border-color: #7dff9e; }
.who { flex: 1; display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.named { display: flex; flex-wrap: wrap; align-items: center; gap: 0.15rem 0.45rem; min-width: 0; }
.who strong { overflow: hidden; color: #fff; font-size: 1rem; white-space: nowrap; text-overflow: ellipsis; }
.bot .who strong, .empty .who strong { color: #b8bfcf; }
.note { color: #9aa3b4; font-size: 0.82rem; }
/* What the host may do to this player: a row of its own, under the name, the width of the seat. */
.actions { flex-basis: 100%; }
.lit .note { color: #7dff9e; font-weight: 700; }
</style>
