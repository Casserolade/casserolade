import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import type { CombatView, PlayerView } from '../src/engine/game.ts';
import { createWebSocketTransport } from '../src/client/services/createWebSocketTransport.ts';
import type { SocketLike } from '../src/client/services/createWebSocketTransport.ts';
import { reconnectDelay } from '../src/client/tools/reconnectDelay.ts';
import type { ClientMessage, ServerMessage } from '../src/protocol/messages.ts';
import { MAX_MESSAGE_BYTES } from '../src/protocol/parseClientMessage.ts';
import { assetVersions, contentHash } from '../src/server/assetVersions.ts';
import { GameServer, SOCKET_PATH } from '../src/server/gameServer.ts';
import type { GameServerOptions, ServerLimits } from '../src/server/gameServer.ts';
import { TokenBucket } from '../src/server/tokenBucket.ts';

const ORIGIN = 'https://jeu.example';
const SEED = 3141592653;
const OPTIONS = { bots: 0, niveauBots: 'facile', minuteur: true } as const;
const FAST_TIMERS = {
  avec: { heroMs: 300, recruitMs: () => 400, graceMs: 100 },
  sans: { heroMs: null, recruitMs: null, graceMs: 100 },
};

interface Client {
  socket: WebSocket;
  inbox: ServerMessage[];
  send(message: ClientMessage | string): void;
  waitFor(check: (message: ServerMessage) => boolean, label?: string): Promise<ServerMessage>;
  closed: Promise<number>;
}

async function startServer(limits: Partial<ServerLimits> = {}, extra: Partial<GameServerOptions> = {}) {
  const server = new GameServer({
    port: 0,
    host: '127.0.0.1',
    allowedOrigins: [ORIGIN],
    limits,
    lobby: { graine: () => SEED, chronos: FAST_TIMERS },
    ...extra,
  });
  const port = await server.start();
  return { server, port, url: `ws://127.0.0.1:${port}${SOCKET_PATH}` };
}

function connect(url: string, origin: string | undefined = ORIGIN): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, origin ? { origin } : {});
    const inbox: ServerMessage[] = [];
    const waiters: { check: (m: ServerMessage) => boolean; done: (m: ServerMessage) => void }[] = [];
    const closed = new Promise<number>((done) => socket.on('close', (code) => done(code)));
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      inbox.push(message);
      for (const waiter of [...waiters]) {
        if (waiter.check(message)) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.done(message);
        }
      }
    });
    socket.on('error', reject);
    socket.on('open', () =>
      resolve({
        socket,
        inbox,
        closed,
        send: (message) => socket.send(typeof message === 'string' ? message : JSON.stringify(message)),
        waitFor(check, label = 'message') {
          const known = inbox.find(check);
          if (known) return Promise.resolve(known);
          return new Promise((done, fail) => {
            const timer = setTimeout(() => fail(new Error(`timeout waiting for ${label}`)), 8000);
            waiters.push({ check, done: (m) => (clearTimeout(timer), done(m)) });
          });
        },
      }),
    );
  });
}

/** Resolves with the HTTP status when the upgrade is refused. */
function refusedStatus(url: string, origin?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, origin ? { origin } : {});
    socket.on('unexpected-response', (_request, response) => resolve(response.statusCode ?? 0));
    socket.on('error', () => {});
    socket.on('open', () => reject(new Error('the connection should have been refused')));
  });
}

function jetonOf(client: Client): string {
  const salon = client.inbox.findLast((m) => m.type === 'salon');
  assert.ok(salon?.type === 'salon');
  return salon.jeton;
}

async function createRoomWithTwo(url: string) {
  const host = await connect(url);
  const guest = await connect(url);
  host.send({ type: 'creer_salon', pseudo: 'Hôte', options: OPTIONS });
  const created = await host.waitFor((m) => m.type === 'salon', 'salon');
  assert.ok(created.type === 'salon');
  guest.send({ type: 'rejoindre', code: created.salon.code, pseudo: 'Invité' });
  await guest.waitFor((m) => m.type === 'salon', 'salon');
  return { host, guest, code: created.salon.code };
}

