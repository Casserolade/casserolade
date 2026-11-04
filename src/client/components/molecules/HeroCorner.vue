<script setup lang="ts">
import { computed } from 'vue';
import ArchPortrait from '#src/client/components/atoms/ArchPortrait.vue';
import PollsBadge from '#src/client/components/atoms/PollsBadge.vue';
import RichText from '#src/client/components/atoms/RichText.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { boldGlossaryTerms, glossaryFor } from '#src/client/tools/glossaryFor.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';

/** A hero in its niche, with its polls. Its power is told on hover only: nothing to read while playing. */
const props = withDefaults(defineProps<{ heroId: string; hp: number; startHp: number; powerNote?: string | null; showPower?: boolean }>(), { powerNote: null, showPower: true });

const hero = computed(() => HERO_BY_ID[props.heroId]);
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.heroId, 'civile'));
const archImage = computed(() => cssImage(gameArt.manifest.value.carte.arche));
/** Its power as the cards write theirs: the keywords in bold, and what they mean. */
const powerText = computed(() => boldGlossaryTerms(props.powerNote ?? hero.value?.desc ?? ''));
const glossary = computed(() => glossaryFor([powerText.value]));
</script>

<template>
  <div class="hero-corner">
    <ArchPortrait class="arch" :puppet="puppet" :name="hero?.name ?? 'Le fantôme'" :frame-image="archImage" hide-name>
      <PollsBadge class="polls" :hp="hp" :start-hp="startHp" />
    </ArchPortrait>
    <span v-if="showPower && hero" class="power" role="tooltip">
      <strong>{{ hero.power }}</strong>
      <RichText :text="powerText" />
      <span v-for="entry in glossary" :key="entry.term" class="entry"><b>{{ entry.term }}</b> {{ entry.rule }}</span>
    </span>
  </div>
</template>

<style scoped>
.hero-corner { position: relative; }
.arch { --arch-width: calc(var(--s) * 150); }
.arch :deep(.name) { font-size: calc(var(--s) * 20); }
.polls { --polls-scale: 1; }
.power {
  position: absolute;
  left: calc(100% + var(--s) * 30);
  bottom: calc(var(--s) * 20);
  width: calc(var(--s) * 340);
  padding: calc(var(--s) * 10) calc(var(--s) * 14);
  border-radius: calc(var(--s) * 14);
  background: rgb(12 14 24 / 0.95);
  border: calc(var(--s) * 2) solid rgb(255 255 255 / 0.2);
  color: #e8eaf0;
  font: 500 calc(var(--s) * 21) / 1.22 var(--font-card);
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.12s;
  pointer-events: none;
  z-index: 40;
}
.power strong { display: block; color: var(--color-accent); font: 800 calc(var(--s) * 23) / 1.1 var(--font-card-title); }
.power :deep(.rich strong) { display: inline; color: #fff; font: inherit; font-weight: 800; }
.entry { display: block; margin-top: calc(var(--s) * 8); color: #c9cfdc; font-size: calc(var(--s) * 19); }
.entry b { color: var(--color-accent); }
.hero-corner:hover .power { visibility: visible; opacity: 1; transition-delay: 0.2s; }
</style>
