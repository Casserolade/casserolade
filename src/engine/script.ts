import { addStats, boardLimit, dropDiscovers, handIsFull, makeGolden, releaseMinion, returnToPool } from './recruit.ts';
import { copyMinion } from './game.ts';
import { CARD_BY_ID } from '../data/cards.ts';
import type { CombatRecord, Game, Player, Quest, ScriptEvent, ScriptRules } from './state.ts';
import type { CombatSide, Minion } from './types.ts';

/**
 * Ce qu'une carrière fait arriver à un siège (8 et 9 novembre 2026) : en début de manche, un autre pouvoir, des
 * sondages, du budget, un politique qui part et revient, un rival qui quitte la table ; et, tout le chapitre, ses règles
 * (`ScriptRules`) : une quête qui compte les combats gagnés, un retour, un échelon bloqué, un renvoi qui rapporte.
 * Tout se joue ici, dans le moteur : le même journal rejoue la même partie.
 */

function scriptedPlayer(game: Game): Player | null {
  const seat = game.script?.seat;
  return seat === undefined ? null : (game.players[seat] ?? null);
}

function rulesFor(game: Game, p: Player): ScriptRules | null {
  return game.script && game.script.seat === p.seat ? (game.script.regles ?? null) : null;
}

/** La quête de départ d'un siège, d'après ses règles : un compteur, ou « devant » un rival. */
export function startingQuest(rules: ScriptRules | undefined, heroName: (id: string) => string): Quest | null {
  if (rules?.compteur) {
    const c = rules.compteur;
    return { libelle: c.libelle, valeur: 0, cible: c.cible, defaites: 0, etat: 'en_cours', eliminatoire: c.eliminatoire, decisive: false };
  }
  if (rules?.devant) return { libelle: `Devant ${heroName(rules.devant)}`, valeur: 0, cible: 1, defaites: 0, etat: 'en_cours', eliminatoire: false, decisive: true };
  return null;
}

/** Hors de la table, avec cette place : ses exemplaires retournent à la réserve, il garde son dernier plateau. */
export function retire(game: Game, p: Player, place: number): void {
  p.alive = false;
  p.place = place;
  for (const m of [...p.board, ...p.hand, ...p.away.map((a) => a.minion)]) releaseMinion(game, m);
  for (const id of p.shop) returnToPool(game, id);
  dropDiscovers(game, p);
  p.shop = [];
  p.away = [];
}

const power = (m: Minion): number => m.atk + m.hp;

/** Ce qu'une carrière fait arriver au siège en début de manche, puis le retour de ceux qui étaient partis. */
export function followEvents(game: Game, p: Player): void {
  if (!game.script || game.script.seat !== p.seat) return;
  p.events = [];
  comeBack(game, p);
  const event = game.script.evenements?.[game.round];
  const rebate = game.script.regles?.echelon;
  if (rebate && game.round === rebate.apres) p.upgradeCost = Math.max(0, p.upgradeCost - rebate.remise);
  if (event?.mods) p.hero = { ...p.hero, mods: { ...event.mods } };
  if (!event) return;
  if (event.sondages) p.hp = Math.max(1, p.hp + event.sondages);
  if (event.budget) p.budget = Math.max(0, p.budget + event.budget);
  if (event.enleve) takeAway(p, event.enleve);
  if (event.abandon) abandon(game, p);
}

/**
 * Un politique quitte le plateau pour un temps (en cellule, enlevé par une soucoupe) : une vraie carte d'abord, et jamais
 * un politique déjà doré quand il doit revenir doré. Personne ne part si personne ne le peut.
 */
function takeAway(p: Player, rule: NonNullable<ScriptEvent['enleve']>): void {
  const { quoi, retour, dore = false, bonus = 0 } = rule;
  const cards = p.board.filter((m) => CARD_BY_ID[m.cardId] && !m.token && !m.simple && !(dore && m.golden));
  const candidates = cards.length > 0 || dore ? cards : p.board;
  const taken = [...candidates].sort((a, b) => (quoi === 'plus_fort' ? power(b) - power(a) : power(a) - power(b)) || a.uid - b.uid)[0];
  if (!taken) return;
  p.board = p.board.filter((m) => m !== taken);
  p.away.push({ minion: taken, back: retour, golden: dore, bonus });
  p.events.push({ key: 'enleve', cardId: taken.cardId });
}

/** Ceux dont c'est la manche reviennent, dorés ou renforcés pour de bon : sur le plateau, sinon en main, sinon plus tard. */
function comeBack(game: Game, p: Player): void {
  for (const away of [...p.away]) {
    if (away.back > game.round) continue;
    const toBoard = p.board.length < boardLimit(game, p);
    if (!toBoard && handIsFull(game, p)) continue;
    const m = away.minion;
    if (away.golden && !m.golden && CARD_BY_ID[m.cardId]) makeGolden(p, m);
    if (away.bonus) addStats(m, away.bonus, away.bonus);
    (toBoard ? p.board : p.hand).push(m);
    p.away = p.away.filter((x) => x !== away);
    p.events.push({ key: 'revient', cardId: m.cardId });
  }
}

/** L'adversaire du dernier siège quitte la table, s'il en reste au moins deux autres en lice. */
function abandon(game: Game, p: Player): void {
  const alive = game.players.filter((x) => x.alive);
  const leaving = [...game.players].reverse().find((x) => x.alive && x !== p);
  if (!leaving || alive.length < 3) return;
  game.lastEliminated = { heroId: leaving.hero.id, board: leaving.board.map(copyMinion) };
  retire(game, leaving, alive.length);
  p.events.push({ key: 'abandon' });
}

