<script setup lang="ts">
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import RankBadge from '#src/client/components/atoms/RankBadge.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import VictoryShare from '#src/client/components/organisms/VictoryShare.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import type { MmrChange } from '#src/client/stores/createGameStore.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';
import { rankMoveOf } from '#src/client/tools/rankMoveOf.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { Classement } from '#src/protocol/messages.ts';

const props = withDefaults(defineProps<{
  ranking: Classement;
  seat: number;
  canReplay?: boolean;
  replayHint?: string | null;
  /** A table of the ranked queue: no « Rejouer », back to the queue instead. */
  rankedGame?: boolean;
  /** The game of a room: its players may go back to it, to see who is there and talk before the next game. */
  hasRoom?: boolean;
  mmr?: MmrChange | null;
  /** The player's last view: a winner's board is shown, as a card to share. */
  view?: PlayerView | null;
  /** The player's name online; none against bots. */
  pseudo?: string | null;
}>(), {
  canReplay: true,
  replayHint: null,
  rankedGame: false,
  hasRoom: false,
  mmr: null,
  view: null,
  pseudo: null,
});
defineEmits<{ again: []; room: []; queue: []; leave: [] }>();

const ownPlace = computed(() => props.ranking.find((r) => r.seat === props.seat)?.place);
const sorted = computed(() => [...props.ranking].sort((a, b) => a.place - b.place));
const mmrDelta = computed(() => (props.mmr ? props.mmr.apres - props.mmr.avant : 0));
/** The game moved the player to another rank: up, or down. */
const rankMove = computed(() => (props.mmr ? rankMoveOf(props.mmr.avant, props.mmr.apres) : null));
/** First place: the board that won is shown, with what shares it. */
const wonView = computed(() => (ownPlace.value === 1 ? props.view : null));
</script>

<template>
  <MenuBackdrop fitted>
    <div class="end" :class="{ sharing: wonView }">
      <img class="logo" :src="assetUrl('logo/casserolade.webp')" alt="Casserolade" />
      <h1 class="title" :class="{ won: ownPlace === 1 }">
        <template v-if="ownPlace === 1">Élu !</template>
        <template v-else>Vous finissez {{ ownPlace }}<sup>{{ ordinalSuffix(ownPlace ?? 0) }}</sup></template>
      </h1>
      <p v-if="mmr" class="mmr" :class="{ up: mmrDelta > 0, down: mmrDelta < 0 }">
        <RankBadge class="rank" :mmr="mmr.apres" />
        Cote {{ mmr.avant }} → <strong>{{ mmr.apres }}</strong>
        <span class="delta">{{ mmrDelta > 0 ? '+' : '' }}{{ mmrDelta }}</span>
        <span v-if="rankMove" class="move">{{ rankMove === 'up' ? 'Nouveau rang !' : 'Rang perdu' }}</span>
      </p>
      <slot />
      <div class="result">
        <VictoryShare v-if="wonView" class="share" :view="wonView" :pseudo="pseudo" />
        <ol class="ranking">
          <li v-for="row in sorted" :key="row.seat" class="row" :class="{ own: row.seat === seat, first: row.place === 1 }">
            <span class="place">{{ row.place }}</span>
            <HeadPortrait class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
            <span class="who"><strong>{{ HERO_BY_ID[row.heroId]?.name }}</strong><span>{{ row.pseudo }}<template v-if="row.seat === seat && row.pseudo !== 'Vous'"> (vous)</template></span></span>
          </li>
        </ol>
      </div>
      <p v-if="replayHint" class="hint">{{ replayHint }}</p>
      <div class="actions">
        <AppButton v-if="rankedGame" primary @click="$emit('queue')">Retourner dans la file</AppButton>
        <AppButton v-else-if="canReplay" primary @click="$emit('again')">Rejouer</AppButton>
        <AppButton v-if="hasRoom" @click="$emit('room')">Retour au salon</AppButton>
        <AppButton @click="$emit('leave')">Accueil</AppButton>
      </div>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
/* The end of a game holds in the screen: its sizes follow the screen, its buttons are those of a menu. */
.end { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; width: min(82rem, 96vw); }
.end :deep(.app-button) { padding: 0.36em 0.95em; border-width: 2px; font-size: 1.05rem; box-shadow: 0 3px 8px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.2); }
.end :deep(.app-button.primary) { font-size: 1.3rem; }
.logo { width: auto; height: min(110px, 10dvh); filter: drop-shadow(0 8px 16px rgb(0 0 0 / 0.6)); }
.title { margin-top: -0.5rem; color: #fff; font: 400 2.6rem / 1 var(--font-number); letter-spacing: 2px; -webkit-text-stroke: 6px var(--color-ink); paint-order: stroke fill; rotate: -2deg; }
.title sup { font-size: 0.55em; }
.won { color: var(--color-title); }
.mmr { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.2rem 0.6rem; padding: 0.2rem 1rem; border-radius: 999px; background: rgb(12 16 32 / 0.92); border: 2px solid rgb(255 255 255 / 0.16); color: #c9cfdc; font-weight: 700; }
.mmr strong { color: #fff; font: 400 1.5rem / 1 var(--font-number); letter-spacing: 1px; }
.delta { font: 400 1.3rem / 1 var(--font-number); color: #c9cfdc; }
.up .delta { color: #7dff9e; }
.down .delta { color: #ff8a8a; }
.rank { font-size: 0.95rem; }
.move { color: var(--color-title); font-weight: 800; }
.down .move { color: #ff8a8a; }
.result { display: flex; justify-content: center; width: 100%; }
/* Two columns: the whole table at a glance, without scrolling. */
.ranking { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: column; grid-template-rows: repeat(4, auto); gap: 0.4rem 0.8rem; width: min(52rem, 100%); }
/* A winner: the board to share on the left, wide, and the ranking beside it, in one column. */
.sharing .result { display: grid; grid-template-columns: minmax(0, 2.1fr) minmax(0, 1fr); align-items: start; gap: 0.8rem; }
.sharing .ranking { grid-template-columns: minmax(0, 1fr); grid-auto-flow: row; grid-template-rows: none; width: 100%; }
.row { display: flex; align-items: center; gap: 0.6rem; min-width: 0; padding: 0.15rem 0.8rem 0.15rem 0.35rem; border-radius: 999px; border: 2px solid rgb(255 255 255 / 0.12); background: rgb(12 16 32 / 0.9); }
.own { border-color: var(--color-accent); box-shadow: 0 0 12px rgb(255 197 61 / 0.3); }
.place { flex: none; width: 1.8rem; text-align: center; color: var(--color-title); font: 400 1.5rem / 1 var(--font-number); }
.first { border-color: #ffd84a; }
.face { --portrait-size: 2.1rem; flex: none; border: 2px solid #9aa3b4; }
.who { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
.who strong { overflow: hidden; color: #fff; font-size: 1rem; white-space: nowrap; text-overflow: ellipsis; }
.who span { overflow: hidden; color: #b8bfcf; font-size: 0.88rem; white-space: nowrap; text-overflow: ellipsis; }
.hint { color: #c9cfdc; }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.7rem; }
@media (max-width: 800px) {
  .ranking, .sharing .ranking { grid-template-columns: minmax(0, 1fr); grid-auto-flow: row; grid-template-rows: none; }
  .sharing .result { grid-template-columns: minmax(0, 1fr); }
}
</style>
