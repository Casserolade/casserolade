<script setup lang="ts">
import { computed } from 'vue';
import PublicRoomRow from '#src/client/components/molecules/PublicRoomRow.vue';
import { hasFreeSeat } from '#src/client/tools/hasFreeSeat.ts';
import type { SalonPublic } from '#src/protocol/publicRooms.ts';

/**
 * The public rooms open right now, on the home page: one walks into any of them. The first that waits and has a
 * seat left is the one the page points at. Without any room, it says so and what opening one means.
 */
const props = defineProps<{ rooms: SalonPublic[] }>();
const emit = defineEmits<{ join: [code: string] }>();

const pointedAt = computed(() => props.rooms.find((room) => room.manche === null && hasFreeSeat(room))?.code ?? null);
</script>

<template>
  <ul v-if="rooms.length" class="rooms" aria-label="Salons publics ouverts">
    <PublicRoomRow v-for="room in rooms" :key="room.code" :room="room" :primary="room.code === pointedAt" @join="emit('join', room.code)" />
  </ul>
  <div v-else class="none" role="status">
    <span class="lead">Aucun salon ouvert pour l'instant.</span>
    <span>Ouvrez le vôtre : tout le monde peut entrer, et vous lancez quand vous voulez, les bots aux places vides.</span>
  </div>
</template>

<style scoped>
/*
 * The list takes the height its column gives it, and scrolls beyond. The bar keeps its place even when nothing
 * scrolls: the rows do not jump when a room opens.
 */
.rooms { flex: 1 1 0; display: flex; flex-direction: column; gap: 0.4rem; min-height: 6.6rem; margin: 0; padding: 0 0.25rem 0 0; overflow-y: auto; scrollbar-gutter: stable; list-style: none; }
.none { flex: 1; min-height: 6.6rem; display: flex; flex-direction: column; justify-content: center; gap: 0.15rem; padding: 0.6rem 0.8rem; border-radius: 10px; border: 1px dashed rgb(255 255 255 / 0.2); color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.3; text-align: center; text-wrap: balance; }
.lead { color: var(--color-text); font-size: 0.98rem; font-weight: 700; }
</style>
