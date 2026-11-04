<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import AchievementBanner from '#src/client/components/molecules/AchievementBanner.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import type { Succes } from '#src/data/succes.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';

/** The end of the tutorial: the career is next, or another go if a step was missed. */
defineProps<{ place: number | null; learned: boolean; unlocked: Succes[] }>();
defineEmits<{ career: []; again: []; leave: [] }>();
</script>

<template>
  <MenuBackdrop plateau-id="france3">
    <h1 class="title">{{ learned ? 'Tutoriel réussi' : 'Partie finie' }}</h1>
    <p class="lead">
      <template v-if="place">Vous finissez à la {{ place }}<sup>{{ ordinalSuffix(place) }}</sup> place. </template>
      <template v-if="learned">Vous savez tout : acheter, poser, monter, lancer un sort, encaisser un scandale et attendre que le peuple oublie.</template>
      <template v-else>Il restait des choses à voir. Une autre partie guidée ?</template>
    </p>
    <AchievementBanner :unlocked="unlocked" />
    <div class="actions">
      <AppButton v-if="learned" primary @click="$emit('career')">Jouer la carrière</AppButton>
      <AppButton :primary="!learned" @click="$emit('again')">Rejouer le tutoriel</AppButton>
      <AppButton @click="$emit('leave')">Accueil</AppButton>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.title { margin-top: 12dvh; font-size: 3.6rem; rotate: -2deg; }
.lead { max-width: 40rem; color: #e8eaf0; font-size: 1.3rem; line-height: 1.35; text-align: center; }
.lead sup { font-size: 0.6em; }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
</style>
