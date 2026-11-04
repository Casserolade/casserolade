import type { CombatEvent, CombatUnit } from '#src/engine/types.ts';
import type { CombatSides } from '#src/engine/replay.ts';
import { KEYWORD_RULES } from '#src/client/const/keywordRules.ts';
import { describeEffect } from '#src/client/tools/describeEffect.ts';

function findName(sides: CombatSides, uid: number): string {
  const unit: CombatUnit | undefined = [...sides[0], ...sides[1]].find((u) => u.uid === uid);
  return unit?.name ?? 'Un politique';
}

/**
 * One line for the combat ticker. `sides` is the state before the event, so that
 * a unit leaving the board can still be named.
 */
export function narrateCombatEvent(event: CombatEvent, sides: CombatSides): string {
  switch (event.e) {
    case 'debut':
      return 'Le débat commence.';
    case 'attaque':
      return `${findName(sides, event.from)} s'en prend à ${findName(sides, event.to)}.`;
    case 'degats':
      return `${findName(sides, event.uid)} perd ${event.value} PV.`;
    case 'immunite':
      return `${findName(sides, event.uid)} invoque son immunité.`;
    case 'polemique':
      return `La polémique de ${findName(sides, event.from)} détruit ${findName(sides, event.uid)}.`;
    case 'resiste':
      return `${findName(sides, event.uid)} survit à la polémique.`;
    case 'stats':
      return `${findName(sides, event.uid)} passe à ${event.atk}/${event.hp}.`;
    case 'mot_cle':
      return `${findName(sides, event.uid)} ${event.gain ? 'gagne' : 'perd'} ${KEYWORD_RULES[event.keyword].label}.`;
    case 'effet':
      return `${findName(sides, event.uid)} : ${describeEffect(event.effect).replaceAll('**', '')}`;
    case 'mort':
      return `${findName(sides, event.uid)} est à terre.`;
    case 'retour':
      return `${findName(sides, event.uid)} fait son retour en politique.`;
    case 'penalite':
      return `Cette mort coûte ${event.value} sondages.`;
    case 'invocation':
      return `${event.unit.name} arrive sur le plateau.`;
    case 'exil':
      return `${findName(sides, event.uid)} quitte le plateau.`;
    case 'fin':
      return 'Le débat est terminé.';
    case 'celebration':
      return `${findName(sides, event.uid)} célèbre la victoire.`;
    case 'reponse':
      return `${findName(sides, event.uid)} exerce son droit de réponse.`;
  }
}
