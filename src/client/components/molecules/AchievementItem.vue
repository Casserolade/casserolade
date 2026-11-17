<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { rewardLabel } from '#src/client/tools/rewardLabel.ts';
import type { Succes } from '#src/data/succes.ts';

/** One achievement of the board: its name, what it asks, the title it gives, and whether it was won. */
defineProps<{ item: Succes; won: boolean }>();
</script>

<template>
  <li class="achievement" :class="{ won }">
    <span class="medal" aria-hidden="true"><GameIcon :name="won ? 'star' : 'lock'" /></span>
    <span class="text">
      <strong>{{ item.nom }}<span class="sr-only">{{ won ? ' : obtenu' : ' : pas encore' }}</span></strong>
      <span class="desc">{{ item.description }}</span>
      <span v-if="item.recompense" class="reward">{{ rewardLabel(item.recompense) }}</span>
    </span>
  </li>
</template>

<style scoped>
.achievement { display: flex; align-items: flex-start; gap: 0.6rem; min-width: 0; padding: 0.45rem 0.65rem; border-radius: 12px; border: 1px solid rgb(255 255 255 / 0.12); background: rgb(8 11 24 / 0.88); }
.won { border-color: var(--color-frame); background: linear-gradient(100deg, rgb(60 44 8 / 0.92), rgb(16 16 28 / 0.92)); }
.medal { flex: none; display: grid; place-items: center; width: 1.9rem; height: 1.9rem; border-radius: 50%; background: #2a2f40; color: #6b7385; font-size: 0.95rem; }
.won .medal { background: radial-gradient(circle at 40% 30%, #fff6c4, #f2c230 45%, #9a6a08); color: #fff; }
.text { display: flex; flex-direction: column; gap: 0.05rem; min-width: 0; line-height: 1.2; }
.text strong { color: #9aa0b0; font: 400 1.08rem / 1.1 var(--font-number); letter-spacing: 0.5px; }
.won .text strong { color: #fff; }
.desc { color: #9aa0b0; font-size: 0.86rem; }
.won .desc { color: #e0d8c0; }
.reward { color: #b89a4a; font-size: 0.8rem; font-weight: 700; }
.won .reward { color: var(--color-title); }
</style>
