<script setup lang="ts">
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import HeroOption from '#src/client/components/molecules/HeroOption.vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import { HEROES } from '#src/data/heroes.ts';
import { PARAMS } from '#src/data/params.ts';

defineEmits<{ choose: [heroId: string]; leave: [] }>();
</script>

<template>
  <MenuBackdrop>
    <h1>Qui remonte la pente ?</h1>
    <p class="muted lead">Le parti a changé la serrure. Votre politique repart du conseil municipal, et devra gagner sept élections pour revenir au débat de TF1.</p>
    <div class="heroes">
      <HeroOption v-for="hero in HEROES" :key="hero.id" class="hero-pick" :hero="hero" :start-hp="PARAMS.startHp" @click="$emit('choose', hero.id)" />
    </div>
    <AppButton @click="$emit('leave')">Accueil</AppButton>
  </MenuBackdrop>
</template>

<style scoped>
.lead { max-width: 46rem; text-align: center; }
/* Fourteen politicians at a glance: small cards, many per row. */
.heroes { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 0.8rem; width: min(110rem, 96vw); }
.hero-pick { width: auto; padding: 0.8rem 0.7rem; gap: 0.35rem; }
.hero-pick :deep(.arch) { --arch-width: 6rem; }
.hero-pick :deep(.name) { font-size: 1.35rem; }
.hero-pick :deep(.power) { font-size: 1rem; }
.hero-pick :deep(.desc) { font-size: 0.92rem; }
.hero-pick :deep(.polls) { font-size: 1.15rem; }
</style>
