import type { Effect, Keyword, Minion, MinionGain } from './types.ts';
import { CARD_BY_ID, RESERVE_CARDS, TOKENS } from '../data/cards.ts';
import { CASSEROLE_BY_ID, RESERVE_CASSEROLES } from '../data/casseroles.ts';
import { SPELL_BY_ID } from '../data/sorts.ts';
import { effectOrigin, ownEffects } from './minion.ts';

/**
 * Le registre des gains : d'où vient ce qu'un politique a en plus de sa carte. Une ligne par source, qui s'additionne ;
 * la base de sa carte et la somme de ses lignes font ses stats hors combat (invariant du moteur). Les lignes ne se
 * modifient jamais en place : une copie de politique partage son registre sans le recopier.
 */

/** Ce qui n'a pas de source connue : une vue rejouée par un bot, un effet recopié. */
export const UNKNOWN_SOURCE = 'autre';
/** Ce qu'une carrière donne ou retire. */
export const CAREER_SOURCE = 'carriere';
/** Le Retour en politique : revenu comme sa carte nue, à 1 PV. */
export const RETURN_SOURCE = 'retour';

export function cardSource(cardId: string): string {
  return `carte:${cardId}`;
}

export function spellSource(spellId: string): string {
  return `sort:${spellId}`;
}

export function casseroleSource(casseroleId: string): string {
  return `casserole:${casseroleId}`;
}

export function heroSource(heroId: string): string {
  return `heros:${heroId}`;
}

/** La règle du jour (« Premier de cordée »). */
export function contextSource(contextId: string): string {
  return `contexte:${contextId}`;
}

/** Les stats, les mots-clés et les effets d'une carte ralliée sur son hôte. */
export function rallySource(cardId: string): string {
  return `ralliement:${cardId}`;
}

/** Une source telle que le registre l'écrit, en deux morceaux : « carte », « gueant ». */
export function parseGainSource(source: string): { kind: string; id: string } {
  const at = source.indexOf(':');
  return at < 0 ? { kind: source, id: '' } : { kind: source.slice(0, at), id: source.slice(at + 1) };
}

/** À qui appartient chaque effet des données : sa carte, sa casserole ou son sort. */
const EFFECT_OWNER = new Map<Effect, string>();
for (const card of [...Object.values(TOKENS), ...RESERVE_CARDS, ...Object.values(CARD_BY_ID)]) {
  for (const effect of card.effects ?? []) EFFECT_OWNER.set(effect, cardSource(card.id));
}
for (const casserole of [...RESERVE_CASSEROLES, ...Object.values(CASSEROLE_BY_ID)]) {
  for (const effect of [...(casserole.effects ?? []), ...(casserole.ownerBonus.effects ?? [])]) EFFECT_OWNER.set(effect, casseroleSource(casserole.id));
}
for (const spell of Object.values(SPELL_BY_ID)) {
  for (const effect of spell.effects) EFFECT_OWNER.set(effect, spellSource(spell.id));
}

/**
 * La source d'un effet qui joue : la carte du politique quand il le tient d'elle ; sinon la carte ralliée, la casserole
 * ou le sort d'où l'effet vient.
 */
export function effectSource(self: Pick<Minion, 'cardId'> | null, effect: Effect): string {
  const origin = effectOrigin(effect);
  if (self && ownEffects(self).includes(origin)) return cardSource(self.cardId);
  return EFFECT_OWNER.get(origin) ?? (self ? cardSource(self.cardId) : UNKNOWN_SOURCE);
}

/** Les stats de sa carte, doublées s'il est doré (une carte « toujours dorée » ne double pas) ; null pour une carte inconnue. */
export function baseStats(m: Pick<Minion, 'cardId' | 'golden'>): { atk: number; hp: number } | null {
  const card = CARD_BY_ID[m.cardId] ?? TOKENS[m.cardId];
  if (!card) return null;
  const factor = m.golden && !card.golden ? 2 : 1;
  return { atk: card.atk * factor, hp: card.hp * factor };
}

function lineOf(gains: readonly MinionGain[], source: string): MinionGain {
  return gains.find((gain) => gain.source === source) ?? { source, atk: 0, hp: 0, times: 0, keywords: [] };
}

/** Le registre avec cette ligne à la place de celle de sa source, ou en plus. */
function withLine(gains: readonly MinionGain[], line: MinionGain): MinionGain[] {
  const at = gains.findIndex((gain) => gain.source === line.source);
  if (at < 0) return [...gains, line];
  const next = [...gains];
  next[at] = line;
  return next;
}

/** Note un gain de stats déjà appliqué. Un gain nul ne laisse pas de ligne. */
export function recordGain(m: Minion, source: string, atk: number, hp: number): void {
  if (atk === 0 && hp === 0) return;
  const line = lineOf(m.gains, source);
  m.gains = withLine(m.gains, { ...line, atk: line.atk + atk, hp: line.hp + hp, times: line.times + 1 });
}

/** Note un mot-clé que cette source vient de donner. */
export function recordKeyword(m: Minion, source: string, keyword: Keyword): void {
  const line = lineOf(m.gains, source);
  if (line.keywords.includes(keyword)) return;
  m.gains = withLine(m.gains, { ...line, keywords: [...line.keywords, keyword] });
}

/** Oublie un mot-clé qui ne tenait qu'un temps : il quitte les lignes qui le donnaient, et une ligne vide s'en va. */
export function forgetKeyword(m: Minion, keyword: Keyword): void {
  m.gains = m.gains
    .map((gain) => (gain.keywords.includes(keyword) ? { ...gain, keywords: gain.keywords.filter((k) => k !== keyword) } : gain))
    .filter((gain) => gain.atk !== 0 || gain.hp !== 0 || gain.keywords.length > 0);
}

/** Ce que le registre explique déjà de ses stats, au-delà de sa carte. */
export function recordedStats(gains: readonly MinionGain[]): { atk: number; hp: number } {
  let atk = 0;
  let hp = 0;
  for (const gain of gains) {
    atk += gain.atk;
    hp += gain.hp;
  }
  return { atk, hp };
}

/**
 * Après une modification directe de ses stats (fixées, bornées, héritées d'un autre) : ce que le registre n'explique
 * pas encore revient à cette source.
 */
export function settleGain(m: Minion, source: string): void {
  const base = baseStats(m);
  if (!base) return;
  const known = recordedStats(m.gains);
  recordGain(m, source, m.atk - base.atk - known.atk, m.hp - base.hp - known.hp);
}

/** Le registre tel qu'il sort du moteur, dans une vue ou un journal de combat : une copie que rien ne relie à la partie. */
export function copyGains(gains: readonly MinionGain[]): MinionGain[] {
  return gains.map((gain) => ({ ...gain, keywords: [...gain.keywords] }));
}

/** Les registres de plusieurs politiques en un seul, source par source : les trois exemplaires d'un triple. */
export function mergeGains(parts: readonly Pick<Minion, 'gains'>[]): MinionGain[] {
  let merged: MinionGain[] = [];
  for (const part of parts) {
    for (const gain of part.gains) {
      const line = lineOf(merged, gain.source);
      const keywords = [...line.keywords, ...gain.keywords.filter((keyword) => !line.keywords.includes(keyword))];
      merged = withLine(merged, { source: gain.source, atk: line.atk + gain.atk, hp: line.hp + gain.hp, times: line.times + gain.times, keywords });
    }
  }
  return merged;
}
