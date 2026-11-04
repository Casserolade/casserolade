<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import ArchPortrait from '#src/client/components/atoms/ArchPortrait.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';

/**
 * Out of the game: the hero, greyed, and the table that plays on. The end screen comes by itself.
 * The player may leave for home now; when the ranking is already known, see it now.
 */
const props = withDefaults(defineProps<{ view: PlayerView; rankingReady?: boolean }>(), { rankingReady: false });
defineEmits<{ ranking: []; leave: [] }>();

const hero = computed(() => HERO_BY_ID[props.view.heroId]);
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.view.heroId, 'civile'));
const archImage = computed(() => cssImage(gameArt.manifest.value.carte.arche));
const rows = computed(() => [...props.view.table].sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp || a.place - b.place));
</script>

<template>
  <MenuBackdrop :plateau-id="view.plateau.id">
    <ArchPortrait class="arch" :puppet="puppet" :name="hero?.name ?? ''" :frame-image="archImage" hide-name />
    <h1 class="title">Éliminé, {{ view.place }}<sup>{{ ordinalSuffix(view.place) }}</sup></h1>
    <p class="muted">{{ rankingReady ? 'La partie est jouée : le classement final arrive tout seul.' : 'La partie continue sans vous : le classement final arrive tout seul.' }}</p>
    <ol class="table">
      <li v-for="row in rows" :key="row.seat" class="row" :class="{ own: row.seat === view.seat, out: !row.alive }">
        <HeadPortrait v-if="row.heroId" class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
        <span class="name">{{ row.seat === view.seat ? 'Vous' : (row.heroId ? HERO_BY_ID[row.heroId]?.name : '…') }}</span>
        <span class="state"><template v-if="row.alive"><GameIcon name="heart" /> {{ row.hp }}</template><template v-else>{{ row.place }}<sup>{{ ordinalSuffix(row.place) }}</sup></template></span>
      </li>
    </ol>
    <div class="actions">
      <AppButton v-if="rankingReady" primary @click="$emit('ranking')">Voir le classement</AppButton>
      <AppButton v-else @click="$emit('leave')">Retour à l'accueil</AppButton>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.arch { --arch-width: 9rem; margin-top: 5dvh; filter: grayscale(0.8); rotate: -4deg; }
.title { color: #ff8a8a; font-size: 3.4rem; rotate: -2deg; }
.title sup { font-size: 0.55em; }
.table { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: column; grid-template-rows: repeat(4, auto); gap: 0.5rem 1rem; width: min(820px, 94vw); }
.row { display: flex; align-items: center; gap: 0.7rem; padding: 0.3rem 1rem 0.3rem 0.4rem; border-radius: 999px; border: 3px solid rgb(255 255 255 / 0.12); background: rgb(12 16 32 / 0.9); color: #fff; }
.own { border-color: var(--color-accent); }
.out { opacity: 0.55; }
.face { --portrait-size: 2.6rem; flex: none; border: 3px solid #9aa3b4; }
.name { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: 700; }
.state { color: #ffe27a; font: 400 1.5rem / 1 var(--font-number); }
.state sup { font-size: 0.6em; }
.actions { display: flex; gap: 1rem; }
</style>
