<script setup lang="ts">
import RankBadge from '#src/client/components/atoms/RankBadge.vue';
import ModerationButtons from '#src/client/components/molecules/ModerationButtons.vue';
import TableSeat from '#src/client/components/molecules/TableSeat.vue';
import type { VueSalon } from '#src/protocol/messages.ts';

type Player = VueSalon['joueurs'][number];

/**
 * The seats of a room's table: the humans who came, each with its rank once it has one, and the bots that fill the
 * rest. `muted`: the pseudos whose chat
 * the host cut. `moderated`: the reader is the host, and each other human carries what mutes or puts it out.
 */
const props = withDefaults(defineProps<{ players: Player[]; host: number; seat: number; muted?: string[]; moderated?: boolean }>(), { muted: () => [], moderated: false });
const emit = defineEmits<{ mute: [pseudo: string, muted: boolean]; kick: [pseudo: string] }>();

function isMuted(player: Player): boolean {
  return !player.bot && props.muted.includes(player.pseudo);
}

function note(player: Player): string {
  if (player.bot) return 'bot';
  const tags = [player.siege === props.host ? 'hôte' : null, player.siege === props.seat ? 'vous' : null, player.connecte ? null : 'déconnecté', isMuted(player) ? 'chat coupé' : null];
  return tags.filter(Boolean).join(' · ');
}
</script>

<template>
  <ol class="seats">
    <TableSeat
      v-for="player in players"
      :key="player.siege"
      :name="player.pseudo"
      :note="note(player)"
      :kind="player.bot ? 'bot' : 'human'"
      :me="player.siege === seat"
      :lit="!player.bot && player.connecte"
    >
      <template v-if="player.mmr !== undefined" #rank><RankBadge :mmr="player.mmr" /></template>
      <template v-if="moderated && !player.bot && player.siege !== seat" #actions>
        <ModerationButtons :pseudo="player.pseudo" :muted="isMuted(player)" @mute="(muted) => emit('mute', player.pseudo, muted)" @kick="emit('kick', player.pseudo)" />
      </template>
    </TableSeat>
  </ol>
</template>

<style scoped>
.seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem; }
</style>