/** A simple player: picks a hero, buys what it can, ends its turn and watches its combats. */
function autoPlay(client: Client): void {
  let seq = 1;
  let answeredRound = -1;
  let answeredHero = false;
  client.socket.on('message', (data) => {
    const message = JSON.parse(data.toString()) as ServerMessage;
    if (message.type === 'combat') {
      client.send({ type: 'vu' });
      return;
    }
    if (message.type !== 'vue') return;
    const { vue } = message;
    if (vue.heroOffers && !answeredHero) {
      answeredHero = true;
      client.send({ type: 'action', seq: seq++, action: { t: 'hero', i: 0 } });
    } else if (vue.phase === 'recrutement' && vue.alive && vue.round !== answeredRound) {
      answeredRound = vue.round;
      if (vue.discover) client.send({ type: 'action', seq: seq++, action: { t: 'discover', i: 0 } });
      for (const carte of vue.hand) client.send({ type: 'action', seq: seq++, action: { t: 'play', uid: carte.uid } });
      if (vue.budget >= vue.buyCost && vue.shop.length) client.send({ type: 'action', seq: seq++, action: { t: 'buy', slot: 0 } });
      client.send({ type: 'pret' });
    }
  });
}

const FORBIDDEN_KEYS = new Set(['seed', 'graine', 'rng', 'pool', 'reserve', 'players', 'nextUid', 'hpSnapshot', 'roundCombats', 'jeu', 'game', 'log_actions']);
const VIEW_KEYS = new Set(['seat', 'round', 'phase', 'plateau', 'animateur', 'heroOffers', 'alive', 'place', 'hp', 'tier', 'budget', 'upgradeCost', 'buyCost', 'rollCost', 'boardLimit', 'scandalThreshold', 'stats', 'heroId', 'mods', 'board', 'hand', 'handLimit', 'shop', 'frozen', 'casseroleOffer', 'casseroleCost', 'discover', 'camps', 'maxBudget', 'nextBudget', 'freeRolls', 'relaunched', 'spells', 'shopGains', 'shopSpells', 'shopSpellCosts', 'discoverKind', 'tract', 'counters', 'contextId', 'params', 'seen', 'table', 'upgradeLock', 'quete', 'evenements', 'absents', 'nextOpponent', 'onceThisRound']);
const TABLE_KEYS = new Set(['seat', 'heroId', 'hp', 'tier', 'alive', 'boardSize', 'place', 'triples']);

function assertNoForbiddenKey(value: unknown, path = ''): void {
  if (Array.isArray(value)) return value.forEach((item, i) => assertNoForbiddenKey(item, `${path}[${i}]`));
  if (typeof value !== 'object' || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    assert.ok(!FORBIDDEN_KEYS.has(key), `forbidden key ${path}.${key}`);
    assertNoForbiddenKey(item, `${path}.${key}`);
  }
}

let shared: Awaited<ReturnType<typeof startServer>>;
before(async () => {
  shared = await startServer();
});
after(async () => {
  await shared.server.stop();
});

test('a connection needs an allowed Origin and the right path', async () => {
  assert.equal(await refusedStatus(shared.url, 'https://ailleurs.example'), 403);
  assert.equal(await refusedStatus(shared.url), 403);
  assert.equal(await refusedStatus(`ws://127.0.0.1:${shared.port}/autre`, ORIGIN), 404);
  const client = await connect(shared.url);
  client.socket.close();
});

test('a message over the size limit closes the connection', async () => {
  const client = await connect(shared.url);
  client.send('x'.repeat(MAX_MESSAGE_BYTES + 1));
  assert.equal(await client.closed, 1009);
});

test('malformed messages get an error, then repeated ones close the connection', async () => {
  const { server, url } = await startServer({ maxStrikes: 3 });
  const client = await connect(url);
  client.send('not json');
  const error = await client.waitFor((m) => m.type === 'erreur');
  assert.deepEqual(error, { type: 'erreur', erreur: 'Message invalide.' });
  client.socket.send(Buffer.from([1, 2, 3]));
  client.send('{"type":"action","seq":1,"action":{"t":"tricher"}}');
  client.send('{"type":"inconnu"}');
  assert.equal(await client.closed, 1008);
  await server.stop();
});

test('a flood is cut off by the rate limit', async () => {
  const { server, url } = await startServer({ messageBurst: 5, messagesPerSecond: 1, maxStrikes: 5 });
  const client = await connect(url);
  for (let i = 0; i < 50; i++) client.send({ type: 'vu' });
  assert.equal(await client.closed, 1008);
  assert.ok(client.inbox.some((m) => m.type === 'erreur' && m.erreur === 'Trop de messages.'));
  await server.stop();
});

