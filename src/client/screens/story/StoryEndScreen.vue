<script setup lang="ts">
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import ArchPortrait from '#src/client/components/atoms/ArchPortrait.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { CHAPITRES, OUTRE_TOMBE } from '#src/data/histoire/chapitres.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { Campagne } from '#src/histoire/campagne.ts';

const props = defineProps<{ campaign: Campagne }>();
defineEmits<{ restart: []; leave: [] }>();

const reached = computed(() => Object.values(props.campaign.etoiles).reduce((sum, count) => sum + count, 0));
const possible = computed(() => [...CHAPITRES, OUTRE_TOMBE].reduce((sum, chapter) => sum + chapter.objectifs.length, 0));
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.campaign.heroId, 'civile'));
const archImage = computed(() => cssImage(gameArt.manifest.value.carte.arche));
</script>

<template>
  <MenuBackdrop>
    <ArchPortrait class="arch" :puppet="puppet" :name="HERO_BY_ID[campaign.heroId]?.name ?? ''" :frame-image="archImage" hide-name />
    <h1 class="title">{{ HERO_BY_ID[campaign.heroId]?.name }} a tout gagné</h1>
    <p class="lead">Des municipales au débat de TF1, et même au-delà. Étoiles : <strong>{{ reached }}</strong> sur {{ possible }}.</p>
    <div class="actions">
      <AppButton primary @click="$emit('restart')">Une autre carrière</AppButton>
      <AppButton @click="$emit('leave')">Accueil</AppButton>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.arch { --arch-width: 12rem; margin-top: 6dvh; filter: drop-shadow(0 0 30px rgb(255 216 74 / 0.6)); }
.title { font-size: 3.4rem; rotate: -1.5deg; }
.lead { color: #e8eaf0; font-size: 1.3rem; }
.lead strong { color: #ffe27a; }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
</style>
