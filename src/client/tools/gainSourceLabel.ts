import { CARD_BY_ID, RESERVE_CARDS, TOKENS } from '#src/data/cards.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import { CONTEXTS, HERO_BY_ID } from '#src/data/heroes.ts';
import { SPELL_BY_ID } from '#src/data/sorts.ts';
import { parseGainSource } from '#src/engine/gains.ts';

/** The source the client adds itself: what the combat on screen gave so far. */
export const DEBATE_SOURCE = 'debat';

const RESERVE_NAMES = new Map(RESERVE_CARDS.map((card) => [card.id, card.name]));

function cardName(id: string): string {
  return CARD_BY_ID[id]?.name ?? TOKENS[id]?.name ?? RESERVE_NAMES.get(id) ?? id;
}

/**
 * Who gave a bonus, as the card's sheet names it: the politician, the spell (with how many times it was played), the
 * casserole, the rallied card, the hero's power.
 */
export function gainSourceLabel(source: string, times = 1): string {
  const { kind, id } = parseGainSource(source);
  switch (kind) {
    case 'carte':
      return cardName(id);
    case 'sort': {
      const name = SPELL_BY_ID[id]?.name ?? id;
      return times > 1 ? `${name} ×${times}` : name;
    }
    case 'casserole':
      return `${CASSEROLE_BY_ID[id]?.name ?? id} (casserole)`;
    case 'ralliement':
      return `Rallié : ${cardName(id)}`;
    case 'heros':
      return `${HERO_BY_ID[id]?.power ?? id} (héros)`;
    case 'contexte':
      return CONTEXTS.find((context) => context.id === id)?.name ?? id;
    case 'carriere':
      return 'Carrière';
    case 'retour':
      return 'Retour en politique';
    case DEBATE_SOURCE:
      return 'Ce débat';
    default:
      return 'Autres';
  }
}
