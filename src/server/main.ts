import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { GameServer } from './gameServer.ts';

/**
 * Le secret de la page des statistiques, /stats/<jeton> : STATS_TOKEN s'il est donné, sinon tiré au hasard au
 * premier démarrage et gardé sur le volume privé (lisible par l'administrateur seul). Jamais écrit au journal.
 */
function statsToken(file: string): string {
  if (process.env.STATS_TOKEN) return process.env.STATS_TOKEN;
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const token = randomBytes(18).toString('base64url');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, token, { mode: 0o600 });
  return token;
}

const DEFAULT_PORT = 8080;
const DEFAULT_ORIGINS = 'http://localhost:8080,http://localhost:5173';

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS).split(',').map((origin) => origin.trim());
const server = new GameServer({
  port,
  host: process.env.HOST ?? '127.0.0.1',
  allowedOrigins,
  staticDir: process.env.STATIC_DIR ?? 'dist',
  trustProxy: process.env.TRUST_PROXY === '1',
  mmrFile: process.env.MMR_FILE ?? 'data/serveur/mmr.json',
  incidentsDir: process.env.INCIDENTS_DIR ?? 'data/serveur/incidents',
  statsFile: process.env.STATS_FILE ?? 'data/serveur/stats.json',
  statsToken: statsToken(process.env.STATS_TOKEN_FILE ?? 'data/serveur/stats_token'),
  version: process.env.CASSEROLADE_VERSION,
  journal: (line) => console.log(line),
});

const listening = await server.start();
console.log(`Game server on port ${listening}, allowed origins: ${allowedOrigins.join(', ')}`);

async function shutDown(): Promise<void> {
  await server.stop();
  process.exit(0);
}

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
