<script setup lang="ts">
import { computed } from 'vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import { fightLine } from '#src/client/tools/fightLine.ts';
import type { OpponentAbout } from '#src/client/tools/opponentAbout.ts';
import { pollsLabel } from '#src/client/tools/pollsLabel.ts';
import { toCardProps } from '#src/client/tools/toCardProps.ts';

/**
 * What a player of the table looks like, as in Battlegrounds: the hero and its power, the tier, the polls and the
 * electoral base, the triples, then two things that are not the same. Its board the last time the reader faced it,
 * drawn as on the table: never its board of the moment, which nobody knows, nor the one it had against someone else.
 * And its own last combats, against anyone: against whom, won or lost, the polls taken or lost. A box: whoever holds
 * it places it (beside a row of the scoreboard on hover, in a sheet on a phone).
 */
const props = defineProps<{ about: OpponentAbout }>();

const fights = computed(() => props.about.fights.map(fightLine));
</script>

<template>
  <span class="sheet" role="tooltip">
    <strong class="name">{{ about.name }}</strong>
    <span v-if="about.player" class="player">{{ about.player }}</span>
    <span v-if="about.next" class="next">{{ about.alive ? 'Votre prochain adversaire' : 'Son fantôme sera votre prochain adversaire' }}</span>
    <span v-if="about.power" class="power"><b>{{ about.power.name }}</b> : {{ about.power.desc }}</span>
    <span class="figures">
      <span>Échelon {{ about.tier }}</span>
      <span v-if="about.alive">{{ pollsLabel(about.hp, about.startHp) }}</span>
      <span>{{ about.triples }} triple{{ about.triples > 1 ? 's' : '' }}</span>
    </span>
    <template v-if="!about.isOwn">
      <span v-if="about.seen" class="title">Son plateau la dernière fois que vous l'avez affronté, manche {{ about.seen.round }}</span>
      <span v-else class="title muted">Jamais affronté</span>
      <span v-if="about.seen" class="board">
        <span v-if="about.seen.board.length === 0" class="muted">plateau vide</span>
        <MedallionToken v-for="minion in about.seen.board" :key="minion.uid" class="minion" v-bind="toCardProps(minion)" bare />
      </span>
    </template>
    <template v-if="fights.length">
      <span class="title">{{ about.isOwn ? 'Vos derniers débats' : 'Ses derniers débats' }}</span>
      <span class="fights">
        <span v-for="fight in fights" :key="fight.round" class="fight" :class="{ won: fight.outcome === 'Victoire', lost: fight.outcome === 'Défaite' }">
          <b class="round">{{ fight.round }}</b>
          <span class="what"><strong class="outcome">{{ fight.outcome }}</strong> {{ fight.against }}</span>
          <span v-if="fight.polls" class="polls">{{ fight.polls }}</span>
        </span>
      </span>
    </template>
  </span>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: calc(var(--s) * 6);
  box-sizing: border-box;
  width: calc(var(--s) * 580);
  padding: calc(var(--s) * 12) calc(var(--s) * 16);
  border-radius: calc(var(--s) * 14);
  background: linear-gradient(rgb(22 26 44 / 0.97), rgb(10 12 22 / 0.97));
  border: calc(var(--s) * 2) solid rgb(255 214 110 / 0.45);
  box-shadow: 0 calc(var(--s) * 10) calc(var(--s) * 30) rgb(0 0 0 / 0.6);
  color: #e8eaf0;
  font: 500 calc(var(--s) * 19) / 1.25 var(--font-card);
}
.name { color: var(--color-accent); font: 800 calc(var(--s) * 26) / 1.1 var(--font-card-title); }
.player { margin-top: calc(var(--s) * -4); color: #fff; font: 700 calc(var(--s) * 20) / 1.1 var(--font-card); }
.power b { color: #ffe27a; }
.next { color: #ff8a7e; font-weight: 800; }
.figures { display: flex; flex-wrap: wrap; gap: calc(var(--s) * 6); }
.figures > span { padding: calc(var(--s) * 2) calc(var(--s) * 10); border-radius: calc(var(--s) * 12); background: rgb(255 255 255 / 0.08); }
.title { margin-top: calc(var(--s) * 4); color: #b9c0d0; font-weight: 700; }
.muted { color: #8c93a6; }
/* The board as it stood, its medallions small, seven on a line. */
.board { --medal-w: calc(var(--s) * 68); display: flex; flex-wrap: wrap; gap: calc(var(--s) * 14) calc(var(--s) * 10); padding: calc(var(--s) * 4) calc(var(--s) * 2) calc(var(--s) * 8); }
.minion { flex: none; }
.fights { display: flex; flex-direction: column; gap: calc(var(--s) * 3); }
/* The round, what happened and against whom, and the polls it moved on the right. */
.fight { display: flex; align-items: baseline; gap: calc(var(--s) * 8); }
.round { flex: none; min-width: calc(var(--s) * 44); padding: 0 calc(var(--s) * 6); border-radius: calc(var(--s) * 8); background: rgb(255 255 255 / 0.1); color: #fff; font-size: 0.85em; text-align: center; }
.what { flex: 1; min-width: 0; }
.outcome { color: #c9cfdc; }
.won .outcome { color: #7be08a; }
.lost .outcome { color: #ff8a7e; }
.polls { flex: none; color: #fff; font-weight: 700; white-space: nowrap; }
</style>
