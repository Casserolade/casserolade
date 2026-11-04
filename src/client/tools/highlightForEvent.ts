import type { CombatEvent } from '#src/engine/types.ts';

export type UnitHighlight = 'attacking' | 'hit' | 'immune' | 'dead' | 'back' | 'triggered' | 'buffed';

/** Which unit the current event is about, and how. No event, no highlight. */
export function highlightForEvent(event: CombatEvent | null): Map<number, UnitHighlight> {
  const highlights = new Map<number, UnitHighlight>();
  if (!event) return highlights;
  switch (event.e) {
    case 'attaque':
      highlights.set(event.from, 'attacking');
      highlights.set(event.to, 'hit');
      break;
    case 'degats':
    case 'polemique':
      highlights.set(event.uid, 'hit');
      break;
    case 'immunite':
    case 'resiste':
      highlights.set(event.uid, 'immune');
      break;
    case 'mort':
    case 'exil':
      highlights.set(event.uid, 'dead');
      break;
    case 'retour':
      highlights.set(event.uid, 'back');
      break;
    case 'effet':
      highlights.set(event.uid, 'triggered');
      break;
    case 'stats':
    case 'mot_cle':
      highlights.set(event.uid, 'buffed');
      break;
    default:
      break;
  }
  return highlights;
}
