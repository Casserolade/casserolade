import type { CombatEvent, CombatUnit, Keyword } from './types.ts';

export type CombatSides = [CombatUnit[], CombatUnit[]];

function updateUnit(sides: CombatSides, uid: number, change: (u: CombatUnit) => CombatUnit): CombatSides {
  return [
    sides[0].map((u) => (u.uid === uid ? change(u) : u)),
    sides[1].map((u) => (u.uid === uid ? change(u) : u)),
  ];
}

function removeUnit(sides: CombatSides, uid: number): CombatSides {
  return [sides[0].filter((u) => u.uid !== uid), sides[1].filter((u) => u.uid !== uid)];
}

function withoutKeyword(u: CombatUnit, keyword: Keyword): CombatUnit {
  return { ...u, keywords: u.keywords.filter((k) => k !== keyword) };
}

function insertUnit(sides: CombatSides, side: 0 | 1, index: number, unit: CombatUnit): CombatSides {
  const next: CombatSides = [[...sides[0]], [...sides[1]]];
  next[side].splice(index, 0, unit);
  return next;
}

/**
 * Applique un événement du journal à l'état du combat, sans simuler quoi que ce soit.
 * C'est tout ce dont le client a besoin : aucune règle de combat n'est dupliquée ici.
 */
export function applyCombatEvent(sides: CombatSides, ev: CombatEvent): CombatSides {
  switch (ev.e) {
    case 'debut':
    case 'fin':
      return ev.sides;
    case 'degats':
      return updateUnit(sides, ev.uid, (u) => ({ ...u, hp: ev.hp }));
    case 'retour':
      return updateUnit(sides, ev.uid, (u) => ({ ...withoutKeyword(u, 'retour'), hp: ev.hp }));
    case 'immunite':
      return updateUnit(sides, ev.uid, (u) => withoutKeyword(u, 'immunite'));
    case 'polemique':
      return updateUnit(sides, ev.uid, (u) => ({ ...u, hp: 0 }));
    case 'stats':
      return updateUnit(sides, ev.uid, (u) => ({ ...u, atk: ev.atk, hp: ev.hp }));
    case 'mot_cle':
      return updateUnit(sides, ev.uid, (u) =>
        ev.gain ? { ...u, keywords: [...u.keywords, ev.keyword] } : withoutKeyword(u, ev.keyword),
      );
    case 'mort':
      return ev.revient ? sides : removeUnit(sides, ev.uid);
    case 'exil':
      return removeUnit(sides, ev.uid);
    case 'invocation':
      return insertUnit(sides, ev.side, ev.index, ev.unit);
    case 'attaque':
    case 'resiste':
    case 'effet':
    case 'penalite':
    case 'celebration':
    case 'reponse':
      return sides;
  }
}
