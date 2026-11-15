import { computed, ref } from 'vue';

const STORAGE_KEY = 'casserolade-effets-visuels';

function storedChoice(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? null : stored === '1';
  } catch {
    return null;
  }
}

function systemAsksForLessMotion(): boolean {
  return typeof window !== 'undefined' && 'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The show around the play: the set's flashes and faltering lights, its moving details, the shaking camera, the
 * exploding deaths, the bursts. Off, the table stays steady: for photosensitive players, tired eyes and slow machines.
 * On at first, unless the system asks for less motion; the player's choice is kept for the next visit.
 */
function createVisualEffects() {
  const on = ref(storedChoice() ?? !systemAsksForLessMotion());
  const calm = computed(() => !on.value);

  function set(value: boolean): void {
    on.value = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch (error) {
      console.error('Visual effects setting could not be saved', error);
    }
  }

  return { on, calm, set };
}

export const visualEffects = createVisualEffects();
