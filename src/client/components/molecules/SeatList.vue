<script setup lang="ts">
import TableSeat from '#src/client/components/molecules/TableSeat.vue';
import type { VueSalon } from '#src/protocol/messages.ts';

/** The eight seats of a private room: the humans who came, and the bots that fill the rest. */
defineProps<{ players: VueSalon['joueurs']; host: number; seat: number }>();

function note(player: VueSalon['joueurs'][number], host: number, seat: number): string {
  if (player.bot) return 'bot';
  const tags = [player.siege === host ? 'hôte' : null, player.siege === seat ? 'vous' : null, player.connecte ? null : 'déconnecté'];
  return tags.filter(Boolean).join(' · ');
}
</script>

<template>
  <ol class="seats">
    <TableSeat
      v-for="player in players"
      :key="player.siege"
      :name="player.pseudo"
      :note="note(player, host, seat)"
      :kind="player.bot ? 'bot' : 'human'"
      :me="player.siege === seat"
      :lit="!player.bot && player.connecte"
    />
  </ol>
</template>

<style scoped>
.seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
</style>
