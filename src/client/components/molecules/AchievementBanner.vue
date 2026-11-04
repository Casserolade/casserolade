<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { rewardLabel } from '#src/client/tools/rewardLabel.ts';
import type { Succes } from '#src/data/succes.ts';

/** The achievements just unlocked, landing one after the other. Nothing to close: they stay on the board. */
defineProps<{ unlocked: Succes[] }>();
</script>

<template>
  <ul v-if="unlocked.length" class="unlocked" aria-live="polite">
    <li v-for="(item, index) in unlocked" :key="item.id" class="item" :style="{ '--i': index }">
      <span class="medal" aria-hidden="true"><GameIcon name="star" /></span>
      <span class="text">
        <span class="kicker">Succès débloqué</span>
        <strong>{{ item.nom }}</strong>
        <span class="desc">{{ item.description }}<template v-if="item.recompense"> · <b>{{ rewardLabel(item.recompense) }}</b></template></span>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.unlocked { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem 1rem; }
.item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  max-width: 28rem;
  padding: 0.5rem 1.2rem 0.5rem 0.6rem;
  border-radius: 18px;
  border: 3px solid #d8b450;
  background: linear-gradient(100deg, rgb(70 52 8 / 0.95), rgb(22 20 30 / 0.95));
  box-shadow: 0 0 26px rgb(255 200 60 / 0.35), 0 10px 26px rgb(0 0 0 / 0.5);
  animation: land 0.6s cubic-bezier(0.3, 1.5, 0.5, 1) backwards;
  animation-delay: calc(0.4s + var(--i) * 0.35s);
}
.medal { flex: none; display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50%; background: radial-gradient(circle at 40% 30%, #fff6c4, #f2c230 45%, #9a6a08); color: #fff; font-size: 1.6rem; box-shadow: 0 0 14px rgb(255 210 60 / 0.8); animation: shine 2.4s ease-in-out infinite; }
.text { display: flex; flex-direction: column; line-height: 1.2; }
.kicker { color: #ffe27a; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
strong { color: #fff; font: 400 1.5rem / 1.05 var(--font-number); letter-spacing: 1px; }
.desc { color: #e0d8c0; font-size: 0.95rem; }
.desc b { color: #ffe27a; }
@keyframes land { from { transform: translateY(-40px) scale(0.6) rotate(-6deg); opacity: 0; } }
@keyframes shine { 50% { filter: brightness(1.3); } }
</style>
