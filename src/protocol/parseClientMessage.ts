import type { BotLevel } from '../bots/bots.ts';
import type { PlayerAction } from '../engine/types.ts';
import { CHAT_LONGUEUR } from './messages.ts';
import type { ClientMessage, OptionsSalon } from './messages.ts';

export const MAX_MESSAGE_BYTES = 2048;
const MAX_INTEGER = 1_000_000_000;
const MAX_BOTS = 7;
const LEVELS: readonly BotLevel[] = ['debutant', 'facile', 'moyen', 'difficile'];
const TEXT_LIMIT = 64;

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_INTEGER;
}

function isShortText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= TEXT_LIMIT;
}

/** The anonymous id a browser keeps for the public queue: a UUID or random hex, nothing else. */
const PLAYER_ID = /^[A-Za-z0-9-]{16,64}$/;

export function isPlayerId(value: unknown): value is string {
  return typeof value === 'string' && PLAYER_ID.test(value);
}

/** Un nombre entier optionnel : absent, ou un compte valide. Faux si le champ est présent et invalide. */
function optionalCount(value: unknown): boolean {
  return value === undefined || isCount(value);
}

function parseAction(raw: Record<string, unknown>): PlayerAction | null {
  switch (raw.t) {
    case 'roll':
    case 'freeze':
    case 'upgrade':
    case 'buy_casserole':
      return { t: raw.t };
    case 'buy': {
      if (!isCount(raw.slot)) return null;
      if (!optionalCount(raw.to)) return null;
      if (raw.main !== undefined && typeof raw.main !== 'boolean') return null;
      return { t: 'buy', slot: raw.slot, ...(raw.to !== undefined ? { to: raw.to as number } : {}), ...(raw.main ? { main: true } : {}) };
    }
    case 'buy_spell':
      return isCount(raw.slot) ? { t: 'buy_spell', slot: raw.slot } : null;
    case 'play':
      if (!isCount(raw.uid) || !optionalCount(raw.to) || !optionalCount(raw.target) || !optionalCount(raw.onto)) return null;
      return {
        t: 'play',
        uid: raw.uid,
        ...(raw.to !== undefined ? { to: raw.to as number } : {}),
        ...(raw.target !== undefined ? { target: raw.target as number } : {}),
        ...(raw.onto !== undefined ? { onto: raw.onto as number } : {}),
      };
    case 'cast':
      if (!isCount(raw.uid) || !optionalCount(raw.target)) return null;
      return { t: 'cast', uid: raw.uid, ...(raw.target !== undefined ? { target: raw.target as number } : {}) };
    case 'sell':
      return isCount(raw.uid) ? { t: 'sell', uid: raw.uid } : null;
    case 'move':
      return isCount(raw.uid) && isCount(raw.to) ? { t: 'move', uid: raw.uid, to: raw.to } : null;
    case 'discover':
    case 'hero':
      return isCount(raw.i) ? { t: raw.t, i: raw.i } : null;
    default:
      return null;
  }
}

function parseOptions(raw: Record<string, unknown>): OptionsSalon | null {
  if (!isCount(raw.bots) || raw.bots > MAX_BOTS) return null;
  if (!LEVELS.includes(raw.niveauBots as BotLevel)) return null;
  if (typeof raw.minuteur !== 'boolean') return null;
  if (raw.contexte !== undefined && !isShortText(raw.contexte)) return null;
  return {
    bots: raw.bots,
    niveauBots: raw.niveauBots as BotLevel,
    minuteur: raw.minuteur,
    ...(raw.contexte ? { contexte: raw.contexte as string } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFields(raw: Record<string, unknown>): ClientMessage | null {
  switch (raw.type) {
    case 'action': {
      const action = isRecord(raw.action) ? parseAction(raw.action) : null;
      return action && isCount(raw.seq) ? { type: 'action', seq: raw.seq, action } : null;
    }
    case 'pret':
    case 'vu':
    case 'lancer':
    case 'quitter':
      return { type: raw.type };
    case 'regler_salon': {
      const options = isRecord(raw.options) ? parseOptions(raw.options) : null;
      return options ? { type: 'regler_salon', options } : null;
    }
    case 'creer_salon': {
      const options = isRecord(raw.options) ? parseOptions(raw.options) : null;
      return options && isShortText(raw.pseudo) ? { type: 'creer_salon', pseudo: raw.pseudo, options } : null;
    }
    case 'rejoindre':
      return isShortText(raw.code) && isShortText(raw.pseudo) ? { type: 'rejoindre', code: raw.code, pseudo: raw.pseudo } : null;
    case 'reprendre':
      return isShortText(raw.jeton) ? { type: 'reprendre', jeton: raw.jeton } : null;
    case 'file_rejoindre':
      return isShortText(raw.pseudo) && isPlayerId(raw.joueur) ? { type: 'file_rejoindre', pseudo: raw.pseudo, joueur: raw.joueur } : null;
    case 'file_vote':
      return typeof raw.oui === 'boolean' ? { type: 'file_vote', oui: raw.oui } : null;
    case 'chat':
      return typeof raw.texte === 'string' && raw.texte.length > 0 && raw.texte.length <= CHAT_LONGUEUR ? { type: 'chat', texte: raw.texte } : null;
    default:
      return null;
  }
}

/**
 * Checks a raw message against the protocol. Returns a fresh object holding only the
 * expected fields, or null. Runs before anything else touches what a client sent.
 */
export function parseClientMessage(text: string): ClientMessage | null {
  if (text.length > MAX_MESSAGE_BYTES) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  return isRecord(raw) ? parseFields(raw) : null;
}
