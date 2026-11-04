<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import AchievementBanner from '#src/client/components/molecules/AchievementBanner.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import type { Chapitre } from '#src/data/histoire/chapitres.ts';
import type { Succes } from '#src/data/succes.ts';
import type { Bilan } from '#src/histoire/campagne.ts';
import { remplir } from '#src/histoire/campagne.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';

/** The election night: elected or beaten, the stars, and what the press says. */
defineProps<{ bilan: Bilan; chapter: Chapitre; heroId: string; bossId: string | null; unlocked: Succes[] }>();
defineEmits<{ next: []; retry: []; leave: [] }>();
</script>

<template>
  <MenuBackdrop :plateau-id="chapter.plateaux.at(-1)">
    <p class="kicker">{{ chapter.election }}</p>
    <h1 class="title" :class="{ won: bilan.reussi }">{{ bilan.reussi ? 'Élu !' : 'Battu' }}</h1>
    <p class="place">{{ bilan.place }}<sup>{{ ordinalSuffix(bilan.place) }}</sup> place<template v-if="!bilan.reussi"> : il fallait finir dans les {{ chapter.placeRequise }} premiers.</template></p>
    <p v-for="line in bilan.lignes" :key="line.texte" class="press">{{ remplir(line.texte, heroId, bossId) }}</p>
    <ul class="stars">
      <li v-for="item in bilan.objectifs" :key="item.texte" :class="{ reached: item.atteint }">
        <GameIcon name="star" /><span>{{ item.texte }}</span>
      </li>
    </ul>
    <AchievementBanner :unlocked="unlocked" />
    <div class="actions">
      <AppButton v-if="bilan.reussi" primary @click="$emit('next')">Élection suivante</AppButton>
      <AppButton :primary="!bilan.reussi" @click="$emit('retry')">Rejouer cette élection</AppButton>
      <AppButton @click="$emit('leave')">Accueil</AppButton>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.kicker { margin-top: 6dvh; color: #c9cfdc; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
.title { margin-top: -0.6rem; color: #fff; font-size: 4.4rem; rotate: -2deg; }
.won { color: #ffd84a; }
.place { color: #fff; font-size: 1.4rem; font-weight: 700; }
.place sup { font-size: 0.6em; }
.press { max-width: 44rem; padding: 0.8rem 1.4rem; border-radius: 18px; background: #fffbe8; color: var(--color-ink); font-size: 1.2rem; line-height: 1.35; text-align: center; box-shadow: 6px 8px 0 rgb(0 0 0 / 0.35); rotate: -0.6deg; }
.stars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.stars li { display: flex; align-items: center; gap: 0.6rem; color: #8a90a2; font-size: 1.1rem; }
.stars :deep(.game-icon) { font-size: 1.6rem; color: #3a4054; }
.stars .reached { color: #fff; }
.stars .reached :deep(.game-icon) { color: #ffd84a; filter: drop-shadow(0 0 6px rgb(255 216 74 / 0.8)); }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
</style>
