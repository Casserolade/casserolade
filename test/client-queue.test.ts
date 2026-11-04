import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebSocketTransport } from '../src/client/services/createWebSocketTransport.ts';
import type { SocketLike } from '../src/client/services/createWebSocketTransport.ts';
import { playerId, savePseudo, savedPseudo } from '../src/client/services/localProfile.ts';
import type { ProfileStorage } from '../src/client/services/localProfile.ts';
import { createGameStore } from '../src/client/stores/createGameStore.ts';
import { formatWait, queueSummary, waitedMs } from '../src/client/tools/queueSummary.ts';
import type { ClientMessage, ServerMessage, VueFile, VueSalon } from '../src/protocol/messages.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import type { Transport } from '../src/protocol/transport.ts';

function memoryStorage(): ProfileStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function brokenStorage(): ProfileStorage {
  return {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
}

function fakeTransport() {
  const sent: ClientMessage[] = [];
  let listener: (message: ServerMessage) => void = () => {};
  const transport: Transport = {
    send: (message) => void sent.push(message),
    onMessage: (next) => (listener = next),
    onClose: () => {},
    close: () => {},
  };
  return { transport, sent, receive: (message: ServerMessage) => listener(message) };
}

function queueView(partial: Partial<VueFile> = {}): VueFile {
  return {
    mmr: 1000,
    attente_ms: 12_000,
    groupe: [{ pseudo: 'Marianne', vote: false, moi: true }, { pseudo: 'Gaspard', vote: true, moi: false }],
    vote: false,
    majorite: 2,
    en_file: 2,
    ...partial,
  };
}

const PUBLIC_ROOM: VueSalon = {
  code: 'ABC234',
  siege: 0,
  hote: 0,
  etat: 'en_jeu',
  options: { bots: 0, niveauBots: 'moyen', minuteur: true },
  joueurs: [{ siege: 0, pseudo: 'Marianne', bot: false, connecte: true }],
  publique: true,
};

test('playerId : un identifiant anonyme créé une fois, gardé, et accepté par le serveur', () => {
  const storage = memoryStorage();
  const first = playerId(storage);
  assert.equal(playerId(storage), first);
  assert.ok(parseClientMessage(JSON.stringify({ type: 'file_rejoindre', pseudo: 'A', joueur: first })), first);
  storage.data.set('casserolade.joueur', 'trop court');
  const replaced = playerId(storage, () => 'abcdef0123456789abcdef');
  assert.equal(replaced, 'abcdef0123456789abcdef');
  assert.equal(storage.data.get('casserolade.joueur'), replaced);
});

test('playerId : sans stockage, le même identifiant dure le temps de la page', () => {
  let n = 0;
  const make = () => `page-id-0000000000-${n++}`;
  const id = playerId(brokenStorage(), make);
  assert.equal(playerId(brokenStorage(), make), id);
  assert.equal(playerId(null, make), id);
});

test('le pseudo se retrouve d\'une visite à l\'autre, et un stockage bloqué ne casse rien', () => {
  const storage = memoryStorage();
  savePseudo('  Marianne  ', storage);
  assert.equal(savedPseudo(storage), 'Marianne');
  savePseudo('x'.repeat(40), storage);
  assert.equal(savedPseudo(storage).length, 24);
  assert.equal(savedPseudo(brokenStorage()), '');
  assert.doesNotThrow(() => savePseudo('Marianne', brokenStorage()));
});

test('queueSummary et le temps d\'attente', () => {
  assert.deepEqual(queueSummary(queueView()), { yes: 1, needed: 2, empty: 6 });
  assert.equal(waitedMs(queueView(), 1000, 4000), 15_000);
  assert.equal(waitedMs(queueView(), 5000, 4000), 12_000, 'jamais en arrière');
  assert.equal(formatWait(42_500), '0:42');
  assert.equal(formatWait(725_000), '12:05');
});

test('la file publique : entrer, voir sa table, voter, puis la table part et le salon suit', () => {
  const { transport, sent, receive } = fakeTransport();
  const store = createGameStore(transport);
  store.joinQueue('Marianne', 'joueur-0000000000000000');
  assert.deepEqual(sent.at(-1), { type: 'file_rejoindre', pseudo: 'Marianne', joueur: 'joueur-0000000000000000' });
  assert.equal(store.screen.value, 'queue', 'la file s\'affiche avant sa première vue');
  receive({ type: 'file', file: queueView() });
  assert.equal(store.queue.value?.groupe.length, 2);

  store.voteQueue(true);
  assert.deepEqual(sent.at(-1), { type: 'file_vote', oui: true });
  assert.equal(store.queue.value?.vote, true, 'le vote se voit tout de suite');
  assert.equal(store.queue.value?.groupe.find((seat) => seat.moi)?.vote, true);

  receive({ type: 'file', file: null });
  receive({ type: 'salon', salon: PUBLIC_ROOM, jeton: 'jeton' });
  assert.equal(store.queueing.value, false);
  assert.notEqual(store.screen.value, 'queue');
  store.leave();
});

test('après une partie publique : le MMR s\'affiche, et on retourne dans la file', () => {
  const { transport, sent, receive } = fakeTransport();
  const store = createGameStore(transport);
  receive({ type: 'salon', salon: { ...PUBLIC_ROOM, etat: 'fini' }, jeton: 'jeton' });
  receive({ type: 'fin', classement: [{ seat: 0, pseudo: 'Marianne', heroId: 'hollande', place: 2 }] });
  receive({ type: 'mmr', avant: 1000, apres: 1021 });
  assert.equal(store.screen.value, 'end');
  assert.deepEqual(store.mmrChange.value, { avant: 1000, apres: 1021 });
  store.joinQueue('Marianne', 'joueur-0000000000000000');
  assert.equal(store.screen.value, 'queue');
  assert.equal(store.ranking.value, null);
  assert.equal(store.mmrChange.value, null);
  assert.equal(sent.at(-1)?.type, 'file_rejoindre');
  store.leave();
});

test('la file qui laisse partir sans salon : un autre onglet a pris la place', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  store.joinQueue('Marianne', 'joueur-0000000000000000');
  receive({ type: 'file', file: queueView() });
  receive({ type: 'file', file: null });
  assert.equal(store.queueLost.value, false, 'un salon peut encore suivre');
  t.mock.timers.tick(2500);
  assert.equal(store.queueLost.value, true);
  assert.equal(store.screen.value, 'queue');
  // Une file pleine refuse l'entrée : même écran, même bouton pour réessayer.
  store.joinQueue('Marianne', 'joueur-0000000000000000');
  assert.equal(store.queueLost.value, false);
  receive({ type: 'erreur', erreur: 'La file est pleine. Réessayez dans un instant.' });
  assert.equal(store.queueLost.value, true);
  store.leave();
});

test('entrer dans la file oublie le jeton du salon : un rechargement ne le reprend pas', () => {
  const stored = new Map<string, string>([['plateau.jeton', 'ancien']]);
  const socket: SocketLike & { sent: string[] } = {
    readyState: 1,
    onopen: null,
    onmessage: null,
    onclose: null,
    sent: [],
    send(text) {
      this.sent.push(text);
    },
    close() {},
  };
  const transport = createWebSocketTransport({
    url: 'ws://test',
    createSocket: () => socket,
    storage: { getItem: (k) => stored.get(k) ?? null, setItem: (k, v) => void stored.set(k, v), removeItem: (k) => void stored.delete(k) },
  });
  transport.send({ type: 'file_rejoindre', pseudo: 'Marianne', joueur: 'joueur-0000000000000000' });
  assert.equal(stored.has('plateau.jeton'), false);
  assert.equal(JSON.parse(socket.sent[0]).type, 'file_rejoindre');
});
