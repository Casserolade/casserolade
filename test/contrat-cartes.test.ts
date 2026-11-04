import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCombat } from '../src/engine/combat.ts';
import { applyAction, createGame } from '../src/engine/game.ts';
import type { Game, Player } from '../src/engine/game.ts';
import { makeMinion, makeToken } from '../src/engine/minion.ts';
import { addMinionToHand, addSpellToHand, afterCombatSpeech, endOfTurn, startOfTurn } from '../src/engine/recruit.ts';
import { createRng } from '../src/engine/rng.ts';
import type { Camp, Card, CombatEvent, CombatUnit, Minion, Trigger } from '../src/engine/types.ts';
import { CARDS, CARD_BY_ID, PARTY_CAMPS } from '../src/data/cards.ts';

/*
 * Le contrat du contenu : chaque texte de carte change quelque chose. Pour chaque carte et chaque
 * déclencheur de ses effets, deux mondes identiques (même graine, mêmes alliés, même main) : l'un avec la
 * carte entière, l'autre avec la même carte privée des seuls effets de ce déclencheur. On le déclenche dans
 * les deux, de la même façon, en trois variantes. Si rien ne diffère jamais, ce texte ne fait rien : c'est
 * un bug de contenu (ou du moteur), et le test le nomme. Les quelques textes qui ne jouent que dans une
 * situation rare sont listés à part, chacun avec sa raison.
 */
const COMBAT_TRIGGERS: Trigger[] = ['debut_combat', 'heritage', 'riposte', 'meeting', 'tue', 'revanche', 'immunite_perdue'];
const VARIANTS = 3;
/** Les alliés de tous les mondes : un Fin de tour, une Immunité. */
const FIXED_ALLIES = ['durif', 'gueant'];
/** Des textes qui ne jouent que dans une situation que ce banc ne construit pas : chacun sa raison. */
const SITUATIONAL: Record<string, string> = {};

interface World {
  game: Game;
  p: Player;
  x: Minion;
  allies: Minion[];
}

function world(card: Card, when: Trigger, keepTrigger: boolean, variant: number): World {
  const camp: Camp = card.camp === 'civile' ? 'socialistes' : card.camp;
  const camps = [...new Set<Camp>([camp, 'rn', 'macronie', 'republicains', ...PARTY_CAMPS])].slice(0, 5);
  const game = createGame({ seed: 17 + variant * 101, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: camps });
  const p = game.players[0];
  p.budget = 40;
  p.tier = Math.max(card.tier, 3);
  // Ni Ralliement ni allié fixe : un troisième exemplaire, en jeu, ferait un triple et changerait le monde.
  const sameCamp = CARDS.filter((c) => c.camp === card.camp && c.id !== card.id && c.tier <= 3 && !c.token && !c.keywords?.includes('ralliement') && !FIXED_ALLIES.includes(c.id))
    .sort((a, b) => (a.effects?.length ?? 0) - (b.effects?.length ?? 0))[0]?.id ?? 'thevenoud';
  const allies: Minion[] = [];
  for (const id of [sameCamp, ...FIXED_ALLIES]) {
    const m = addMinionToHand(game, p, id);
    if (!m) continue;
    p.hand = p.hand.filter((h) => h !== m);
    p.board.push(m);
    allies.push(m);
  }
  allies[1].golden = true;
  allies[1].copies = 3;
  for (const a of allies) {
    a.atk += 3;
    a.hp += 3;
  }
  // Le premier allié a rallié Aurore Bergé : un Ralliement pour ce qui les compte, un Héritage pour ce qui les relance.
  const berge = addMinionToHand(game, p, 'berge');
  if (berge) applyAction(game, 0, { t: 'play', uid: berge.uid, onto: allies[0].uid });
  addMinionToHand(game, p, sameCamp);
  addSpellToHand(game, p, 'tract');
  const x = addMinionToHand(game, p, card.id) ?? (() => {
    const made = makeMinion(card, game.nextUid++);
    p.hand.push(made);
    return made;
  })();
  if (!keepTrigger) x.effects = x.effects.filter((e) => e.when !== when);
  if (when === 'immunite_perdue' && !x.keywords.includes('immunite')) x.keywords.push('immunite');
  // Une Revanche peut viser un mort précis : des Suppléants, le jeton le plus courant, sont là pour tomber. Et il faut
  // survivre aux morts qu'on venge : la carte testée reçoit +20 PV, comme on donne l'Immunité à qui la perd.
  if (when === 'revanche') {
    for (let k = 0; k < 3; k++) p.board.push(makeToken('suppleant', camp, game.nextUid++));
    x.hp += 20;
  }
  if (when !== 'annonce') {
    p.hand = p.hand.filter((h) => h !== x);
    p.board.splice(variant % (p.board.length + 1), 0, x);
  }
  return { game, p, x, allies };
}

