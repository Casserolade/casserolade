<script setup lang="ts">
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import HomeChoice from '#src/client/components/molecules/HomeChoice.vue';
import HomeSide from '#src/client/components/molecules/HomeSide.vue';
import SoloForm from '#src/client/components/molecules/SoloForm.vue';

/** Alone at the table, against the machine: a quick game, or the career. Nothing online. */
defineProps<{ highlighted?: boolean }>();
const emit = defineEmits<{ solo: [settings: { botLevel: BotLevel; contexte: string }]; story: [] }>();
</script>

<template>
  <HomeSide title="Local · 1 joueur" icon="robot" :highlighted="highlighted">
    <HomeChoice title="Partie rapide">
      <p>Une partie tout de suite, contre des politiques pilotés par la machine.</p>
      <SoloForm @start="(settings) => emit('solo', settings)" />
    </HomeChoice>
    <HomeChoice title="Carrière">
      <p>Un politique, sept élections, du canton au second tour. Chacune a sa règle spéciale.</p>
      <AppButton primary @click="emit('story')">Jouer la carrière</AppButton>
    </HomeChoice>
  </HomeSide>
</template>
