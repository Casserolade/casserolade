<script setup lang="ts">
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HomeChoice from '#src/client/components/molecules/HomeChoice.vue';
import HomeSide from '#src/client/components/molecules/HomeSide.vue';
import SoloForm from '#src/client/components/molecules/SoloForm.vue';

/**
 * Alone at the table, against the machine: the career first, which the tutorial opens, then a quick game. Nothing
 * online. For a newcomer, the tutorial is the button that shines.
 */
withDefaults(defineProps<{ newcomer?: boolean }>(), { newcomer: false });
const emit = defineEmits<{ solo: [settings: { botLevel: BotLevel; contexte: string }]; story: []; tutorial: [] }>();
</script>

<template>
  <HomeSide title="Jeu solo" icon="robot">
    <HomeChoice title="Carrière">
      <p>Sept élections, du canton au second tour.</p>
      <div class="stack">
        <AppButton :primary="!newcomer" @click="emit('story')">Jouer la carrière</AppButton>
        <AppButton :primary="newcomer" :class="{ beckon: newcomer }" @click="emit('tutorial')"><GameIcon name="sparkle" /> Le tutoriel</AppButton>
      </div>
    </HomeChoice>
    <HomeChoice title="Partie rapide">
      <SoloForm @start="(settings) => emit('solo', settings)" />
    </HomeChoice>
  </HomeSide>
</template>

<style scoped>
.beckon { animation: beckon 1.6s ease-in-out infinite; }
@keyframes beckon { 50% { transform: scale(1.06); box-shadow: 0 0 26px rgb(255 216 74 / 0.7), 0 5px 12px rgb(0 0 0 / 0.5); } }
@media (prefers-reduced-motion: reduce) { .beckon { animation: none; } }
</style>
