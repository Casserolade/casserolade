<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import RankBadge from '#src/client/components/atoms/RankBadge.vue';
import AchievementItem from '#src/client/components/molecules/AchievementItem.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { achievements } from '#src/client/stores/achievements.ts';
import { achievementShelves } from '#src/client/tools/achievementShelves.ts';
import { SUCCES } from '#src/data/succes.ts';

/**
 * The achievements board: all of them, shelf by shelf, won or not, what they give, and the title to show. There
 * are many, and they are hard: the board scrolls. The rank in the rooms heads it (`rating`, null before a first game
 * against another human).
 */
withDefaults(defineProps<{ rating?: number | null }>(), { rating: null });
defineEmits<{ leave: [] }>();

const { progress, earnedTitles, title } = achievements;
const shelves = computed(() => achievementShelves(progress.value.obtenus));
const shownTitle = computed<string>({
  get: () => title.value ?? '',
  set: (next) => achievements.chooseTitle(next || null),
});
</script>

<template>
  <MenuBackdrop fitted>
    <header class="top">
      <h1 class="title">Succès</h1>
      <RankBadge v-if="rating !== null" class="rank" :mmr="rating" detailed />
      <ul class="facts">
        <li><strong>{{ progress.obtenus.length }}</strong> sur {{ SUCCES.length }}</li>
        <li><strong>{{ progress.parties }}</strong> {{ progress.parties > 1 ? 'parties' : 'partie' }}</li>
        <li><strong>{{ progress.victoires }}</strong> {{ progress.victoires > 1 ? 'victoires' : 'victoire' }}</li>
        <li><strong>{{ progress.victoiresEnLigne }}</strong> en ligne</li>
      </ul>
      <label class="shown-title">
        Votre titre
        <select v-model="shownTitle" :disabled="earnedTitles.length === 0">
          <option value="">{{ earnedTitles.length === 0 ? 'Aucun titre gagné' : 'Aucun' }}</option>
          <option v-for="earned in earnedTitles" :key="earned" :value="earned">« {{ earned }} »</option>
        </select>
      </label>
      <AppButton class="back" @click="$emit('leave')">Accueil</AppButton>
    </header>
    <p class="note">Ils se gagnent en partie rapide, en carrière et en ligne, et restent dans ce navigateur. Ils ne donnent que des titres, à afficher à côté de votre pseudo.</p>

    <section v-for="shelf in shelves" :key="shelf.id" class="shelf" :aria-labelledby="`shelf-${shelf.id}`">
      <h2 :id="`shelf-${shelf.id}`">{{ shelf.name }} <span class="count">{{ shelf.wonCount }} / {{ shelf.items.length }}</span></h2>
      <ol class="items">
        <AchievementItem v-for="item in shelf.items" :key="item.id" :item="item" :won="item.won" />
      </ol>
    </section>
  </MenuBackdrop>
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem 1.2rem; width: min(86rem, 96vw); }
.title { font-size: 2.2rem; -webkit-text-stroke: 5px var(--color-ink); }
.facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; }
.facts li { padding: 0.15rem 0.8rem; border-radius: 999px; border: 1px solid rgb(255 255 255 / 0.16); background: rgb(12 16 32 / 0.92); color: #c9cfdc; font-size: 0.92rem; }
.facts strong { color: var(--color-title); font: 400 1.2rem / 1 var(--font-number); letter-spacing: 1px; }
.shown-title { flex-direction: row; align-items: center; gap: 0.6rem; font-size: 0.92rem; }
.shown-title select { max-width: 18rem; padding-block: 0.25rem; }
.back.app-button { padding: 0.36em 0.95em; border-width: 2px; font-size: 1.05rem; }
.rank { font-size: 0.95rem; }
.note { margin: -1rem 0 -0.6rem; max-width: 60rem; color: var(--color-text-muted); font-size: 0.9rem; text-align: center; text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
.shelf { display: flex; flex-direction: column; gap: 0.5rem; width: min(86rem, 96vw); margin-bottom: -0.6rem; padding: 0.7rem 0.9rem 0.9rem; border-radius: 16px; border: 2px solid rgb(255 255 255 / 0.14); background: var(--panel-background); box-shadow: var(--panel-shadow); }
h2 { color: #fff; font: 400 1.35rem / 1 var(--font-number); letter-spacing: 1px; }
.count { margin-left: 0.4rem; color: var(--color-title); font-size: 0.8em; }
.items { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 0.45rem; }
</style>