test('an address cannot open too many connections', async () => {
  const { server, url } = await startServer({ connectionsPerAddress: 2 });
  const first = await connect(url);
  await connect(url);
  assert.equal(await refusedStatus(url, ORIGIN), 429);
  first.socket.close();
  await first.closed;
  await new Promise((done) => setTimeout(done, 50));
  const again = await connect(url);
  again.socket.close();
  await server.stop();
});

test('an address cannot create rooms or guess codes without limit', async () => {
  const { server, url } = await startServer({ roomRequestBurst: 3, roomRequestsPerMinute: 1 });
  const client = await connect(url);
  for (let i = 0; i < 3; i++) client.send({ type: 'rejoindre', code: `CODE${i}`, pseudo: 'x' });
  client.send({ type: 'rejoindre', code: 'CODE9', pseudo: 'x' });
  await client.waitFor((m) => m.type === 'erreur' && m.erreur.startsWith('Trop de demandes'), 'limit error');
  await server.stop();
});

test('the server refuses new rooms when full', async () => {
  const { server, url } = await startServer({ maxRooms: 1 });
  const first = await connect(url);
  first.send({ type: 'creer_salon', pseudo: 'A', options: OPTIONS });
  await first.waitFor((m) => m.type === 'salon');
  const second = await connect(url);
  second.send({ type: 'creer_salon', pseudo: 'B', options: OPTIONS });
  const refusal = await second.waitFor((m) => m.type === 'erreur');
  assert.ok(refusal.type === 'erreur' && refusal.erreur.includes('plein'));
  await server.stop();
});

test('two people play a full game online, and no message reveals hidden information', async () => {
  const { host, guest } = await createRoomWithTwo(shared.url);
  autoPlay(host);
  autoPlay(guest);
  host.send({ type: 'lancer' });
  await Promise.all([host, guest].map((c) => c.waitFor((m) => m.type === 'fin', 'fin')));

  for (const client of [host, guest]) {
    const raw = JSON.stringify(client.inbox);
    assert.ok(!raw.includes(String(SEED)), 'the seed left the server');
    const views = client.inbox.flatMap((m) => (m.type === 'vue' ? [m.vue] : []));
    const combats = client.inbox.flatMap((m) => (m.type === 'combat' ? [m.combat] : []));
    assert.ok(views.length > 3);
    assert.ok(combats.length >= 1);
    for (const message of client.inbox) assertNoForbiddenKey(message);
    for (const view of views) {
      assert.deepEqual(new Set(Object.keys(view)), VIEW_KEYS, 'unexpected field in a view');
      for (const row of view.table) assert.deepEqual(new Set(Object.keys(row)), TABLE_KEYS);
    }
    const end = client.inbox.findLast((m) => m.type === 'fin');
    assert.ok(end?.type === 'fin');
    assert.equal(end.classement.length, 8);
    assert.ok(end.classement.some((r) => r.pseudo === 'Hôte') && end.classement.some((r) => r.pseudo === 'Invité'));
  }

  // Hidden boards: a seat only ever sees the boards it fought.
  const seatOf = (client: Client) => client.inbox.flatMap((m) => (m.type === 'vue' ? [m.vue.seat] : []))[0];
  const seat = [seatOf(host), seatOf(guest)];
  assert.notEqual(seat[0], seat[1]);
  const combatsOf = (client: Client): CombatView[] => client.inbox.flatMap((m) => (m.type === 'combat' ? [m.combat] : []));
  const viewsOf = (client: Client): PlayerView[] => client.inbox.flatMap((m) => (m.type === 'vue' ? [m.vue] : []));
  const foughtByHost = new Map(combatsOf(host).map((c) => [c.round, c.opponent.seat]));
  const guestUidsByRound = new Map(viewsOf(guest).map((v) => [v.round, new Set(v.board.map((m) => m.uid))]));
  for (const view of viewsOf(host)) {
    for (const minion of view.board) {
      const guestBoard = guestUidsByRound.get(view.round);
      assert.ok(!guestBoard?.has(minion.uid), 'a seat received another seat\'s minion as its own');
    }
    for (const entry of view.seen) {
      assert.ok([...foughtByHost.values()].includes(entry.seat), `seat ${seat[0]} saw the board of seat ${entry.seat} without fighting it`);
    }
  }
  for (const combat of combatsOf(host)) {
    const opening = combat.log[0];
    assert.ok(opening.e === 'debut');
    if (combat.opponent.seat !== seat[1]) {
      const guestUids = guestUidsByRound.get(combat.round) ?? new Set<number>();
      for (const unit of opening.sides.flat()) assert.ok(!guestUids.has(unit.uid), 'the combat log revealed a third party\'s board');
    }
  }
  // Each token is only known to its seat.
  assert.notEqual(jetonOf(host), jetonOf(guest));
  assert.ok(!JSON.stringify(host.inbox).includes(jetonOf(guest)), 'the guest\'s token reached the host');
});

