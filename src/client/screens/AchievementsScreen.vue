<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { achievements } from '#src/client/stores/achievements.ts';
import { rewardLabel } from '#src/client/tools/rewardLabel.ts';
import { SUCCES } from '#src/data/succes.ts';

/** The achievements board: all of them, won or not, what they give, and the title to show. */
defineEmits<{ leave: [] }>();

const { progress, earnedTitles, title } = achievements;
const board = computed(() => SUCCES.map((item) => ({ ...item, won: progress.value.obtenus.includes(item.id) })));
const wonCount = computed(() => board.value.filter((item) => item.won).length);
</script>

<template>
  <MenuBackdrop>
    <h1 class="title">Succès</h1>
    <ul class="facts">
      <li><strong>{{ wonCount }}</strong> sur {{ SUCCES.length }}</li>
      <li><strong>{{ progress.parties }}</strong> {{ progress.parties > 1 ? 'parties' : 'partie' }}</li>
      <li><strong>{{ progress.victoires }}</strong> {{ progress.victoires > 1 ? 'victoires' : 'victoire' }}</li>
    </ul>

    <section class="panel titles" aria-labelledby="titles-heading">
      <h2 id="titles-heading">Votre titre</h2>
      <p v-if="earnedTitles.length === 0" class="muted">Aucun titre pour l'instant : certains succès en donnent un, affiché à côté de votre pseudo.</p>
      <div v-else class="choices" role="group" aria-label="Titre affiché">
        <AppButton :pressed="title === null" @click="achievements.chooseTitle(null)">Aucun</AppButton>
        <AppButton v-for="earned in earnedTitles" :key="earned" :pressed="title === earned" @click="achievements.chooseTitle(earned)">« {{ earned }} »</AppButton>
      </div>
    </section>

    <ol class="board">
      <li v-for="item in board" :key="item.id" class="item" :class="{ won: item.won }">
        <span class="medal" aria-hidden="true"><GameIcon :name="item.won ? 'star' : 'lock'" /></span>
        <span class="text">
          <strong>{{ item.nom }}<span class="sr-only">{{ item.won ? ' : obtenu' : ' : pas encore' }}</span></strong>
          <span class="desc">{{ item.description }}</span>
          <span v-if="item.recompense" class="reward">{{ rewardLabel(item.recompense) }}</span>
        </span>
      </li>
    </ol>
    <p class="muted note">Les succès se gagnent en solo, au tutoriel et en carrière, et restent dans ce navigateur. En ligne, tout le monde joue à armes égales.</p>
    <AppButton @click="$emit('leave')">Accueil</AppButton>
  </MenuBackdrop>
</template>

<style scoped>
.title { font-size: 3.4rem; rotate: -1.5deg; }
.facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.7rem; }
.facts li { padding: 0.35rem 1.1rem; border-radius: 999px; border: 3px solid rgb(255 255 255 / 0.14); background: rgb(12 16 32 / 0.92); color: #c9cfdc; }
.facts strong { color: #ffe27a; font: 400 1.7rem / 1 var(--font-number); letter-spacing: 1px; }
.panel { width: min(1200px, 94vw); padding: 1rem 1.3rem; border-radius: 22px; border: 3px solid rgb(255 255 255 / 0.14); background: linear-gradient(rgb(22 30 58 / 0.94), rgb(11 15 32 / 0.94)); }
.panel h2 { margin-bottom: 0.6rem; }
.choices { display: flex; flex-wrap: wrap; gap: 0.6rem; }
.choices :deep(.app-button) { font-size: 1.15rem; }
.board { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 0.7rem; width: min(1200px, 94vw); }
.item { display: flex; align-items: flex-start; gap: 0.8rem; padding: 0.7rem 0.9rem; border-radius: 18px; border: 3px solid rgb(255 255 255 / 0.1); background: rgb(8 11 24 / 0.88); }
.item.won { border-color: #d8b450; background: linear-gradient(100deg, rgb(60 44 8 / 0.92), rgb(16 16 28 / 0.92)); box-shadow: 0 0 18px rgb(255 200 60 / 0.2); }
.medal { flex: none; display: grid; place-items: center; width: 2.8rem; height: 2.8rem; border-radius: 50%; background: #2a2f40; color: #6b7385; font-size: 1.3rem; }
.won .medal { background: radial-gradient(circle at 40% 30%, #fff6c4, #f2c230 45%, #9a6a08); color: #fff; box-shadow: 0 0 12px rgb(255 210 60 / 0.7); }
.text { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; line-height: 1.2; }
.text strong { color: #8a90a2; font: 400 1.35rem / 1.05 var(--font-number); letter-spacing: 1px; }
.won .text strong { color: #fff; }
.desc { color: #9aa0b0; font-size: 0.95rem; }
.won .desc { color: #e0d8c0; }
.reward { color: #b89a4a; font-size: 0.9rem; font-weight: 700; }
.won .reward { color: #ffe27a; }
.note { max-width: 46rem; text-align: center; }
</style>
