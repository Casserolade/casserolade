import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { MmrStore } from '../lobby/lobby.ts';
import { isPlayerId } from '../protocol/parseClientMessage.ts';

export interface MmrFile extends MmrStore {
  /** Écrit tout de suite ce qui attend : à l'arrêt du serveur. */
  flush(): void;
}

/** Le format du fichier : l'empreinte de la clé de chaque joueur → son MMR. */
const VERSION = 2;

interface Contenu {
  version: number;
  cotes: Record<string, number>;
}

/**
 * L'empreinte d'une clé de joueur. Le fichier ne garde qu'elle : qui le lirait n'y trouverait aucune clé, et ne
 * pourrait donc se faire passer pour personne.
 */
export function empreinte(joueur: string): string {
  return createHash('sha256').update(joueur).digest('hex');
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
  const raw = JSON.parse(text) as Partial<Contenu> & Record<string, unknown>;
  if (raw.version === VERSION && raw.cotes && typeof raw.cotes === 'object') {
    return Object.entries(raw.cotes).filter((entry): entry is [string, number] => Number.isFinite(entry[1]));
  }
  // L'ancien format gardait les clés elles-mêmes : elles deviennent des empreintes au premier chargement.
  return Object.entries(raw)
    .filter((entry): entry is [string, number] => isPlayerId(entry[0]) && Number.isFinite(entry[1]))
    .map(([joueur, mmr]) => [empreinte(joueur), mmr]);
}

/**
 * Le MMR de chaque joueur anonyme, gardé dans un fichier JSON : empreinte de sa clé → MMR. La clé reste dans le
 * navigateur du joueur ; le MMR ne se lit et ne s'écrit qu'ici, par le serveur, d'après les parties qu'il a menées.
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
    const contenu: Contenu = { version: VERSION, cotes: Object.fromEntries(values) };
    writeFileSync(temporary, JSON.stringify(contenu));
    renameSync(temporary, path);
  };
  return {
    lire: (player) => values.get(empreinte(player)),
    ecrire(player, mmr) {
      values.set(empreinte(player), mmr);
      pending ??= setTimeout(flush, delayMs);
    },
    flush,
  };
}
