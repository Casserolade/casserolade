<script setup lang="ts">
import ModerationButtons from '#src/client/components/molecules/ModerationButtons.vue';
import TableSeat from '#src/client/components/molecules/TableSeat.vue';

/**
 * Those who came into the room during its game: without a seat in it, they talk with the table and play the next.
 * `muted` and `moderated`: as for the seats of the table.
 */
const props = withDefaults(defineProps<{ pseudos: string[]; me: string; muted?: string[]; moderated?: boolean }>(), { muted: () => [], moderated: false });
const emit = defineEmits<{ mute: [pseudo: string, muted: boolean]; kick: [pseudo: string] }>();

function note(pseudo: string): string {
  return [pseudo === props.me ? 'vous' : null, props.muted.includes(pseudo) ? 'chat coupé' : null].filter(Boolean).join(' · ');
}
</script>

<template>
  <section class="waiting-list" aria-labelledby="waiting-list-title">
    <h3 id="waiting-list-title">Pour la partie suivante</h3>
    <ol class="seats">
      <TableSeat v-for="pseudo in pseudos" :key="pseudo" :name="pseudo" :note="note(pseudo)" :me="pseudo === me" lit>
        <template v-if="moderated && pseudo !== me" #actions>
          <ModerationButtons :pseudo="pseudo" :muted="muted.includes(pseudo)" @mute="(on) => emit('mute', pseudo, on)" @kick="emit('kick', pseudo)" />
        </template>
      </TableSeat>
    </ol>
  </section>
</template>

<style scoped>
.waiting-list { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; margin-top: 0.2rem; }
h3 { margin: 0; color: var(--color-title); font: 400 1.1rem / 1 var(--font-number); letter-spacing: 1px; }
.seats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
</style>
