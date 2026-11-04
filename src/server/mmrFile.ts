import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { MmrStore } from '../lobby/lobby.ts';
import { isPlayerId } from '../protocol/parseClientMessage.ts';

export interface MmrFile extends MmrStore {
  /** Écrit tout de suite ce qui attend : à l'arrêt du serveur. */
  flush(): void;
}

function load(path: string): [string, number][] {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  // Un fichier illisible arrête le serveur : mieux vaut que l'écraser avec des MMR à 1000.
  const raw = JSON.parse(text) as Record<string, unknown>;
  return Object.entries(raw).filter((entry): entry is [string, number] => isPlayerId(entry[0]) && Number.isFinite(entry[1]));
}

/**
 * Le MMR de chaque joueur anonyme, gardé dans un fichier JSON : identifiant → MMR.
 * Écrit peu après chaque changement, d'un seul coup (fichier temporaire puis renommage),
 * pour qu'un arrêt brutal ne laisse jamais un fichier à moitié écrit.
 */
export function openMmrFile(path: string, delayMs = 1000): MmrFile {
  const values = new Map(load(path));
  let pending: NodeJS.Timeout | null = null;
  const flush = (): void => {
    if (pending) clearTimeout(pending);
    pending = null;
    mkdirSync(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    writeFileSync(temporary, JSON.stringify(Object.fromEntries(values)));
    renameSync(temporary, path);
  };
  return {
    lire: (player) => values.get(player),
    ecrire(player, mmr) {
      values.set(player, mmr);
      pending ??= setTimeout(flush, delayMs);
    },
    flush,
  };
}
