import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join, resolve } from 'node:path';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import { Lobby } from '../lobby/lobby.ts';
import type { LobbyOptions } from '../lobby/lobby.ts';
import type { ClientMessage, ServerMessage } from '../protocol/messages.ts';
import { MAX_MESSAGE_BYTES, parseClientMessage } from '../protocol/parseClientMessage.ts';
import type { Clock, RoomIncident } from './room.ts';
import { openMmrFile } from './mmrFile.ts';
import type { MmrFile } from './mmrFile.ts';
import { serveStatic } from './serveStatic.ts';
import { LiveMetrics } from './liveMetrics.ts';
import { SiteStats } from './siteStats.ts';
import type { LiveStats } from './siteStats.ts';
import { statsPage } from './statsPage.ts';
import { TokenBucket } from './tokenBucket.ts';

export const SOCKET_PATH = '/ws';
const POLICY_VIOLATION = 1008;

export interface ServerLimits {
  connectionsPerAddress: number;
  /** Messages per connection: a burst, then a rate. */
  messageBurst: number;
  messagesPerSecond: number;
  /** Messages per address, all connections together. */
  addressBurst: number;
  addressPerSecond: number;
  /** Room creations and join or resume attempts per address, which also slows down code guessing. */
  roomRequestBurst: number;
  roomRequestsPerMinute: number;
  maxRooms: number;
  /** Bad or excessive messages tolerated before closing the connection. */
  maxStrikes: number;
  heartbeatMs: number;
  /** Without any message from the client, the connection closes. */
  idleMs: number;
  maxBufferedBytes: number;
}

export const DEFAULT_LIMITS: ServerLimits = {
  connectionsPerAddress: 16,
  messageBurst: 40,
  messagesPerSecond: 15,
  addressBurst: 120,
  addressPerSecond: 60,
  roomRequestBurst: 20,
  roomRequestsPerMinute: 20,
  maxRooms: 500,
  maxStrikes: 30,
  heartbeatMs: 30_000,
  idleMs: 30 * 60_000,
  maxBufferedBytes: 1024 * 1024,
};

export interface GameServerOptions {
  port: number;
  host?: string;
  /** The only pages allowed to connect, such as https://example.org. */
  allowedOrigins: string[];
  limits?: Partial<ServerLimits>;
  /** Folder of the built client, served by the same process. */
  staticDir?: string;
  /** Behind a reverse proxy: the client address is the last one it added. */
  trustProxy?: boolean;
  lobby?: Pick<LobbyOptions, 'graine' | 'chronos' | 'octets' | 'mmr'>;
  /** JSON file holding each anonymous player's MMR. Without it, MMR is forgotten on restart. */
  mmrFile?: string;
  /** Receives one line per connection, disconnection or change of activity. Silent without it. */
  journal?: (line: string) => void;
  /**
   * Folder where each incident of a game (a crash, a broken invariant) is written as JSON, with its seed and
   * log, to replay it with tools/rejouer.ts. On the private volume: never served, never sent to a client.
   */
  incidentsDir?: string;
  /** The deployed commit (the VERSION file of the image): an incident is replayed with the engine it happened on. */
  version?: string;
  /** JSON file of the daily statistics (visits, games, incidents), on the private volume. */
  statsFile?: string;
  /** The secret of the statistics page, /stats/<token>. Without it, there is no such page. */
  statsToken?: string;
}

/** The secret statistics page lives under this path; anything else under it is a plain 404. */
const STATS_PREFIX = '/stats/';
const STATS_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'",
};
/** The dashboard's script, read once: plain JavaScript, no build, served next to the page. */
const DASHBOARD_SCRIPT = readFileSync(new URL('./stats/tableau.js', import.meta.url), 'utf8');
/** A handful of open dashboards at most: the stream is for the admin, not for the crowd. */
const MAX_STATS_STREAMS = 5;
const DAYS_EVERY_MS = 30_000;

const HEURE_DE_PARIS = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'medium' });

interface Connection {
  id: string;
  socket: WebSocket;
  address: string;
  bucket: TokenBucket;
  strikes: number;
  lastMessageAt: number;
  isAlive: boolean;
}

interface AddressState {
  connections: number;
  messages: TokenBucket;
  roomRequests: TokenBucket;
  lastSeenAt: number;
}

