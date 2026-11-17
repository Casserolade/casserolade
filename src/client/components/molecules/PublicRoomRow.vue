<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import { hasFreeSeat } from '#src/client/tools/hasFreeSeat.ts';
import { publicRoomStatus } from '#src/client/tools/publicRoomStatus.ts';
import { seatsLabel } from '#src/client/tools/seatsLabel.ts';
import type { SalonPublic } from '#src/protocol/publicRooms.ts';

/**
 * One public room in the home page's list: its name, its host, how many sit there, and the button that walks in.
 * A room that plays says so: one enters it to talk with the table, and plays its next game. `primary`: the room the
 * page points at, its button filled.
 */
const props = withDefaults(defineProps<{ room: SalonPublic; primary?: boolean }>(), { primary: false });
const emit = defineEmits<{ join: [] }>();

const status = computed(() => publicRoomStatus(props.room));
const free = computed(() => hasFreeSeat(props.room));
</script>

<template>
  <li class="room" :class="{ playing: status !== null, primary }">
    <span class="what">
      <span class="title">
        <strong class="name">{{ room.nom }}</strong>
        <span v-if="room.nouveau" class="new">Nouveau</span>
      </span>
      <span class="facts"><span class="host">Hôte : {{ room.hote }}</span> <span class="seats">{{ seatsLabel(room.joueurs, room.places) }}</span></span>
      <span v-if="status" class="status">{{ status }}</span>
    </span>
    <AppButton v-if="free" class="enter" :primary="primary" :aria-label="`${status === null ? 'Rejoindre' : 'Entrer dans'} le salon ${room.nom}`" @click="emit('join')">{{ status === null ? 'Rejoindre' : 'Entrer' }}</AppButton>
    <span v-else class="full">Complet</span>
  </li>
</template>

<style scoped>
.room { display: flex; align-items: center; gap: 0.7rem; min-width: 0; padding: 0.35rem 0.45rem 0.35rem 0.8rem; border-radius: 10px; border: 1px solid rgb(255 255 255 / 0.16); background: rgb(255 255 255 / 0.04); }
/* The room the page points at: its frame in the game's gold, like its button. */
.primary { border-color: var(--color-frame); }
.what { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.title { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
.name { overflow: hidden; color: #fff; font: 400 1.2rem / 1.15 var(--font-number); letter-spacing: 0.5px; white-space: nowrap; text-overflow: ellipsis; }
.new { flex: none; padding: 0.05rem 0.4rem; border-radius: 4px; background: var(--color-success); color: var(--color-ink); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
/* The host, then how many sit there: on one line when it fits, the count below when it does not, never cut. */
.facts { display: flex; flex-wrap: wrap; column-gap: 0.9em; overflow: hidden; min-width: 0; color: var(--color-text-muted); font-size: 0.86rem; line-height: 1.3; }
.host { overflow: hidden; max-width: 100%; white-space: nowrap; text-overflow: ellipsis; }
/* The dot between the two hangs before the count: gone to the line below, it falls out of the frame. */
.seats { position: relative; white-space: nowrap; }
.seats::before { content: '·'; position: absolute; left: -0.6em; }
/* A room that plays: quieter, and it says what it is doing. */
.playing { border-style: dashed; }
.status { color: var(--color-text); font-size: 0.86rem; font-style: italic; line-height: 1.25; }
.enter { flex: none; }
.full { flex: none; padding: 0 0.6rem; color: var(--color-text-muted); font-weight: 700; }
</style>
