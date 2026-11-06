import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import type { CombatView, PlayerView } from '../src/engine/game.ts';
import { createWebSocketTransport } from '../src/client/services/createWebSocketTransport.ts';
import type { SocketLike } from '../src/client/services/createWebSocketTransport.ts';
import { reconnectDelay } from '../src/client/tools/reconnectDelay.ts';
import type { ClientMessage, ServerMessage } from '../src/protocol/messages.ts';
import { MAX_MESSAGE_BYTES } from '../src/protocol/parseClientMessage.ts';
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
const VIEW_KEYS = new Set(['seat', 'round', 'phase', 'plateau', 'animateur', 'heroOffers', 'alive', 'place', 'hp', 'tier', 'budget', 'upgradeCost', 'buyCost', 'rollCost', 'boardLimit', 'scandalThreshold', 'stats', 'heroId', 'mods', 'board', 'hand', 'handLimit', 'shop', 'frozen', 'casseroleOffer', 'casseroleCost', 'discover', 'camps', 'maxBudget', 'nextBudget', 'freeRolls', 'spells', 'shopGains', 'shopSpells', 'shopSpellCosts', 'discoverKind', 'tract', 'counters', 'contextId', 'params', 'seen', 'table']);
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
  assert.ok(bought.type === 'vue' && bought.vue.board.length === 1);
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

test('the game server serves the built client, and nothing outside its folder', async () => {
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
  for (const file of sources('src/client')) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /v-html|innerHTML|outerHTML|insertAdjacentHTML/, file);
  }
});

test('the secret statistics page: only with its token, live over Server-Sent Events, and a visit counts', async () => {
  const { server, port } = await startServer({}, { staticDir: 'src/client', statsToken: 'jeton-secret' });
  const base = `http://127.0.0.1:${port}`;
  for (const path of ['/stats/', '/stats/autre', '/stats/jeton-secre', '/stats/jeton-secret/../package.json', '/stats/jeton-secret/flux/x']) {
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
  const json = await (await fetch(`${base}/stats/jeton-secret.json`)).json() as { days: { visites: number }[] };
  assert.equal(json.days.at(-1)?.visites, 1, 'la visite de la page du jeu est comptée');
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