test('a game played to the end is archived for balancing, counted for the day, and shown live while it runs', async () => {
  const archiveDir = mkdtempSync(join(tmpdir(), 'parties-'));
  const { server, port, url } = await startServer({}, { archiveDir, statsToken: 'jeton', version: 'abc1234' });
  const { host, guest } = await createRoomWithTwo(url);
  autoPlay(host);
  autoPlay(guest);
  host.send({ type: 'lancer' });
  await host.waitFor((m) => m.type === 'vue', 'vue');
  const live = await (await fetch(`http://127.0.0.1:${port}/stats/jeton.json`)).json() as { parties: { sieges: { humain: boolean }[] }[] };
  assert.equal(live.parties.length, 1, 'the game in progress shows on the dashboard');
  assert.equal(live.parties[0].sieges.filter((seat) => seat.humain).length, 2);
  await Promise.all([host, guest].map((c) => c.waitFor((m) => m.type === 'fin', 'fin')));
  const [file] = readdirSync(archiveDir);
  const archived = JSON.parse(readFileSync(join(archiveDir, file), 'utf8'));
  assert.equal(archived.commit, 'abc1234');
  assert.equal(archived.seed, SEED);
  assert.equal(archived.joueurs.length, 8);
  assert.ok(!JSON.stringify(archived).includes('Hôte'), 'no pseudo in the archive');
  const stats = await (await fetch(`http://127.0.0.1:${port}/stats/jeton.json`)).json() as { parties: unknown[]; days: { partiesFinies: number }[]; cumul: { enLigne: Record<string, unknown> } };
  assert.equal(stats.parties.length, 0);
  assert.equal(stats.days.at(-1)?.partiesFinies, 1);
  assert.equal(Object.keys(stats.cumul.enLigne).length, 1);
  await server.stop();
});

