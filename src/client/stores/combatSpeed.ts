import { ref } from 'vue';

const SPEED_KEY = 'casserolade-vitesse-combat';
/** The paces a combat can be watched at, from the buttons ×1, ×2 and ×4. */
export const COMBAT_SPEEDS = [1, 2, 4];

function readSpeed(): number {
  try {
    const stored = Number(localStorage.getItem(SPEED_KEY));
    return COMBAT_SPEEDS.includes(stored) ? stored : 1;
  } catch {
    return 1;
  }
}

/**
 * The pace the player chose with the buttons: the next combats start at it, on later visits too (a convenience of this
 * browser only). A tap that hurries one combat along does not change it.
 */
function createCombatSpeed() {
  const chosen = ref(readSpeed());

  function choose(speed: number): void {
    chosen.value = speed;
    try {
      localStorage.setItem(SPEED_KEY, String(speed));
    } catch (error) {
      console.error('Combat speed could not be saved', error);
    }
  }

  return { chosen, choose };
}

export const combatSpeed = createCombatSpeed();
