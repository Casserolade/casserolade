<script setup lang="ts">
import { computed } from 'vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import MobileSheet from '#src/client/components/molecules/MobileSheet.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { boldGlossaryTerms, glossaryFor } from '#src/client/tools/glossaryFor.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';

/** Your hero on the phone, opened from the bar: its power, the words of the game in bold and explained under it. */
const props = withDefaults(defineProps<{ heroId: string; powerNote?: string | null }>(), { powerNote: null });
const emit = defineEmits<{ close: [] }>();

const hero = computed(() => HERO_BY_ID[props.heroId]);
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.heroId, 'civile'));
const powerText = computed(() => boldGlossaryTerms(props.powerNote ?? hero.value?.desc ?? ''));
const entries = computed(() => glossaryFor([powerText.value]));
</script>

<template>
  <MobileSheet label="Votre héros" @close="emit('close')">
    <div class="hero">
      <HeadPortrait class="face" :puppet="puppet" />
      <h3>{{ hero?.name }}</h3>
      <strong class="power">{{ hero?.power }}</strong>
      <RichText class="text" :text="powerText" />
      <dl v-if="entries.length" class="glossary">
        <template v-for="entry in entries" :key="entry.term"><dt>{{ entry.term }}</dt><dd>{{ entry.rule }}</dd></template>
      </dl>
    </div>
  </MobileSheet>
</template>

<style scoped>
.hero { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom)); overflow-y: auto; text-align: center; }
.face { --portrait-size: 96px; border: 4px solid #9aa3b4; border-radius: 50%; background: #1b2240; }
h3 { margin: 0; color: var(--color-title); font: 400 1.7rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; }
.power { color: #fff; font: 400 1.2rem / 1.1 var(--font-number); letter-spacing: 1px; }
.text { font-size: 1.05rem; line-height: 1.35; }
.text :deep(strong) { color: var(--color-title); }
.glossary { width: 100%; margin: 0.4rem 0 0; padding: 0.7rem 0.9rem; border-radius: 14px; background: rgb(12 14 24 / 0.94); text-align: left; }
dt { color: var(--color-accent); font: 800 1rem / 1.1 var(--font-card-title); }
dd { margin: 0 0 0.5rem; font-size: 0.95rem; line-height: 1.3; }
dd:last-child { margin-bottom: 0; }
</style>
