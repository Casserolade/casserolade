import { computed } from 'vue';
import { fetchPublicRooms } from '#src/client/services/publicRooms.ts';
import { useServerPoll } from '#src/client/stores/useServerPoll.ts';

/** A room that opens shows on the other home pages within this time. */
const REFRESH_MS = 5_000;

/**
 * The public rooms, for the home page: read on arrival, then every few seconds while the page is in view. Empty
 * until the server answered, and when it lists none.
 */
export function usePublicRooms() {
  const { latest } = useServerPoll(fetchPublicRooms, REFRESH_MS);
  const rooms = computed(() => latest.value ?? []);
  return { rooms };
}
