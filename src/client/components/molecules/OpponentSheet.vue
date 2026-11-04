<script setup lang="ts">
import type { PlayerView } from '#src/engine/game.ts';

/**
 * What a player of the table looks like on hover, as in Battlegrounds: the hero and its power, the
 * tier, the polls, the triples, and the last board seen in combat against it.
 */
defineProps<{
  name: string;
  power: { name: string; desc: string } | null;
  tier: number;
  hp: number;
  triples: number;
  alive: boolean;
  /** The last combat against this player; null when never met. */
  seen: PlayerView['seen'][number] | null;
  isOwn: boolean;
}>();
</script>

<template>
  <span class="sheet" role="tooltip">
    <strong class="name">{{ name }}</strong>
    <span v-if="power" class="power"><b>{{ power.name }}</b> : {{ power.desc }}</span>
    <span class="figures">
      <span>Échelon {{ tier }}</span>
      <span v-if="alive">{{ hp }} sondages</span>
      <span>{{ triples }} triple{{ triples > 1 ? 's' : '' }}</span>
    </span>
    <template v-if="!isOwn">
      <span v-if="seen" class="seen-title">Dernier combat, manche {{ seen.round }} :</span>
      <span v-else class="seen-title muted">Jamais affronté</span>
      <span v-if="seen" class="board">
        <span v-if="seen.board.length === 0" class="muted">plateau vide</span>
        <span v-for="minion in seen.board" :key="minion.uid" class="minion" :class="{ golden: minion.golden }">
          {{ minion.name }} <b>{{ minion.atk }}/{{ minion.hp }}</b>
        </span>
      </span>
    </template>
  </span>
</template>

<style scoped>
.sheet {
  position: absolute;
  z-index: 30;
  left: calc(100% + var(--s) * 12);
  top: 50%;
  translate: 0 -50%;
  display: flex;
  flex-direction: column;
  gap: calc(var(--s) * 6);
  width: calc(var(--s) * 420);
  padding: calc(var(--s) * 12) calc(var(--s) * 16);
  border-radius: calc(var(--s) * 14);
  background: linear-gradient(rgb(22 26 44 / 0.97), rgb(10 12 22 / 0.97));
  border: calc(var(--s) * 2) solid rgb(255 214 110 / 0.45);
  box-shadow: 0 calc(var(--s) * 10) calc(var(--s) * 30) rgb(0 0 0 / 0.6);
  color: #e8eaf0;
  font: 500 calc(var(--s) * 19) / 1.25 var(--font-card);
  visibility: hidden;
  pointer-events: none;
}
.name { color: var(--color-accent); font: 800 calc(var(--s) * 26) / 1.1 var(--font-card-title); }
.power b { color: #ffe27a; }
.figures { display: flex; flex-wrap: wrap; gap: calc(var(--s) * 6); }
.figures > span { padding: calc(var(--s) * 2) calc(var(--s) * 10); border-radius: calc(var(--s) * 12); background: rgb(255 255 255 / 0.08); }
.seen-title { margin-top: calc(var(--s) * 4); color: #b9c0d0; font-weight: 700; }
.muted { color: #8c93a6; }
.board { display: flex; flex-wrap: wrap; gap: calc(var(--s) * 4) calc(var(--s) * 6); }
.minion { padding: calc(var(--s) * 2) calc(var(--s) * 8); border-radius: calc(var(--s) * 10); background: rgb(255 255 255 / 0.06); }
.minion b { color: #fff; }
.golden { background: rgb(255 210 80 / 0.22); color: #ffe9a8; }
</style>