/**
 * Ce que le joueur a : tout ce qu'un effet de recrutement peut changer. Les effets du politique testé n'y
 * sont pas : il en a moins dans le second monde, par construction, et le comparer rendrait tout vivant.
 */
function recruitSignature(game: Game, p: Player, tested: number): string {
  const minion = (m: Minion) => [m.uid, m.cardId, m.atk, m.hp, [...m.keywords].sort(), m.golden, m.uid === tested ? null : m.effects.length];
  return JSON.stringify({
    board: p.board.map(minion), hand: p.hand.map(minion), spells: p.spells.map((s) => [s.spellId, s.casseroleId, s.count]),
    budget: p.budget, next: p.nextBudgetBonus, free: p.freeRolls, tract: p.tract, camp: p.campBuffs, shopBuffs: p.shopBuffs,
    discover: [p.discover, ...p.discoverQueue], counters: p.counters, max: p.maxBudgetBonus, bet: p.lossBet, shop: p.shop, tier: p.tier,
    pool: [...game.pool.entries()].filter(([, n]) => n > 0).length,
  });
}

// Du plus faible au plus fort : le dernier tue assez d'alliés pour une Revanche (3).
const ENEMIES = [['retailleau'], ['thevenoud', 'gueant'], ['hollande', 'sarkozy', 'retailleau', 'jmlp', 'marechal']];

/**
 * Les conséquences d'un combat, et seulement elles : un effet qui se déclenche sans rien changer (+0/+0,
 * un mot-clé déjà là) n'y laisse aucune trace. Les stats et les mots-clés de chacun, quand ils changent
 * vraiment ; les morts, invocations, exils et pénalités ; l'état final et le résultat.
 */
function consequences(log: CombatEvent[]): string[] {
  const stats = new Map<number, string>();
  const keywords = new Map<number, Set<string>>();
  const out: string[] = [];
  const meet = (u: CombatUnit) => {
    stats.set(u.uid, `${u.atk}/${u.hp}`);
    keywords.set(u.uid, new Set(u.keywords));
  };
  for (const e of log) {
    if (e.e === 'debut') e.sides.flat().forEach(meet);
    else if (e.e === 'stats') {
      const now = `${e.atk}/${e.hp}`;
      if (stats.get(e.uid) !== now) out.push(`stats ${e.uid} ${now}`);
      stats.set(e.uid, now);
    } else if (e.e === 'degats') {
      stats.set(e.uid, `${stats.get(e.uid)?.split('/')[0]}/${e.hp}`);
      out.push(`degats ${e.uid} ${e.value}`);
    } else if (e.e === 'mot_cle') {
      const set = keywords.get(e.uid) ?? new Set<string>();
      if (set.has(e.keyword) !== e.gain) out.push(`${e.gain ? '+' : '-'}${e.keyword} ${e.uid}`);
      if (e.gain) set.add(e.keyword);
      else set.delete(e.keyword);
      keywords.set(e.uid, set);
    } else if (e.e === 'invocation') {
      meet(e.unit);
      out.push(`invocation ${e.unit.cardId} ${e.unit.atk}/${e.unit.hp}`);
    } else if (e.e === 'fin') {
      out.push(JSON.stringify(e.sides.map((side) => side.map((u) => [u.uid, u.cardId, u.atk, u.hp, [...u.keywords].sort()]))));
    } else if (e.e !== 'effet') {
      out.push(JSON.stringify(e));
    }
  }
  return out;
}

