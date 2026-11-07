<script setup lang="ts">
import { computed } from 'vue';
import StudioScreen from '#src/client/components/molecules/StudioScreen.vue';
import { DEFAULT_STUDIO_LOOK, STUDIO_LOOKS } from '#src/client/const/studioLights.ts';
import { DEFAULT_STUDIO_SCREENS, STUDIO_SCREENS } from '#src/client/const/studioScreens.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { studioShock } from '#src/client/stores/studioShock.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { screenFaces } from '#src/client/tools/screenFaces.ts';
import { screenPlacement } from '#src/client/tools/screenPlacement.ts';

/**
 * The set's television screens, over its own signs (studioScreens.ts): the candidates' faces, live, glitching with the
 * combat's big shocks. Drawn in the set's pixels, scaled like the set (--k, GameTable.vue).
 */
const props = defineProps<{ plateauId: string; faces: string[] }>();

const spots = computed(() => STUDIO_SCREENS[props.plateauId] ?? DEFAULT_STUDIO_SCREENS);
const accent = computed(() => (STUDIO_LOOKS[props.plateauId] ?? DEFAULT_STUDIO_LOOK).colors[0]);
const puppets = computed(() => props.faces.map((id) => puppetStyle(gameArt.manifest.value, id, 'civile')).filter((style) => style['--atlas-image']));
const shocks = computed(() => studioShock.last.value.count);
</script>

<template>
  <div v-if="puppets.length" class="screens" aria-hidden="true">
    <StudioScreen
      v-for="(spot, index) in spots"
      :key="`${plateauId}-${index}`"
      class="spot"
      :style="screenPlacement(spot)"
      :faces="screenFaces(puppets, spots.length, index)"
      :shocks="shocks"
      :accent="accent"
    />
  </div>
</template>

<style scoped>
.screens { position: absolute; inset: 0; pointer-events: none; perspective: calc(var(--k) * 2400); }
.spot { translate: -50% -50%; transform: rotateY(var(--turn)); }
</style>