test('a client can only act on its own seat, and illegal actions are refused over the network', async () => {
  const { host, guest } = await createRoomWithTwo(shared.url);
  host.send({ type: 'lancer' });
  await guest.waitFor((m) => m.type === 'vue', 'vue');
  host.send({ type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  guest.send({ type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  const isRecruiting = (m: ServerMessage) => m.type === 'vue' && m.vue.phase === 'recrutement';
  await host.waitFor(isRecruiting, 'recruitment');
  await guest.waitFor(isRecruiting, 'recruitment');
  host.inbox.length = 0;
  guest.inbox.length = 0;

  host.send({ type: 'action', seq: 2, action: { t: 'buy', slot: 99 } });
  assert.deepEqual(await host.waitFor((m) => m.type === 'refus'), { type: 'refus', seq: 2, erreur: 'Emplacement vide.' });

  // A forged seat field is dropped by the protocol check: the host buys for itself.
  host.send('{"type":"action","seq":3,"seat":1,"action":{"t":"buy","slot":0}}');
  const bought = await host.waitFor((m) => m.type === 'vue');
  // At least one: the card bought, plus whatever its Annonce brings.
  assert.ok(bought.type === 'vue' && bought.vue.board.length >= 1);
  await new Promise((done) => setTimeout(done, 50));
  assert.equal(guest.inbox.filter((m) => m.type === 'vue').length, 0, 'the guest must not see anything from the host\'s action');

  // Only the host starts or sets up a room.
  guest.send({ type: 'lancer' });
  await guest.waitFor((m) => m.type === 'erreur');
  host.send({ type: 'quitter' });
  guest.send({ type: 'quitter' });
});

test('a card kept in hand is only ever sent to its owner', async () => {
  const { host, guest } = await createRoomWithTwo(shared.url);
  host.send({ type: 'lancer' });
  await guest.waitFor((m) => m.type === 'vue', 'vue');
  host.send({ type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  guest.send({ type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  const isRecruiting = (m: ServerMessage) => m.type === 'vue' && m.vue.phase === 'recrutement';
  await host.waitFor(isRecruiting, 'recruitment');
  await guest.waitFor(isRecruiting, 'recruitment');
  host.inbox.length = 0;
  guest.inbox.length = 0;
  host.send({ type: 'action', seq: 2, action: { t: 'buy', slot: 0, main: true } });
  const kept = await host.waitFor((m) => m.type === 'vue');
  assert.ok(kept.type === 'vue');
  assert.equal(kept.vue.hand.length, 1);
  assert.equal(kept.vue.board.length, 0);
  const row = kept.vue.table.find((r) => r.seat === kept.vue.seat);
  assert.equal(row?.boardSize, 0);
  // Both players end the round: the kept card must not appear in the combat or in the guest's messages.
  autoPlay(guest);
  guest.send({ type: 'pret' });
  host.send({ type: 'pret' });
  const combat = await host.waitFor((m) => m.type === 'combat', 'combat');
  assert.ok(combat.type === 'combat');
  const opening = combat.combat.log[0];
  assert.ok(opening.e === 'debut');
  const uid = kept.vue.hand[0].uid;
  assert.ok(!opening.sides.flat().some((u) => u.uid === uid), 'a card in hand must not fight');
  assert.ok(!JSON.stringify(guest.inbox).includes(`"uid":${uid},`), 'the guest received a card from the host\'s hand');
  host.send({ type: 'quitter' });
  guest.send({ type: 'quitter' });
});

test('a player who loses the connection takes the seat back with the token', async () => {
  const { host, guest } = await createRoomWithTwo(shared.url);
  host.send({ type: 'lancer' });
  await guest.waitFor((m) => m.type === 'vue');
  const token = jetonOf(guest);
  const before = guest.inbox.flatMap((m) => (m.type === 'vue' ? [m.vue.seat] : []))[0];
  guest.socket.terminate();
  await guest.closed;

  const returning = await connect(shared.url);
  returning.send({ type: 'reprendre', jeton: 'mauvais-jeton' });
  await returning.waitFor((m) => m.type === 'erreur');
  returning.send({ type: 'reprendre', jeton: token });
  const view = await returning.waitFor((m) => m.type === 'vue', 'vue after resuming');
  assert.ok(view.type === 'vue');
  assert.equal(view.vue.seat, before);
  host.send({ type: 'quitter' });
  returning.send({ type: 'quitter' });
});

test('a bot holds the seat of an absent player and the game goes on', async () => {
  const { host, guest } = await createRoomWithTwo(shared.url);
  autoPlay(host);
  host.send({ type: 'lancer' });
  await guest.waitFor((m) => m.type === 'vue');
  guest.socket.terminate();
  await host.waitFor((m) => m.type === 'combat', 'a combat without the guest');
  host.send({ type: 'quitter' });
});

test('the client transport reconnects by itself and resumes the seat', async () => {
  const { host } = await createRoomWithTwo(shared.url);
  const sockets: WebSocket[] = [];
  const stored = new Map<string, string>();
  const transport = createWebSocketTransport({
    url: shared.url,
    storage: { getItem: (k) => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v), removeItem: (k) => stored.delete(k) },
    createSocket(url) {
      const socket = new WebSocket(url, { origin: ORIGIN });
      sockets.push(socket);
      return socket as unknown as SocketLike;
    },
  });
  const received: ServerMessage[] = [];
  transport.onMessage((m) => received.push(m));
  const code = (host.inbox.find((m) => m.type === 'salon') as Extract<ServerMessage, { type: 'salon' }>).salon.code;
  // Sent before the socket opens: the transport must queue it.
  transport.send({ type: 'rejoindre', code, pseudo: 'Mobile' });
  const until = async (check: () => boolean) => {
    for (let i = 0; i < 400 && !check(); i++) await new Promise((done) => setTimeout(done, 10));
    assert.ok(check());
  };
  await until(() => received.some((m) => m.type === 'salon'));
  assert.equal(stored.size, 1, 'the token should be stored');

  received.length = 0;
  sockets[0].terminate();
  await until(() => sockets.length === 2 && received.some((m) => m.type === 'salon'));

  // A new transport after a page reload resumes with the stored token, too.
  transport.send({ type: 'quitter' });
  assert.equal(stored.size, 0, 'leaving forgets the token');
  transport.close();
  host.send({ type: 'quitter' });
});

test('a silent connection is closed, and so is one that stops answering pings', async () => {
  const { server, url } = await startServer({ heartbeatMs: 30, idleMs: 60 });
  const silent = await connect(url);
  await silent.closed;
  const dead = new WebSocket(url, { origin: ORIGIN, autoPong: false });
  await new Promise((done) => dead.on('close', done));
  await server.stop();
});

test('the game server serves the built client, its pages asked again each time', async () => {
  const { server, port } = await startServer({}, { staticDir: 'src/client' });
  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.match(await page.text(), /<div id="app">/);
  // Une page sans son extension : /a-propos sert a-propos.html.
  const about = await fetch(`http://127.0.0.1:${port}/a-propos`);
  assert.equal(about.status, 200);
  assert.match(about.headers.get('content-type') ?? '', /text\/html/);
  assert.match(await about.text(), /pastiche de la politique française/);
  const bestiary = await fetch(`http://127.0.0.1:${port}/bestiaire`);
  assert.equal(bestiary.status, 200);
  assert.match(await bestiary.text(), /<div id="bestiaire">/);
  // The phone version: the index of its folder, with or without the last slash.
  for (const path of ['/m/', '/m']) {
    const phone = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.equal(phone.status, 200, path);
    assert.match(await phone.text(), /mobile\.ts/, path);
  }
  // Caching: a page is asked again each time, answered « not modified » when it did not change.
  assert.equal(page.headers.get('cache-control'), 'no-cache');
  const etag = page.headers.get('etag') as string;
  assert.match(etag, /^"[\w-]{10}"$/);
  const again = await fetch(`http://127.0.0.1:${port}/`, { headers: { 'If-None-Match': etag } });
  assert.equal(again.status, 304);
  assert.equal(await again.text(), '');
  await server.stop();
});

test('an address that names its version is kept for good; an old version or no version is asked again', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'site-'));
  mkdirSync(join(dir, 'assets'));
  mkdirSync(join(dir, 'personnages'));
  writeFileSync(join(dir, 'assets', 'main-abc123.js'), 'console.log(1);');
  writeFileSync(join(dir, 'personnages', 'macron.webp'), 'image');
  writeFileSync(join(dir, 'personnages', 'macron.json'), '{}');
  writeFileSync(join(dir, 'manifest.json'), '{}');
  const versions = assetVersions(dir);
  assert.deepEqual(Object.keys(versions).sort(), ['manifest.json', 'personnages/macron.webp'], 'what only feeds the manifest has no version');
  assert.equal(versions['personnages/macron.webp'], contentHash('image'));
  const { server, port } = await startServer({}, { staticDir: dir });
  const get = (path: string, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${port}${path}`, { headers });
  const forever = 'public, max-age=31536000, immutable';
  assert.equal((await get('/assets/main-abc123.js')).headers.get('cache-control'), forever, 'Vite names its bundles by their content');
  const versioned = await get(`/personnages/macron.webp?v=${versions['personnages/macron.webp']}`);
  assert.equal(versioned.headers.get('cache-control'), forever);
  assert.equal(versioned.headers.get('content-length'), '5');
  assert.equal(versioned.headers.get('etag'), `"${versions['personnages/macron.webp']}"`);
  assert.equal(await versioned.text(), 'image');
  assert.equal((await get('/personnages/macron.webp?v=ancienne')).headers.get('cache-control'), 'no-cache', 'an old page asking an old version');
  assert.equal((await get('/personnages/macron.webp')).headers.get('cache-control'), 'no-cache');
  // A proxy that compresses may weaken the tag: it still matches.
  assert.equal((await get('/manifest.json', { 'If-None-Match': `W/"${versions['manifest.json']}"` })).status, 304);
  // The file changes under a running server (a rebuild): its version follows.
  writeFileSync(join(dir, 'personnages', 'macron.webp'), 'autre image');
  const changed = await get('/personnages/macron.webp', { 'If-None-Match': `"${versions['personnages/macron.webp']}"` });
  assert.equal(changed.status, 200);
  assert.equal(changed.headers.get('etag'), `"${contentHash('autre image')}"`);
  await server.stop();
});

test('nothing outside the client\'s folder can be reached', async () => {
  const { server, port } = await startServer({}, { staticDir: 'src/client' });
  for (const path of ['/../../package.json', '/%2e%2e/%2e%2e/package.json', '/..%2f..%2fpackage.json', '/absent.js', '/%zz']) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.equal(response.status, 404, path);
    assert.ok(!(await response.text()).includes('"dependencies"'), path);
  }
  await server.stop();
});

test('TokenBucket allows a burst, then only its rate', () => {
  let now = 0;
  const bucket = new TokenBucket(2, 1, () => now);
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), false);
  now = 1000;
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), false);
  now = 100_000;
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), false);
});

test('reconnectDelay grows, up to a ceiling', () => {
  assert.equal(reconnectDelay(0), 500);
  assert.equal(reconnectDelay(1), 1000);
  assert.equal(reconnectDelay(20), 8000);
});

test('no player text can reach the page as HTML', () => {
  function sources(folder: string): string[] {
    return readdirSync(folder).flatMap((name) => {
      const path = join(folder, name);
      return statSync(path).isDirectory() ? sources(path) : /\.(vue|ts)$/.test(name) ? [path] : [];
    });
  }
  // The HyperFrames episodes (cutscenes/composed, generated by the export of their project) draw with SVG markup they
  // carry themselves, as constants: no text from a player ever goes through them.
  for (const file of sources('src/client').filter((path) => !path.startsWith(join('src', 'client', 'cutscenes', 'composed')))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /v-html|innerHTML|outerHTML|insertAdjacentHTML/, file);
  }
});

test('robots.txt, the sitemap, the icons and the search engine verification are served with their types', async () => {
  const { server, port } = await startServer({}, { staticDir: 'assets/game' });
  const base = `http://127.0.0.1:${port}`;
  const robots = await fetch(`${base}/robots.txt`);
  assert.match(robots.headers.get('content-type') ?? '', /^text\/plain/);
  assert.match(await robots.text(), /^Sitemap: https:\/\/casserolade\.fr\/sitemap\.xml$/m);
  const sitemap = await fetch(`${base}/sitemap.xml`);
  assert.match(sitemap.headers.get('content-type') ?? '', /^application\/xml/);
  const pages = [...(await sitemap.text()).matchAll(/<loc>(.+?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(pages, ['https://casserolade.fr/', 'https://casserolade.fr/bestiaire', 'https://casserolade.fr/a-propos']);
  assert.equal((await fetch(`${base}/favicon.ico`)).headers.get('content-type'), 'image/x-icon');
  assert.equal((await fetch(`${base}/icone-192.png`)).headers.get('content-type'), 'image/png');
  assert.equal(await (await fetch(`${base}/google4ee2fc5ee14f5830.html`)).text(), 'google-site-verification: google4ee2fc5ee14f5830.html');
  await server.stop();
});

const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const PAGE_EVENT = JSON.stringify({ type: 'page', page: 'jeu', appareil: 'ordinateur', nouveau: true, premier: true, source: 'discord.com' });

test('the counter: events of the game\'s pages only, checked, robots apart, a rate per address; the health check counts nothing', async () => {
  const { server, port } = await startServer({ counterBurst: 5, counterPerMinute: 0.001 }, { statsToken: 'jeton-secret' });
  const base = `http://127.0.0.1:${port}`;
  const post = (body: string, headers: Record<string, string> = {}) => fetch(`${base}/compteur`, { method: 'POST', body, headers: { origin: ORIGIN, 'user-agent': BROWSER, 'content-type': 'text/plain', ...headers } });
  const health = await fetch(`${base}/sante`);
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'ok');
  assert.equal((await fetch(`${base}/compteur`)).status, 405);
  assert.equal((await post(PAGE_EVENT, { origin: 'https://ailleurs.example' })).status, 403, 'another site cannot count');
  assert.equal((await post(PAGE_EVENT)).status, 204);
  assert.equal((await post('{"type":"page"}')).status, 400);
  assert.equal((await post(JSON.stringify({ type: 'partie', mode: 'tutoriel', remplissage: 'x'.repeat(2000) }))).status, 413);
  assert.equal((await post('{"type":"partie","mode":"solo","niveau":"moyen"}')).status, 204);
  assert.equal((await post(PAGE_EVENT, { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' })).status, 204);
  assert.equal((await post(PAGE_EVENT)).status, 429, 'past its burst, an address waits');
  const json = await (await fetch(`${base}/stats/jeton-secret.json`)).json() as { days: { visiteurs: number; nouveaux: number; robots: number; sources: Record<string, number>; local: { solo: { lancees: number } } }[]; events: { type: string; texte: string }[] };
  const day = json.days.at(-1);
  assert.equal(day?.visiteurs, 1);
  assert.equal(day?.nouveaux, 1);
  assert.deepEqual(day?.sources, { 'discord.com': 1 });
  assert.equal(day?.local.solo.lancees, 1);
  assert.equal(day?.robots, 1, 'the robot is counted apart');
  assert.ok(json.events.some((event) => event.type === 'visite' && event.texte.includes('discord.com')), 'the feed shows the visit');
  await server.stop();
});

test('the home page\'s live count: rooms and games in the pages, players online, robots ignored, the day\'s totals untouched', async () => {
  const { server, port } = await startServer({}, { statsToken: 'jeton-secret' });
  const base = `http://127.0.0.1:${port}`;
  const post = (body: string, userAgent = BROWSER) => fetch(`${base}/compteur`, { method: 'POST', body, headers: { origin: ORIGIN, 'user-agent': userAgent, 'content-type': 'text/plain' } });
  const live = async () => (await fetch(`${base}/en-direct`)).json() as Promise<Record<string, unknown>>;
  assert.deepEqual(await live(), { parties: 0, enLigne: 0, joueurs: 0, discord: null });
  for (const body of ['{"type":"presence"}', '{"type":"presence"}', '{"type":"en_jeu","mode":"solo"}', '{"type":"en_jeu","mode":"tutoriel"}']) assert.equal((await post(body)).status, 204);
  assert.equal((await post('{"type":"presence"}', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).status, 204);
  assert.deepEqual(await live(), { parties: 2, enLigne: 0, joueurs: 2, discord: null }, 'the robot is not a player');
  const { host, guest } = await createRoomWithTwo(`ws://127.0.0.1:${port}${SOCKET_PATH}`);
  assert.deepEqual(await live(), { parties: 4, enLigne: 2, joueurs: 4, discord: null }, 'a room counts one game per player in it, as in solo');
  host.socket.close();
  guest.socket.close();
  const answer = await fetch(`${base}/en-direct`);
  assert.equal(answer.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(`${base}/en-direct`, { method: 'POST' })).status, 405);
  const json = await (await fetch(`${base}/stats/jeton-secret.json`)).json() as { days: { robots: number; pages: Record<string, number> }[]; events: unknown[]; samples: unknown[] };
  assert.equal(json.days.at(-1)?.robots, 0, 'a robot\'s presence is not even a robot\'s visit');
  assert.deepEqual(json.events.filter((event) => ['visite', 'local'].includes((event as { type: string }).type)), [], 'the presence signals stay out of the feed');
  await server.stop();
});

test('the secret statistics page: only with its token, live over Server-Sent Events; loading a page counts nothing by itself', async () => {
  const { server, port } = await startServer({}, { staticDir: 'src/client', statsToken: 'jeton-secret' });
  const base = `http://127.0.0.1:${port}`;
  for (const path of ['/stats/', '/stats/autre', '/stats/jeton-secre', '/stats/jeton-secret/../package.json', '/stats/jeton-secret/flux/x', '/stats/constructor', '/stats/__proto__', '/stats/toString', '/stats/jeton-secret/constructor', '/stats/jeton-secret/hasOwnProperty']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404, path);
  }
  assert.equal((await fetch(`${base}/`)).status, 200);
  const page = await fetch(`${base}/stats/jeton-secret`);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.match(page.headers.get('content-security-policy') ?? '', /script-src 'self'/);
  assert.match(await page.text(), /<script src="\/stats\/jeton-secret\/tableau\.js">/);
  const script = await fetch(`${base}/stats/jeton-secret/tableau.js`);
  assert.match(script.headers.get('content-type') ?? '', /javascript/);
  assert.match(await script.text(), /EventSource/);
  assert.match(await (await fetch(`${base}/stats/jeton-secret/frequentation.js`)).text(), /Ne plus compter ce navigateur/);
  const json = await (await fetch(`${base}/stats/jeton-secret.json`)).json() as { days: { visiteurs: number; pages: Record<string, number> }[] };
  assert.equal(json.days.at(-1)?.visiteurs, 0, 'the page counts its own visit, the server does not');
  assert.equal(json.days.at(-1)?.pages.jeu, 0);
  // The stream: the history first, then a measure each second.
  const controller = new AbortController();
  const stream = await fetch(`${base}/stats/jeton-secret/flux`, { signal: controller.signal });
  assert.match(stream.headers.get('content-type') ?? '', /text\/event-stream/);
  const reader = (stream.body as ReadableStream<Uint8Array>).getReader();
  let text = '';
  while (!text.includes('event: mesure')) text += new TextDecoder().decode((await reader.read()).value);
  assert.match(text, /event: bonjour\ndata: \{/);
  assert.match(text, /"connexions":\d+/);
  controller.abort();
  await server.stop();
});
