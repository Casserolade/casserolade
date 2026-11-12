<script setup lang="ts">
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import HomeChoice from '#src/client/components/molecules/HomeChoice.vue';
import HomeSide from '#src/client/components/molecules/HomeSide.vue';
import SoloForm from '#src/client/components/molecules/SoloForm.vue';

/** Alone at the table, against the machine: the career first, then a quick game. Nothing online. */
const emit = defineEmits<{ solo: [settings: { botLevel: BotLevel; contexte: string }]; story: [] }>();
</script>

<template>
  <HomeSide title="Jeu solo" icon="robot">
    <HomeChoice title="Carrière">
      <p>Sept élections, du canton au second tour.</p>
      <AppButton primary @click="emit('story')">Jouer la carrière</AppButton>
    </HomeChoice>
    <HomeChoice title="Partie rapide">
      <SoloForm class="quick" @start="(settings) => emit('solo', settings)" />
    </HomeChoice>
  </HomeSide>
</template>

<style scoped>
/* The quick game's form fills its card: its button lines up with the career's, at the bottom. */
.quick { flex: 1; }
</style>
