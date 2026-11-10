<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import OpponentSheet from '#src/client/components/molecules/OpponentSheet.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { facelessGhostNext, nextOpponentSeat } from '#src/client/tools/nextOpponentSeat.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import type { SeatName } from '#src/client/tools/seatNames.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';

/**
 * The eight players down the side of the table: a face, the polls, the tier, and online the pseudo. On hover, a sheet:
 * the hero and who plays it, power, triples, last board seen. During recruitment, the next opponent is marked, as in
 * Battlegrounds; a ghost on the eliminated seat it wears, or on a row of its own before the first elimination.
 */
const props = withDefaults(defineProps<{ table: PlayerView['table']; seat: number; seen?: PlayerView['seen']; names?: Map<number, SeatName>; next?: PlayerView['nextOpponent'] }>(), {
  seen: () => [],
  names: () => new Map(),
  next: null,
});

const rows = computed(() => [...props.table].sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp));
const nextSeat = computed(() => nextOpponentSeat(props.table, props.next));
const facelessGhost = computed(() => facelessGhostNext(props.table, props.next));

function nameOf(row: PlayerView['table'][number]): string {
  return props.names.get(row.seat)?.hero ?? (row.heroId ? (HERO_BY_ID[row.heroId]?.name ?? '…') : '…');
}

/** Who plays it, online: « Vous », a pseudo, or « Bot ». Nobody in a game of this page. */
function playerOf(row: PlayerView['table'][number]): string | null {
  const name = props.names.get(row.seat);
  if (row.seat === props.seat) return name?.pseudo ? 'Vous' : null;
  return name?.pseudo ?? (name?.bot ? 'Bot' : null);
}

/** The last board seen of this seat: `seen` holds one per opponent, most recent first. */
function lastSeen(seat: number): PlayerView['seen'][number] | null {
  return props.seen.find((entry) => entry.seat === seat) ?? null;
}

function powerOf(heroId: string | null): { name: string; desc: string } | null {
  const hero = heroId ? HERO_BY_ID[heroId] : null;
  return hero ? { name: hero.power, desc: hero.desc } : null;
}
</script>

<template>
  <section class="scoreboard" aria-label="Classement">
    <ol class="list">
      <li v-for="row in rows" :key="row.seat" class="player" :class="{ own: row.seat === seat, out: !row.alive, next: row.seat === nextSeat }">
        <span v-if="row.seat === nextSeat" class="next-tag"><GameIcon name="sword" />{{ row.alive ? 'Prochain adversaire' : 'Prochain : son fantôme' }}</span>
        <HeadPortrait v-if="row.heroId" class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
        <span v-else class="face empty" />
        <span class="score">
          <span v-if="row.alive" class="hp" :aria-label="`${row.hp} sondages`"><GameIcon name="heart" />{{ row.hp }}</span>
          <span v-else class="hp place" :aria-label="`${row.place}${ordinalSuffix(row.place)}, éliminé`">{{ row.place }}<sup>{{ ordinalSuffix(row.place) }}</sup></span>
          <span v-if="names.get(row.seat)?.pseudo && row.seat !== seat" class="who">{{ names.get(row.seat)?.pseudo }}</span>
        </span>
        <span v-if="row.alive" class="tier" :aria-label="`Échelon ${row.tier}`">{{ row.tier }}</span>
        <OpponentSheet
          class="about"
          :name="row.seat === seat && !playerOf(row) ? 'Vous' : nameOf(row)"
          :player="playerOf(row)"
          :power="powerOf(row.heroId)"
          :tier="row.tier"
          :hp="row.hp"
          :triples="row.triples"
          :alive="row.alive"
          :seen="lastSeen(row.seat)"
          :is-own="row.seat === seat"
          :next="row.seat === nextSeat"
        />
      </li>
      <li v-if="facelessGhost" class="player next ghost">
        <span class="next-tag"><GameIcon name="sword" />Prochain adversaire</span>
        <span class="face empty" />
        <span class="ghost-name">Un fantôme</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.scoreboard { position: absolute; left: calc(var(--s) * 34); top: calc(var(--s) * 176); width: calc(var(--s) * 200); }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: calc(var(--s) * 10); }
.player {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 8);
  height: calc(var(--s) * 70);
  padding: 0 calc(var(--s) * 10) 0 calc(var(--s) * 4);
  border-radius: calc(var(--s) * 40);
  background: linear-gradient(90deg, rgb(12 16 32 / 0.92), rgb(12 16 32 / 0.7));
  border: calc(var(--s) * 3) solid rgb(255 255 255 / 0.12);
  box-shadow: 0 calc(var(--s) * 4) calc(var(--s) * 10) rgb(0 0 0 / 0.5);
}
.face { --portrait-size: calc(var(--s) * 62); border: calc(var(--s) * 3) solid #9aa3b4; }
.empty { width: calc(var(--s) * 62); height: calc(var(--s) * 62); border-radius: 50%; background: #20263a; }
.score { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.who { overflow: hidden; max-width: calc(var(--s) * 80); color: #ffe27a; font: 800 calc(var(--s) * 16) / 1.1 var(--font-card); white-space: nowrap; text-overflow: ellipsis; }
.hp { display: flex; align-items: center; gap: calc(var(--s) * 4); color: #fff; font: 400 calc(var(--s) * 34) / 1 var(--font-number); }
.hp .game-icon { color: #e0303e; font-size: calc(var(--s) * 26); }
.place sup { font-size: 0.6em; }
.tier {
  margin-left: auto;
  width: calc(var(--s) * 34);
  height: calc(var(--s) * 38);
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: linear-gradient(#ffe7a0, #c98d16);
  color: var(--color-ink);
  font: 400 calc(var(--s) * 24) / 1 var(--font-number);
}
.own { border-color: var(--color-accent); box-shadow: 0 0 calc(var(--s) * 14) rgb(255 197 61 / 0.5); }
.own .face { border-color: var(--color-accent); }
.out { opacity: 0.45; filter: grayscale(1); }
/* The next opponent, in red, its tag astride the top edge. A ghost's seat stays grey, its tag does not. */
.next { border-color: #ff5d50; box-shadow: 0 0 calc(var(--s) * 16) rgb(255 93 80 / 0.55); }
.next .face { border-color: #ff5d50; }
.out.next { opacity: 1; filter: none; }
.out.next .face, .out.next .score { opacity: 0.55; filter: grayscale(1); }
.next-tag {
  position: absolute;
  z-index: 2;
  top: calc(var(--s) * -13);
  left: calc(var(--s) * 58);
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 4);
  padding: calc(var(--s) * 1) calc(var(--s) * 10);
  border-radius: calc(var(--s) * 10);
  background: #d62839;
  color: #fff;
  font: 800 calc(var(--s) * 14) / 1.3 var(--font-card);
  white-space: nowrap;
  pointer-events: none;
}
.ghost-name { color: #c9cfdc; font: 800 calc(var(--s) * 20) / 1.1 var(--font-card); }
.player:hover .about { visibility: visible; }
</style>
