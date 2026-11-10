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
import { seatLabel } from '#src/client/tools/seatNames.ts';
import type { SeatName } from '#src/client/tools/seatNames.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';

/**
 * Out of the game: the hero, greyed, and the table that plays on. The end screen comes by itself.
 * The player may leave for home now; when the ranking is already known, see it now. While the game goes on, a
 * survivor may be followed: its combats then show live, one after the other, until the end or until it falls.
 */
const props = withDefaults(defineProps<{ view: PlayerView; rankingReady?: boolean; names?: Map<number, SeatName>; following?: number | null }>(), {
  rankingReady: false,
  names: () => new Map(),
  following: null,
});
const emit = defineEmits<{ ranking: []; leave: []; follow: [seat: number | null] }>();

const hero = computed(() => HERO_BY_ID[props.view.heroId]);
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.view.heroId, 'civile'));
const archImage = computed(() => cssImage(gameArt.manifest.value.carte.arche));
const rows = computed(() => [...props.view.table].sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp || a.place - b.place));
/** The game goes on: its survivors can be followed. */
const canFollow = computed(() => !props.rankingReady && props.view.table.some((row) => row.alive));
const followed = computed(() => (props.following === null ? null : seatLabel(props.names.get(props.following))));

function nameOf(seat: number): string {
  return seat === props.view.seat ? 'Vous' : seatLabel(props.names.get(seat));
}

function heroOf(row: PlayerView['table'][number]): string {
  return props.names.get(row.seat)?.hero ?? (row.heroId ? (HERO_BY_ID[row.heroId]?.name ?? '…') : '…');
}

/** Who plays a hero, under its name, online: « Vous », a pseudo or « Bot ». */
function playerOf(seat: number): string | null {
  const name = props.names.get(seat);
  if (seat === props.view.seat) return name?.pseudo ? 'Vous' : null;
  return name?.pseudo ?? (name?.bot ? 'Bot' : null);
}

/** The followed one again: nobody is followed any more. */
function toggle(seat: number): void {
  emit('follow', props.following === seat ? null : seat);
}
</script>

<template>
  <MenuBackdrop :plateau-id="view.plateau.id">
    <ArchPortrait class="arch" :puppet="puppet" :name="hero?.name ?? ''" :frame-image="archImage" hide-name />
    <h1 class="title">Éliminé, {{ view.place }}<sup>{{ ordinalSuffix(view.place) }}</sup></h1>
    <p class="muted">{{ rankingReady ? 'La partie est jouée : le classement final arrive tout seul.' : 'La partie continue sans vous : le classement final arrive tout seul.' }}</p>
    <p v-if="canFollow" class="follow-hint" role="status">
      <template v-if="followed">Vous suivez <strong>{{ followed }}</strong> : ses débats passent ici, en direct.</template>
      <template v-else>Choisissez un survivant pour regarder ses débats en direct.</template>
    </p>
    <ol class="table">
      <li v-for="row in rows" :key="row.seat" class="row" :class="{ own: row.seat === view.seat, out: !row.alive, followed: row.seat === following }">
        <HeadPortrait v-if="row.heroId" class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
        <span class="who" :title="nameOf(row.seat)">
          <strong>{{ row.seat === view.seat && !playerOf(row.seat) ? 'Vous' : heroOf(row) }}</strong>
          <span v-if="playerOf(row.seat)">{{ playerOf(row.seat) }}</span>
        </span>
        <span class="state"><template v-if="row.alive"><GameIcon name="heart" /> {{ row.hp }}</template><template v-else>{{ row.place }}<sup>{{ ordinalSuffix(row.place) }}</sup></template></span>
        <button
          v-if="canFollow && row.alive && row.seat !== view.seat"
          type="button"
          class="follow"
          :aria-pressed="row.seat === following"
          :aria-label="row.seat === following ? `Ne plus suivre ${nameOf(row.seat)}` : `Suivre ${nameOf(row.seat)}`"
          @click="toggle(row.seat)"
        >{{ row.seat === following ? 'Suivi' : 'Suivre' }}</button>
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
.table { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: column; grid-template-rows: repeat(4, auto); gap: 0.5rem 1rem; width: min(1100px, 94vw); }
.row { display: flex; align-items: center; gap: 0.7rem; padding: 0.3rem 1rem 0.3rem 0.4rem; border-radius: 999px; border: 3px solid rgb(255 255 255 / 0.12); background: rgb(12 16 32 / 0.9); color: #fff; }
.own { border-color: var(--color-accent); }
.out { opacity: 0.55; }
.face { --portrait-size: 2.6rem; flex: none; border: 3px solid #9aa3b4; }
.who { flex: 1; display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
.who strong { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.who span { overflow: hidden; color: #b8bfcf; font-size: 0.9rem; white-space: nowrap; text-overflow: ellipsis; }
.state { color: #ffe27a; font: 400 1.5rem / 1 var(--font-number); }
.state sup { font-size: 0.6em; }
.follow-hint { margin: 0; color: #fff; font-weight: 700; }
.follow-hint strong { color: #ffe27a; }
.followed { border-color: #e0182c; box-shadow: 0 0 0.8rem rgb(224 24 44 / 0.6); }
.follow { flex: none; padding: 0.25rem 0.8rem; border-radius: 999px; border: 2px solid #d8b450; background: linear-gradient(#2a3a6a, #121a38); color: #fff; font: 400 1rem / 1 var(--font-number); letter-spacing: 1px; cursor: pointer; }
.follow:hover { filter: brightness(1.2); }
.follow[aria-pressed='true'] { border-color: #fff; background: #e0182c; }
.actions { display: flex; gap: 1rem; }
/* A phone held upright: one column, so that the names keep their room beside « Suivre ». */
@media (max-width: 640px) {
  .table { grid-template-columns: minmax(0, 1fr); grid-template-rows: none; grid-auto-flow: row; gap: 0.35rem; }
  .title { font-size: 2.4rem; }
}
</style>
