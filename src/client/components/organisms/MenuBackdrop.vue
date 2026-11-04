<script setup lang="ts">
import { computed } from 'vue';
import StudioLife from '#src/client/components/atoms/StudioLife.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';

/** The screens around a game: the TV set of the final debate behind, blurred, and the page on top of it. */
const props = withDefaults(defineProps<{ plateauId?: string }>(), { plateauId: 'tf1_second_tour' });

const decor = computed(() => cssImage(gameArt.manifest.value.plateaux[props.plateauId]?.decor));
</script>

<template>
  <div class="menu">
    <div class="decor" :style="{ backgroundImage: decor }" aria-hidden="true" />
    <StudioLife :plateau-id="plateauId" />
    <div class="shade" aria-hidden="true" />
    <main class="page"><slot /></main>
  </div>
</template>

<style scoped>
.menu { position: fixed; inset: 0; overflow-y: auto; isolation: isolate; background: #0b0e18; }
.decor { position: fixed; inset: -2%; z-index: -3; background: center / cover no-repeat; filter: blur(6px) brightness(0.5) saturate(1.2); }
.menu :deep(.life) { position: fixed; z-index: -2; }
.shade { position: fixed; inset: 0; z-index: -1; background: radial-gradient(ellipse at 50% 30%, transparent 30%, rgb(4 6 14 / 0.75) 100%); }
:where(.page) :deep(:where(h1)) { color: #ffe27a; font: 400 2.8rem / 1.05 var(--font-number); letter-spacing: 2px; -webkit-text-stroke: 7px var(--color-ink); paint-order: stroke fill; text-align: center; }
:where(.page) :deep(:where(h2)) { color: #fff; font: 400 1.7rem / 1.1 var(--font-number); letter-spacing: 1px; }
:where(.page) :deep(:where(.muted)) { color: #c9cfdc; }
.page { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1.6rem; max-width: 1400px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
</style>
