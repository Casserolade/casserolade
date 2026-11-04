<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import OpponentSheet from '#src/client/components/molecules/OpponentSheet.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';

/** The eight players down the side of the table: a face, the polls, the tier. On hover, a sheet: power, triples, last board seen. */
const props = withDefaults(defineProps<{ table: PlayerView['table']; seat: number; seen?: PlayerView['seen'] }>(), { seen: () => [] });

const rows = computed(() => [...props.table].sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp));

function nameOf(row: PlayerView['table'][number]): string {
  if (row.seat === props.seat) return 'Vous';
  return row.heroId ? (HERO_BY_ID[row.heroId]?.name ?? '…') : '…';
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
      <li v-for="row in rows" :key="row.seat" class="player" :class="{ own: row.seat === seat, out: !row.alive }">
        <HeadPortrait v-if="row.heroId" class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
        <span v-else class="face empty" />
        <span v-if="row.alive" class="hp" :aria-label="`${row.hp} sondages`"><GameIcon name="heart" />{{ row.hp }}</span>
        <span v-else class="hp place" :aria-label="`${row.place}${ordinalSuffix(row.place)}, éliminé`">{{ row.place }}<sup>{{ ordinalSuffix(row.place) }}</sup></span>
        <span v-if="row.alive" class="tier" :aria-label="`Échelon ${row.tier}`">{{ row.tier }}</span>
        <OpponentSheet
          class="about"
          :name="nameOf(row)"
          :power="powerOf(row.heroId)"
          :tier="row.tier"
          :hp="row.hp"
          :triples="row.triples"
          :alive="row.alive"
          :seen="lastSeen(row.seat)"
          :is-own="row.seat === seat"
        />
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
.player:hover .about { visibility: visible; }
</style>
