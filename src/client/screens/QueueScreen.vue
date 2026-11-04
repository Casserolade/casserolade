<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import TableSeat from '#src/client/components/molecules/TableSeat.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { TABLE_SEATS, formatWait, queueSummary, waitedMs } from '#src/client/tools/queueSummary.ts';
import type { VueFile } from '#src/protocol/messages.ts';

const TICK_MS = 1000;

/**
 * The public queue: the table you would sit at, who wants to start with bots, and your own vote.
 * The game starts by itself at 8 players, or as soon as the vote passes. Nothing to wait for but that.
 */
/** `reason`: what the server said when it refused the entry; without it, the queue went silent. */
const props = withDefaults(defineProps<{ queue: VueFile | null; seenAt: number; lost: boolean; reason?: string | null }>(), { reason: null });
defineEmits<{ vote: [yes: boolean]; retry: []; leave: [] }>();

const now = ref(Date.now());
const ticker = window.setInterval(() => (now.value = Date.now()), TICK_MS);
onUnmounted(() => window.clearInterval(ticker));

const summary = computed(() => (props.queue ? queueSummary(props.queue) : null));
const waited = computed(() => (props.queue ? formatWait(waitedMs(props.queue, props.seenAt, now.value)) : '0:00'));
const emptySeats = computed(() => Array.from({ length: summary.value?.empty ?? TABLE_SEATS }, (_, index) => index));
const others = computed(() => (props.queue ? props.queue.en_file - props.queue.groupe.length : 0));
const voteLine = computed(() => {
  const s = summary.value;
  if (!s || !props.queue) return '';
  if (props.queue.groupe.length === 1) return 'Seul à cette table : votez oui, et sept bots vous attendent.';
  return `La partie part à ${TABLE_SEATS} joueurs, ou dès que ${s.needed} sur ${props.queue.groupe.length} votent oui.`;
});
</script>

<template>
  <MenuBackdrop>
    <h1 class="title">Partie publique</h1>
    <template v-if="lost">
      <p class="lost" role="status">{{ reason ?? 'La file vous a laissé partir : vous l\'avez sans doute rejointe depuis un autre onglet.' }}</p>
      <div class="actions">
        <AppButton primary @click="$emit('retry')">Revenir dans la file</AppButton>
        <AppButton @click="$emit('leave')">Accueil</AppButton>
      </div>
    </template>
    <template v-else>
      <ul class="facts" aria-live="polite">
        <li><span>En file depuis</span><strong>{{ waited }}</strong></li>
        <li><span>Votre MMR</span><strong>{{ queue?.mmr ?? '…' }}</strong></li>
        <li><span>Autres joueurs en file</span><strong>{{ queue ? others : '…' }}</strong></li>
      </ul>

      <section class="panel table" aria-label="Votre table">
        <h2>Votre table</h2>
        <p v-if="!queue" class="muted searching">On vous cherche une table…</p>
        <ol class="seats">
          <TableSeat
            v-for="(seat, index) in queue?.groupe ?? []"
            :key="index"
            :name="seat.moi ? `${seat.pseudo} (vous)` : seat.pseudo"
            :me="seat.moi"
            :lit="seat.vote"
          >
            <GameIcon name="robot" /> {{ seat.vote ? 'Bots : oui' : 'Attend des joueurs' }}
          </TableSeat>
          <TableSeat v-for="index in emptySeats" :key="`empty-${index}`" name="Place libre" note="un bot si la table vote" kind="empty" />
        </ol>
      </section>

      <section v-if="queue && summary" class="panel vote-panel">
        <button
          type="button"
          class="switch"
          role="switch"
          :aria-checked="queue.vote"
          @click="$emit('vote', !queue.vote)"
        >
          <span class="track"><span class="knob"><GameIcon name="robot" /></span></span>
          <span class="label">Lancer avec des bots</span>
        </button>
        <div class="tally">
          <span class="pips" :aria-label="`${summary.yes} oui sur ${summary.needed} nécessaires`">
            <span v-for="n in summary.needed" :key="n" class="pip" :class="{ on: n <= summary.yes }" />
          </span>
          <p>{{ voteLine }}</p>
        </div>
      </section>

      <p class="muted hint">Plus l'attente dure, plus la table s'ouvre à des niveaux éloignés du vôtre.</p>
      <AppButton @click="$emit('leave')">Quitter la file</AppButton>
    </template>
  </MenuBackdrop>
</template>

<style scoped>
.title { font-size: 3.2rem; rotate: -1.5deg; }
.facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.8rem; }
.facts li { display: flex; align-items: baseline; gap: 0.6rem; padding: 0.4rem 1.2rem; border-radius: 999px; border: 3px solid rgb(255 255 255 / 0.14); background: rgb(12 16 32 / 0.92); color: #c9cfdc; }
.facts strong { color: #ffe27a; font: 400 1.9rem / 1 var(--font-number); letter-spacing: 1px; }
.panel { width: min(1100px, 94vw); padding: 1.1rem 1.3rem; border-radius: 22px; border: 3px solid rgb(255 255 255 / 0.14); background: linear-gradient(rgb(22 30 58 / 0.94), rgb(11 15 32 / 0.94)); box-shadow: 0 16px 40px rgb(0 0 0 / 0.55); }
.panel h2 { margin-bottom: 0.8rem; }
.searching { margin-bottom: 0.8rem; }
.seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.7rem; }

.vote-panel { display: flex; flex-wrap: wrap; align-items: center; gap: 1.2rem 2rem; }
.switch { display: flex; align-items: center; gap: 1rem; padding: 0; border: none; background: none; cursor: pointer; }
.track { position: relative; width: 6.2rem; height: 3.2rem; border-radius: 999px; border: 3px solid #d8b450; background: #1a2040; box-shadow: inset 0 3px 8px rgb(0 0 0 / 0.6); transition: background-color 0.15s; }
.knob { position: absolute; top: 0.2rem; left: 0.25rem; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 50%; background: linear-gradient(#f4f6fa, #9aa3b4); color: #1a2040; font-size: 1.5rem; transition: translate 0.18s cubic-bezier(0.3, 1.5, 0.5, 1); }
.switch[aria-checked='true'] .track { background: #1f8a4c; }
.switch[aria-checked='true'] .knob { translate: 2.9rem 0; background: linear-gradient(#ffe27a, #e8a612); }
.switch:focus-visible .track { outline: 3px solid var(--color-accent); outline-offset: 3px; }
.label { color: #fff; font: 400 2rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; }
.tally { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 16rem; color: #c9cfdc; }
.pips { display: flex; gap: 0.4rem; }
.pip { width: 1.4rem; height: 1.4rem; border-radius: 50%; border: 3px solid #9aa3b4; background: transparent; }
.pip.on { border-color: #7dff9e; background: #2fbf6a; box-shadow: 0 0 10px #7dff9e; }
.hint { text-align: center; }
.lost { max-width: 40rem; padding: 0.8rem 1.4rem; border-radius: 18px; background: rgb(12 16 32 / 0.92); color: #fff; text-align: center; }
.actions { display: flex; gap: 1rem; }
@media (max-width: 900px) { .seats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
