<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import HomeChoice from '#src/client/components/molecules/HomeChoice.vue';
import HomeSide from '#src/client/components/molecules/HomeSide.vue';
import LiveTally from '#src/client/components/molecules/LiveTally.vue';
import OpenRoomForm from '#src/client/components/molecules/OpenRoomForm.vue';
import PublicRoomList from '#src/client/components/molecules/PublicRoomList.vue';
import RoomForm from '#src/client/components/molecules/RoomForm.vue';
import { RANKED_QUEUE_OPEN } from '#src/client/const/rankedQueue.ts';
import { defaultRoomName } from '#src/client/tools/defaultRoomName.ts';
import type { LiveTallyItem } from '#src/client/tools/liveTallyItems.ts';
import type { SalonPublic } from '#src/protocol/publicRooms.ts';

/**
 * Online, the first side of the home page, laid out like a lobby, in one panel: who is here right now; on the left
 * the public rooms, with at their foot what opens one's own; on the right, behind a
 * hairline, the private rooms, among friends. `pseudo`: the player's, which names the room it opens. The ranked games
 * only show once they open.
 */
const props = defineProps<{ pseudo: string; inviteCode: string; live: LiveTallyItem[]; rooms: SalonPublic[] }>();
/** `open`: a public room under this name. `create`: a private one. `join`: a room by its code, listed or given. */
const emit = defineEmits<{ open: [name: string]; create: []; join: [code: string]; queue: [] }>();

const suggestedName = computed(() => defaultRoomName(props.pseudo));
const openCount = computed(() => props.rooms.filter((room) => room.manche === null).length);
/** No room to walk into, and no friend's code in hand: opening one's own is what the page points at. */
const pointsAtOpening = computed(() => openCount.value === 0 && !props.inviteCode);
</script>

<template>
  <HomeSide title="En ligne" icon="people" highlighted :columns="1">
    <template #aside><LiveTally :items="live" /></template>
    <div class="lobby-box">
      <div class="lobby">
        <section class="open-rooms" aria-labelledby="open-rooms-title">
          <header class="section-head">
            <h3 id="open-rooms-title">Salons publics</h3>
            <span v-if="openCount" class="open-count">{{ openCount }} ouvert{{ openCount > 1 ? 's' : '' }}</span>
          </header>
          <PublicRoomList :rooms="rooms" @join="(code) => emit('join', code)" />
          <OpenRoomForm :suggested-name="suggestedName" :primary="pointsAtOpening" @open="(name) => emit('open', name || suggestedName)" />
        </section>
        <section class="friends" aria-labelledby="friends-title">
          <h3 id="friends-title">Entre amis</h3>
          <RoomForm :invite-code="inviteCode" @create="emit('create')" @join="(code) => emit('join', code)" />
        </section>
      </div>
    </div>
    <HomeChoice v-if="RANKED_QUEUE_OPEN" title="Partie classée">
      <p>Des inconnus de votre niveau, avec un classement. Si la table vote pour, des bots prennent les places vides.</p>
      <AppButton primary @click="emit('queue')">Entrer dans la file</AppButton>
    </HomeChoice>
  </HomeSide>
</template>

<style scoped>
/*
 * No frame inside the panel: two columns and a hairline between them, the public rooms and, narrower, the private
 * ones. On a narrow side (a phone), one under the other, the hairline lying down.
 */
.lobby-box { container-type: inline-size; display: grid; min-height: 0; }
.lobby { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.8rem; min-height: 0; }
.open-rooms, .friends { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; min-height: 0; }
.friends { padding-top: 0.8rem; border-top: 1px solid rgb(255 255 255 / 0.16); }
/* One under the other, nothing gives the list a height: it takes that of its rows, a little over four, and scrolls beyond. */
.open-rooms :deep(.rooms) { flex: none; min-height: 0; max-height: 17.5rem; }
.section-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.2rem 1rem; }
h3 { margin: 0; color: #fff; font: 400 1.3rem / 1.05 var(--font-number); letter-spacing: 0.5px; }
/* How many are open: a green light, and the number in words. */
.open-count { display: inline-flex; align-items: center; gap: 0.4em; color: var(--color-success); font-size: 0.86rem; font-weight: 700; }
.open-count::before { content: ''; width: 0.55em; height: 0.55em; border-radius: 50%; background: currentcolor; }
@container (min-width: 38rem) {
  .lobby { grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 1rem; }
  .friends { padding-top: 0; padding-left: 1rem; border-top: 0; border-left: 1px solid rgb(255 255 255 / 0.16); }
  /* Side by side, the list takes the height its column gives it. */
  .open-rooms :deep(.rooms) { flex: 1 1 0; min-height: 6.6rem; max-height: none; }
}
</style>
