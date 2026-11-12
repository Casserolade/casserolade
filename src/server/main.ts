import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DISCORD_INVITE } from '../protocol/discord.ts';
import { TWITCH_CHANNEL } from '../protocol/twitch.ts';
import { GameServer } from './gameServer.ts';
import { readTwitchCredentials } from './readTwitchCredentials.ts';
import type { TwitchCredentials } from './readTwitchCredentials.ts';

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

/**
 * L'accès de l'application Twitch qui demande si la chaîne est en direct : TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET
 * s'ils sont donnés, sinon le fichier du volume privé ({"clientId": "…", "clientSecret": "…"}), relu à chaque
 * question : déposé sur le serveur, il sert sans redémarrage. Jamais écrit au journal.
 */
function twitchCredentials(file: string): () => TwitchCredentials | null {
  return () => {
    const { TWITCH_CLIENT_ID: clientId, TWITCH_CLIENT_SECRET: clientSecret } = process.env;
    if (clientId && clientSecret) return { clientId, clientSecret };
    return existsSync(file) ? readTwitchCredentials(readFileSync(file, 'utf8')) : null;
  };
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
  archiveDir: process.env.PARTIES_DIR ?? 'data/serveur/parties',
  statsToken: statsToken(process.env.STATS_TOKEN_FILE ?? 'data/serveur/stats_token'),
  version: process.env.CASSEROLADE_VERSION,
  discordInvite: process.env.DISCORD_INVITE ?? DISCORD_INVITE,
  twitch: { channel: process.env.TWITCH_CHANNEL ?? TWITCH_CHANNEL, credentials: twitchCredentials(process.env.TWITCH_FILE ?? 'data/serveur/twitch.json') },
  presenceFile: process.env.PRESENCE_FILE ?? 'data/serveur/presences.json',
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
