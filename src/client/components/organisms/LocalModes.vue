<script setup lang="ts">
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import HomeSide from '#src/client/components/molecules/HomeSide.vue';
import SoloForm from '#src/client/components/molecules/SoloForm.vue';

/**
 * Alone at the table, against the machine, in two panels: the career first, a line and its button; then a quick
 * game, its two settings and what launches it. Nothing online.
 */
const emit = defineEmits<{ solo: [settings: { botLevel: BotLevel; contexte: string }]; story: [] }>();
</script>

<template>
  <div class="local-modes">
    <HomeSide title="Carrière" icon="column" :columns="1">
      <template #aside><AppButton class="far" @click="emit('story')">Jouer</AppButton></template>
      <p class="pitch">Sept élections, du canton au second tour.</p>
    </HomeSide>
    <HomeSide class="quick" title="Partie rapide" icon="robot" :columns="1">
      <template #aside><span class="far kind">Solo, contre des bots</span></template>
      <SoloForm @start="(settings) => emit('solo', settings)" />
    </HomeSide>
  </div>
</template>

<style scoped>
.local-modes { display: flex; flex-direction: column; gap: 0.7rem; min-width: 0; }
/* The quick game takes the height left: its button sits at the bottom, level with the online side's. */
.quick { flex: 1; }
/* Beside a title, at the far end of its line. */
.far { margin-left: auto; }
.pitch { margin: 0; color: #c9cfdc; font-size: 0.92rem; line-height: 1.3; }
.kind { color: var(--color-text-muted); font-size: 0.86rem; font-weight: 700; }
</style>
