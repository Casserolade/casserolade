<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import HeroOption from '#src/client/components/molecules/HeroOption.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { HEROES, HERO_BY_ID } from '#src/data/heroes.ts';
import { PARAMS } from '#src/data/params.ts';
import { CARRIERES, CARRIERE_PAR_HEROS } from '#src/histoire/carrieres.ts';

/**
 * Who to play. Those who have their own career come first: their real moments, their nemesis, their scenes. The
 * others climb the generic ladder, from the town council to TF1. The career invents, and says so once, here.
 */
defineEmits<{ choose: [heroId: string]; leave: [] }>();

const careers = [...CARRIERES].sort((a, b) => a.difficulte - b.difficulte);
const others = HEROES.filter((hero) => !CARRIERE_PAR_HEROS[hero.id]);
</script>

<template>
  <MenuBackdrop>
    <h1>Qui remonte la pente ?</h1>
    <section class="careers" aria-labelledby="careers-title">
      <h2 id="careers-title">Les carrières</h2>
      <p class="fiction">
        Contrairement au reste du jeu, ici on invente. Chaque carrière part de faits vrais, puis tout déraille : les scènes,
        les répliques et les destins sont de la fiction. Toute ressemblance avec des personnes existantes est, pour une fois,
        en partie fortuite.
      </p>
      <div class="heroes">
        <div v-for="career in careers" :key="career.heros" class="career">
          <HeroOption class="hero-pick" :hero="HERO_BY_ID[career.heros]" :start-hp="PARAMS.startHp" @click="$emit('choose', career.heros)" />
          <p class="pitch">{{ career.accroche }}</p>
          <p class="level">Difficulté {{ career.difficulte }} sur 5 · face à {{ HERO_BY_ID[career.boss]?.name }}</p>
        </div>
      </div>
    </section>
    <section aria-labelledby="others-title">
      <h2 id="others-title">Les autres candidats</h2>
      <p class="muted lead">Le parti a changé la serrure. Votre politique repart du conseil municipal, et devra gagner sept élections pour revenir au débat de TF1.</p>
      <div class="heroes">
        <HeroOption v-for="hero in others" :key="hero.id" class="hero-pick" :hero="hero" :start-hp="PARAMS.startHp" @click="$emit('choose', hero.id)" />
      </div>
    </section>
    <AppButton @click="$emit('leave')">Accueil</AppButton>
  </MenuBackdrop>
</template>

<style scoped>
section { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; }
h2 { margin: 0.6rem 0 0; }
.lead { max-width: 46rem; text-align: center; }
.fiction { max-width: 46rem; margin: 0; padding: 0.7rem 1rem; border: 3px dashed var(--color-accent); border-radius: 0.8rem; text-align: center; font-style: italic; }
/* Many politicians at a glance: small cards, many per row. */
.heroes { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 0.8rem; width: min(110rem, 96vw); }
.career { display: flex; flex-direction: column; gap: 0.3rem; }
.career .pitch { margin: 0; font-style: italic; text-align: center; }
.career .level { margin: 0; font-size: 0.9rem; text-align: center; opacity: 0.85; }
.hero-pick { width: auto; padding: 0.8rem 0.7rem; gap: 0.35rem; }
.hero-pick :deep(.arch) { --arch-width: 6rem; }
.hero-pick :deep(.name) { font-size: 1.35rem; }
.hero-pick :deep(.power) { font-size: 1rem; }
.hero-pick :deep(.desc) { font-size: 0.92rem; }
.hero-pick :deep(.polls) { font-size: 1.15rem; }
</style>