/** Monter d'échelon : refusé avant la manche dite, avec son motif. */
export function upgradeLock(game: Game, p: Player): string | null {
  const rule = rulesFor(game, p)?.echelon;
  return rule && game.round < rule.apres ? rule.motif : null;
}

/** Ce que l'échelon coûte de moins, une fois le blocage levé. */
export function upgradeRebate(game: Game, p: Player): number {
  const rule = rulesFor(game, p)?.echelon;
  return rule && game.round >= rule.apres ? rule.remise : 0;
}

/** Le budget en plus d'un renvoi, quand la carrière fait payer ce camp. */
export function sellBonus(game: Game, p: Player, m: Minion): number {
  const rule = rulesFor(game, p)?.renvoi;
  return rule && m.camp === rule.camp ? rule.budget : 0;
}

/** Lassalle chante : le premier politique adverse perd ses effets pour ce combat. Son plateau, lui, ne change pas. */
export function silencedSide(game: Game, side: CombatSide, opponentSeat: number | null): CombatSide {
  const p = opponentSeat === null ? null : game.players[opponentSeat];
  if (!p || !rulesFor(game, p)?.silenceAdverse || side.minions.length === 0) return side;
  const [first, ...rest] = side.minions;
  return { ...side, minions: [{ ...first, effects: [] }, ...rest] };
}

/** Après les combats de la manche, avant les éliminations : la quête avance, le retour sauve. */
export function afterScriptedCombats(game: Game): void {
  const p = scriptedPlayer(game);
  const rules = p && rulesFor(game, p);
  if (!p || !rules || !p.alive) return;
  const record = game.roundCombats.find((c) => c.a === p.seat || c.b === p.seat);
  if (rules.compteur && p.quest?.etat === 'en_cours') countCombat(game, p, rules, record);
  if (rules.retour && !p.comebackUsed && p.hp <= 0 && p.quest?.etat !== 'ratee') {
    p.hp = rules.retour;
    p.comebackUsed = true;
    p.events.push({ key: 'retour' });
  }
}

function countCombat(game: Game, p: Player, rules: ScriptRules, record: CombatRecord | undefined): void {
  const c = rules.compteur!;
  const q = p.quest!;
  const side = record?.a === p.seat ? 0 : 1;
  const won = record !== undefined && record.result.winner === side;
  const lost = record !== undefined && record.result.winner !== null && record.result.winner !== side;
  const counted = game.round >= (c.de ?? 1) && game.round <= (c.a ?? Number.MAX_SAFE_INTEGER);
  if (counted && won) {
    q.valeur = Math.min(q.cible, q.valeur + c.parVictoire);
    p.events.push({ key: 'quete' });
  }
  if (counted && lost) q.defaites++;
  if (q.valeur >= q.cible) {
    q.etat = 'reussie';
    p.events.push({ key: 'quete_reussie' });
    if (c.recompense?.sondages) p.hp += c.recompense.sondages;
    if (c.recompense?.budget) p.nextBudgetBonus += c.recompense.budget;
    return;
  }
  const failed = (counted && c.sansFaute && !won) || (c.defaitesMax !== undefined && q.defaites >= c.defaitesMax) || (c.avant !== undefined && game.round >= c.avant);
  if (!failed) return;
  q.etat = 'ratee';
  p.events.push({ key: 'quete_ratee' });
  if (c.eliminatoire) p.hp = Math.min(p.hp, 0);
}

/** Après les éliminations : « devant » se décide, la séance est levée, ou la partie s'arrête à son heure. */
export function afterScriptedEliminations(game: Game): void {
  const p = scriptedPlayer(game);
  const rules = p && rulesFor(game, p);
  if (!p || !rules) return;
  if (rules.devant && p.quest?.etat === 'en_cours') settleRivalry(game, p, rules.devant);
  const adjourned = rules.compteur?.fin && p.alive && p.quest?.etat === 'reussie';
  if (adjourned) closeTable(game, p);
  else if (rules.finApres !== undefined && game.round >= rules.finApres && game.players.some((x) => x.alive)) closeTable(game, null);
}

function settleRivalry(game: Game, p: Player, heroId: string): void {
  const rival = game.players.find((x) => x !== p && x.hero.id === heroId);
  const q = p.quest!;
  if (!rival) return;
  const ahead = !rival.alive && (p.alive || p.place < rival.place);
  const behind = !p.alive && (rival.alive || rival.place < p.place);
  if (!ahead && !behind) return;
  q.etat = ahead ? 'reussie' : 'ratee';
  q.valeur = ahead ? 1 : 0;
  p.events.push({ key: ahead ? 'quete_reussie' : 'quete_ratee' });
}

/**
 * La partie s'arrête : ceux qui sont encore en lice sont classés par sondages, puis par les stats de leur plateau. Un
 * siège désigné (la séance levée par sa victoire) prend la première place. Seul le premier reste en lice.
 */
function closeTable(game: Game, winner: Player | null): void {
  const strength = (x: Player): number => x.board.reduce((sum, m) => sum + m.atk + m.hp, 0);
  const alive = game.players.filter((x) => x.alive);
  alive.sort((a, b) => Number(b === winner) - Number(a === winner) || b.hp - a.hp || strength(b) - strength(a) || a.seat - b.seat);
  alive.forEach((x, i) => {
    if (i === 0) x.place = 1;
    else retire(game, x, i + 1);
  });
}