const ROOM_REQUESTS = new Set<ClientMessage['type']>(['creer_salon', 'rejoindre', 'reprendre', 'file_rejoindre']);
/** Requests that may open a room: the public queue starts one when a table is ready. */
const ROOM_OPENERS = new Set<ClientMessage['type']>(['creer_salon', 'file_rejoindre']);
const ADDRESS_MEMORY_MS = 10 * 60_000;

const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as NodeJS.Timeout),
};

/** The network edge. It checks and relays: all game decisions stay in the lobby and the rooms. */
export class GameServer {
  private readonly options: GameServerOptions;
  private readonly limits: ServerLimits;
  private readonly http: Server;
  private readonly sockets = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES, perMessageDeflate: false });
  private readonly connections = new Map<string, Connection>();
  private readonly addresses = new Map<string, AddressState>();
  private readonly lobby: Lobby;
  private readonly mmrFile: MmrFile | null;
  private readonly stats: SiteStats;
  private readonly live = new LiveMetrics();
  private sampler: NodeJS.Timeout | null = null;
  private readonly statsStreams = new Set<ServerResponse>();
  private heartbeat: NodeJS.Timeout | null = null;
  private lastActivity = '';

  constructor(options: GameServerOptions) {
    this.options = options;
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    this.mmrFile = options.mmrFile ? openMmrFile(options.mmrFile) : null;
    this.stats = new SiteStats({ file: options.statsFile ?? null, salt: randomUUID() });
    this.lobby = new Lobby({
      ...(this.mmrFile ? { mmr: this.mmrFile } : {}),
      ...options.lobby,
      clock: realClock,
      send: (id, message) => this.send(id, message),
      signaler: (incident, code) => this.recordIncident(incident, code),
      evenement: (evenement) => {
        if (evenement.type === 'salon_cree') {
          this.stats.salonCree();
          this.live.event('salon', 'Salon privé créé');
          return;
        }
        this.stats.partie(evenement.publique, evenement.humains);
        const humains = `${evenement.humains} humain${evenement.humains > 1 ? 's' : ''}`;
        this.live.event('partie', `Partie ${evenement.publique ? 'publique' : 'privée'} lancée, ${humains}`);
      },
    });
    const staticDir = options.staticDir ? resolve(options.staticDir) : null;
    this.http = createServer((request, response) => {
      if (this.serveStats(request, response)) return;
      if (!staticDir) {
        response.writeHead(404).end();
        return;
      }
      this.countVisit(request);
      void serveStatic(staticDir, request, response);
    });
    this.http.on('upgrade', (request, socket, head) => this.handleUpgrade(request, socket, head));
  }

  async start(): Promise<number> {
    await new Promise<void>((done) => this.http.listen(this.options.port, this.options.host, done));
    this.heartbeat = setInterval(() => this.checkConnections(), this.limits.heartbeatMs);
    this.sampler = setInterval(() => this.live.sample(this.liveStats(), this.lobby.joueursEnJeu), 1000);
    this.live.event('demarrage', `Serveur démarré, version ${this.options.version ?? 'inconnue'}`);
    return (this.http.address() as AddressInfo).port;
  }

  async stop(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.sampler) clearInterval(this.sampler);
    for (const stream of this.statsStreams) stream.end();
    this.live.stop();
    this.lobby.destroy();
    this.mmrFile?.flush();
    this.stats.flush();
    for (const connection of this.connections.values()) connection.socket.terminate();
    await new Promise((done) => this.http.close(done));
  }

  private handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path !== SOCKET_PATH) return this.refuseUpgrade(socket, '404 Not Found');
    if (!this.options.allowedOrigins.includes(request.headers.origin ?? '')) return this.refuseUpgrade(socket, '403 Forbidden');
    const address = this.clientAddress(request);
    const state = this.addressState(address);
    if (state.connections >= this.limits.connectionsPerAddress) return this.refuseUpgrade(socket, '429 Too Many Requests');
    state.connections++;
    this.sockets.handleUpgrade(request, socket, head, (ws) => this.addConnection(ws, address));
  }

  private refuseUpgrade(socket: Duplex, status: string): void {
    socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  }

  private clientAddress(request: IncomingMessage): string {
    const forwarded = this.options.trustProxy ? request.headers['x-forwarded-for'] : undefined;
    const last = typeof forwarded === 'string' ? forwarded.split(',').at(-1)?.trim() : undefined;
    return last || request.socket.remoteAddress || 'unknown';
  }

  private addressState(address: string): AddressState {
    const known = this.addresses.get(address);
    if (known) return known;
    const { addressBurst, addressPerSecond, roomRequestBurst, roomRequestsPerMinute } = this.limits;
    const state: AddressState = {
      connections: 0,
      messages: new TokenBucket(addressBurst, addressPerSecond, Date.now),
      roomRequests: new TokenBucket(roomRequestBurst, roomRequestsPerMinute / 60, Date.now),
      lastSeenAt: Date.now(),
    };
    this.addresses.set(address, state);
    return state;
  }

  private addConnection(socket: WebSocket, address: string): void {
    const connection: Connection = {
      id: randomUUID(),
      socket,
      address,
      bucket: new TokenBucket(this.limits.messageBurst, this.limits.messagesPerSecond, Date.now),
      strikes: 0,
      lastMessageAt: Date.now(),
      isAlive: true,
    };
    this.connections.set(connection.id, connection);
    socket.on('pong', () => (connection.isAlive = true));
    socket.on('message', (data, isBinary) => this.receive(connection, data.toString(), isBinary));
    socket.on('close', () => this.removeConnection(connection));
    socket.on('error', () => socket.terminate());
    this.report('+1');
  }

  private removeConnection(connection: Connection): void {
    this.connections.delete(connection.id);
    const state = this.addressState(connection.address);
    state.connections--;
    state.lastSeenAt = Date.now();
    this.lobby.disconnect(connection.id);
    this.report('-1');
  }

  /** The secret statistics page: the page itself, or its JSON. Under /stats/, a wrong token is a plain 404. */
  private serveStats(request: IncomingMessage, response: ServerResponse): boolean {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (!path.startsWith(STATS_PREFIX)) return false;
    const token = this.options.statsToken;
    const asked = path.slice(STATS_PREFIX.length);
    const route = token && request.method === 'GET' ? { [token]: 'page', [`${token}.json`]: 'json', [`${token}/flux`]: 'flux', [`${token}/tableau.js`]: 'script' }[asked] : undefined;
    if (!route) {
      response.writeHead(404, STATS_HEADERS).end();
      return true;
    }
    if (route === 'flux') {
      this.streamStats(response);
      return true;
    }
    if (route === 'script') {
      response.writeHead(200, { ...STATS_HEADERS, 'Content-Type': 'text/javascript; charset=utf-8' }).end(DASHBOARD_SCRIPT);
      return true;
    }
    const snapshot = this.stats.snapshot(this.liveStats(), this.options.version ?? null);
    if (route === 'json') response.writeHead(200, { ...STATS_HEADERS, 'Content-Type': 'application/json' }).end(JSON.stringify({ ...snapshot, ...this.live.history() }));
    else response.writeHead(200, { ...STATS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' }).end(statsPage(`${STATS_PREFIX}${token}`));
    return true;
  }

  /**
   * The real-time stream of the dashboard (Server-Sent Events): first the last five minutes and the days,
   * then one measure a second and each event as it happens.
   */
  private streamStats(response: ServerResponse): void {
    if (this.statsStreams.size >= MAX_STATS_STREAMS) {
      response.writeHead(503, STATS_HEADERS).end();
      return;
    }
    response.writeHead(200, { ...STATS_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    const push = (event: string, data: unknown) => response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const snapshot = () => this.stats.snapshot(this.liveStats(), this.options.version ?? null);
    const first = snapshot();
    push('bonjour', { ...this.live.history(), jours: first.days, incidents: first.incidents, version: first.version, demarrage: first.startedAt });
    const unsubscribe = this.live.subscribe((kind, payload) => push(kind === 'sample' ? 'mesure' : 'evenement', payload));
    const days = setInterval(() => {
      const now = snapshot();
      push('jours', { jours: now.days, incidents: now.incidents });
    }, DAYS_EVERY_MS);
    this.statsStreams.add(response);
    response.on('close', () => {
      unsubscribe();
      clearInterval(days);
      this.statsStreams.delete(response);
    });
  }

  /** A page of the game loaded: one visit, and its visitor, counted without keeping any address. */
  private countVisit(request: IncomingMessage): void {
    if (request.method !== 'GET') return;
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path === '/' || path === '/index.html') this.stats.visit(this.clientAddress(request));
  }

  private liveStats(): LiveStats {
    let addresses = 0;
    for (const state of this.addresses.values()) if (state.connections > 0) addresses++;
    return { connexions: this.connections.size, adresses: addresses, salons: this.lobby.nombreDeSalons, enJeu: this.lobby.nombreEnJeu, enFile: this.lobby.nombreEnFile };
  }

  /** A game stopped by a bug, or a broken invariant: one line in the journal, the full report on the private volume. */
  private recordIncident(incident: RoomIncident, code: string): void {
    const at = new Date();
    this.stats.incident(incident.kind, code, incident.round, incident.message);
    this.live.event('incident', `${incident.kind === 'crash' ? 'Plantage' : 'Anomalie'} dans le salon ${code}, manche ${incident.round} : ${incident.message}`);
    this.options.journal?.(`${HEURE_DE_PARIS.format(at)} !! · incident (${incident.kind}) dans le salon ${code}, manche ${incident.round} : ${incident.message}`);
    const dir = this.options.incidentsDir;
    if (!dir) return;
    try {
      mkdirSync(dir, { recursive: true });
      const name = `${at.toISOString().replace(/[:.]/g, '-')}-${code}-${incident.kind}.json`;
      writeFileSync(join(dir, name), JSON.stringify({ ...incident, code, version: this.options.version ?? null, at: at.toISOString() }, null, 1));
    } catch (error) {
      this.options.journal?.(`${HEURE_DE_PARIS.format(at)} !! · incident non écrit : ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Connections, addresses, rooms and queue: on each change of connection, or when activity changed since. */
  private report(event?: string): void {
    this.stats.connexions(this.connections.size);
    this.stats.flush(false);
    if (!this.options.journal) return;
    let addresses = 0;
    for (const state of this.addresses.values()) if (state.connections > 0) addresses++;
    const count = (n: number, word: string): string => `${n} ${word}${n > 1 ? 's' : ''}`;
    const activity = `${count(this.connections.size, 'connexion')}, ${count(addresses, 'adresse')}, ${count(this.lobby.nombreDeSalons, 'salon')} (${this.lobby.nombreEnJeu} en jeu), ${this.lobby.nombreEnFile} en file`;
    if (!event && activity === this.lastActivity) return;
    this.lastActivity = activity;
    this.options.journal(`${HEURE_DE_PARIS.format(new Date())} ${event ?? '  '} · ${activity}`);
  }

  private receive(connection: Connection, text: string, isBinary: boolean): void {
    this.live.received();
    connection.lastMessageAt = Date.now();
    const state = this.addressState(connection.address);
    if (!connection.bucket.take() || !state.messages.take()) {
      this.strike(connection, 'Trop de messages.');
      return;
    }
    const message = isBinary ? null : parseClientMessage(text);
    if (!message) {
      this.strike(connection, 'Message invalide.');
      return;
    }
    if (ROOM_REQUESTS.has(message.type) && !state.roomRequests.take()) {
      this.send(connection.id, { type: 'erreur', erreur: 'Trop de demandes de salon. Réessayez dans une minute.' });
      return;
    }
    if (ROOM_OPENERS.has(message.type) && this.lobby.nombreDeSalons >= this.limits.maxRooms) {
      this.send(connection.id, { type: 'erreur', erreur: 'Le serveur est plein. Réessayez plus tard.' });
      return;
    }
    this.lobby.handleMessage(connection.id, message);
  }

  private strike(connection: Connection, reason: string): void {
    connection.strikes++;
    if (connection.strikes > this.limits.maxStrikes) {
      connection.socket.close(POLICY_VIOLATION, reason);
      return;
    }
    if (connection.strikes === 1) this.send(connection.id, { type: 'erreur', erreur: reason });
  }

  private send(id: string, message: ServerMessage): void {
    const connection = this.connections.get(id);
    if (connection?.socket.readyState !== WebSocket.OPEN) return;
    // A client that no longer reads must not fill the server's memory.
    if (connection.socket.bufferedAmount > this.limits.maxBufferedBytes) {
      connection.socket.terminate();
      return;
    }
    const text = JSON.stringify(message);
    connection.socket.send(text);
    this.live.sent(Buffer.byteLength(text));
  }

  private checkConnections(): void {
    const now = Date.now();
    for (const connection of this.connections.values()) {
      if (!connection.isAlive || now - connection.lastMessageAt > this.limits.idleMs) {
        connection.socket.terminate();
        continue;
      }
      connection.isAlive = false;
      connection.socket.ping();
    }
    for (const [address, state] of this.addresses) {
      if (state.connections === 0 && now - state.lastSeenAt > ADDRESS_MEMORY_MS) this.addresses.delete(address);
    }
    this.report();
  }
}