/** Ce qu'un combat donne : ses conséquences, le vainqueur, les dégâts, les gains durables, Célébration et Droit de réponse. */
function combatSignature(w: World, variant: number): string {
  const enemies = ENEMIES[variant].map((id, k) => makeMinion(CARD_BY_ID[id], 900 + k));
  const result = resolveCombat(
    { minions: w.p.board, mods: {}, hp: 30, tier: w.p.tier, tract: w.p.tract, campBuffs: w.p.campBuffs },
    { minions: enemies, mods: {}, hp: 30, tier: 3 },
    { params: w.game.params, ctx: w.game.ctx, rng: createRng(5 + variant), log: true },
  );
  const { winner, survivors, persist, bonusDamage, deathPenalty, celebrants, responder } = result;
  return JSON.stringify({ winner, survivors, persist, bonusDamage, deathPenalty, celebrants, responder, consequences: consequences(result.log) });
}

/** Le déclencheur, joué de la même façon dans les deux mondes. */
function fire(w: World, when: Trigger, variant: number): string {
  const { game, p, x, allies } = w;
  if (COMBAT_TRIGGERS.includes(when)) return combatSignature(w, variant);
  switch (when) {
    case 'annonce':
      applyAction(game, 0, { t: 'play', uid: x.uid, to: 1, target: allies[variant % allies.length].uid });
      break;
    case 'fin_tour':
      endOfTurn(game, p);
      break;
    case 'debut_tour':
      startOfTurn(game, p);
      break;
    case 'joue': {
      const other = p.hand.find((m) => m.uid !== x.uid);
      if (other) applyAction(game, 0, { t: 'play', uid: other.uid });
      break;
    }
    case 'vente':
      applyAction(game, 0, { t: 'sell', uid: x.uid });
      break;
    case 'vente_allie':
      applyAction(game, 0, { t: 'sell', uid: allies[2].uid });
      break;
    case 'sort': {
      const tract = p.spells.find((s) => s.spellId === 'tract');
      if (tract) applyAction(game, 0, { t: 'cast', uid: tract.uid, target: allies[variant % allies.length].uid });
      break;
    }
    case 'actualise':
      applyAction(game, 0, { t: 'roll' });
      break;
    case 'debauche': {
      const poacher = addMinionToHand(game, p, 'houssin');
      if (poacher) applyAction(game, 0, { t: 'play', uid: poacher.uid });
      break;
    }
    case 'rallie': {
      const rally = addMinionToHand(game, p, 'castaner');
      if (rally) applyAction(game, 0, { t: 'play', uid: rally.uid, onto: allies[variant % allies.length].uid });
      break;
    }
    case 'casserole_recue': {
      p.spells.push({ uid: game.nextUid++, casseroleId: 'homards' });
      const carrier = variant === 0 ? x : allies[variant % allies.length];
      applyAction(game, 0, { t: 'cast', uid: p.spells[p.spells.length - 1].uid, target: carrier.uid });
      break;
    }
    case 'depense':
      applyAction(game, 0, { t: 'buy', slot: 0, main: true });
      applyAction(game, 0, { t: 'buy', slot: 0, main: true });
      break;
    case 'celebration':
    case 'droit_de_reponse':
      afterCombatSpeech(game, p, x.uid, when);
      break;
    default:
      return '';
  }
  return recruitSignature(game, p, x.uid);
}

test('chaque texte de carte change quelque chose : aucun déclencheur mort', () => {
  const dead: string[] = [];
  for (const card of CARDS) {
    for (const when of new Set((card.effects ?? []).map((e) => e.when))) {
      if (when === 'aura') continue;
      const alive = Array.from({ length: VARIANTS }, (_, variant) => fire(world(card, when, true, variant), when, variant) !== fire(world(card, when, false, variant), when, variant)).some(Boolean);
      if (!alive) dead.push(`${card.id} ${when}`);
    }
  }
  assert.deepEqual(dead.filter((key) => !SITUATIONAL[key]), [], 'des textes qui ne font rien');
});
