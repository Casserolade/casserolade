import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebSocketTransport } from '../src/client/services/createWebSocketTransport.ts';
import type { SocketLike } from '../src/client/services/createWebSocketTransport.ts';
import type { ConnectionStatus } from '../src/client/services/connectionStatus.ts';
import { clearLocalGame, interruptedNotice, markLocalGame, takeInterruptedGame } from '../src/client/services/interruptedGame.ts';
import type { MarkStorage } from '../src/client/services/interruptedGame.ts';
import { createGameStore, RECONNECTING_NOTICE } from '../src/client/stores/createGameStore.ts';
import { cardRuleLines } from '../src/client/tools/describeEffect.ts';
import { combatHp } from '../src/client/tools/combatHp.ts';
import { fittedRulesSize } from '../src/client/tools/fittedRulesSize.ts';
import { ordinalSuffix } from '../src/client/tools/ordinalSuffix.ts';
import { destroysTarget, heldSpellEffects } from '../src/client/tools/playTargets.ts';
import { DEFAULT_PSEUDO, pseudoOrDefault } from '../src/client/tools/pseudoOrDefault.ts';
import { splitPolls } from '../src/client/tools/splitPolls.ts';
import { summarizeCombatOutcome } from '../src/client/tools/summarizeCombatOutcome.ts';
import { CARD_BY_ID, CARDS } from '../src/data/cards.ts';
import { SPELL_BY_ID } from '../src/data/sorts.ts';
import { createGame, viewFor } from '../src/engine/game.ts';
import type { CombatView, PlayerView } from '../src/engine/game.ts';
import type { ClientMessage, ServerMessage, VueFile } from '../src/protocol/messages.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import type { Transport } from '../src/protocol/transport.ts';

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

/** A real view of a fresh game, seat 0, in recruitment. */
function baseView(partial: Partial<PlayerView> = {}): PlayerView {
  return { ...viewFor(createGame({ seed: 7 }), 0), ...partial };
}

function combatOf(partial: Partial<CombatView> = {}): CombatView {
  return { round: 1, side: 0, opponent: { seat: 1, heroId: 'hollande' }, log: [], winner: 1, damage: [3, 0], endOfTurn: [], ...partial };
}

function memoryMarks(): MarkStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

/** A socket the test opens and closes by hand. */
function fakeSockets() {
  const sockets: (SocketLike & { sent: string[]; state: number; open(): void; drop(): void })[] = [];
  const createSocket = () => {
    const socket = {
      state: 0,
      get readyState() {
        return this.state;
      },
      onopen: null as ((event: never) => void) | null,
      onmessage: null as ((event: { data: unknown }) => void) | null,
      onclose: null as ((event: never) => void) | null,
      sent: [] as string[],
      send(text: string) {
        this.sent.push(text);
      },
      close() {
        this.drop();
      },
      open() {
        this.state = 1;
        this.onopen?.(undefined as never);
      },
      drop() {
        this.state = 3;
        this.onclose?.(undefined as never);
      },
    };
    sockets.push(socket);
    return socket;
  };
  return { sockets, createSocket };
}

// 1. Un code inconnu ou un pseudo vide ne laisse jamais le joueur sur « Mise en place du plateau… ».

test('un pseudo vide part sous le nom que suggère l\'accueil, et le serveur l\'accepte', () => {
  assert.equal(pseudoOrDefault(''), DEFAULT_PSEUDO);
  assert.equal(pseudoOrDefault('   '), DEFAULT_PSEUDO);
  assert.equal(pseudoOrDefault('  Marianne  '), 'Marianne');
  assert.equal(pseudoOrDefault('x'.repeat(40)).length, 24);
  for (const message of [
    { type: 'creer_salon', pseudo: pseudoOrDefault(''), options: { bots: 0, niveauBots: 'moyen', minuteur: true } },
    { type: 'rejoindre', code: 'ZZZZZZ', pseudo: pseudoOrDefault('') },
    { type: 'file_rejoindre', pseudo: pseudoOrDefault(''), joueur: 'joueur-0000000000000000' },
  ] satisfies ClientMessage[]) {
    assert.ok(parseClientMessage(JSON.stringify(message)), message.type);
  }
});

test('une demande refusée (code inconnu) ramène le joueur avec le message, sans bulle', () => {
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  store.joinRoom('ZZZZZZ', 'Marianne');
  assert.equal(store.screen.value, 'loading');
  receive({ type: 'erreur', erreur: 'Ce salon n\'existe pas, ou plus.' });
  assert.equal(store.refused.value, 'Ce salon n\'existe pas, ou plus.');
  assert.equal(store.notice.value, null);
  store.leave();
});

test('une erreur en pleine partie reste une bulle : rien n\'est refusé', () => {
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  receive({ type: 'vue', vue: baseView(), reste_ms: 30_000 });
  receive({ type: 'erreur', erreur: 'Trop de messages.' });
  assert.equal(store.refused.value, null);
  assert.equal(store.notice.value, 'Trop de messages.');
  store.leave();
});

test('la file qui refuse l\'entrée dit pourquoi, au lieu d\'accuser un autre onglet', () => {
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  store.joinQueue('Marianne', 'joueur-0000000000000000');
  receive({ type: 'erreur', erreur: 'La file est pleine. Réessayez dans un instant.' });
  assert.equal(store.screen.value, 'queue');
  assert.equal(store.queueLost.value, true);
  assert.equal(store.queueLostReason.value, 'La file est pleine. Réessayez dans un instant.');
  store.joinQueue('Marianne', 'joueur-0000000000000000');
  assert.equal(store.queueLostReason.value, null);
  const file: VueFile = { mmr: 1000, attente_ms: 0, groupe: [{ pseudo: 'Marianne', vote: false, moi: true }], vote: false, majorite: 1, en_file: 1 };
  receive({ type: 'file', file });
  assert.equal(store.queueLost.value, false);
  store.leave();
});

// 2. Le combat garde la vue de son début, et reste à l'écran jusqu'à la manche suivante.

test('la vue de la manche suivante ne change pas ce que montre le combat, qui reste jusqu\'à elle', () => {
  const { transport, sent, receive } = fakeTransport();
  const store = createGameStore(transport);
  const before = baseView({ round: 3, hp: 21 });
  receive({ type: 'vue', vue: before, reste_ms: 30_000 });
  receive({ type: 'combat', combat: combatOf({ round: 3, damage: [4, 0] }) });
  receive({ type: 'vue', vue: baseView({ round: 4, hp: 17 }), reste_ms: 30_000 });
  assert.equal(store.screen.value, 'combat', 'le combat n\'a pas été vu : il reste');
  assert.equal(store.combatView.value, before, 'le combat garde la vue de son début');
  store.closeCombat();
  assert.deepEqual(sent.at(-1), { type: 'vu' });
  assert.equal(store.screen.value, 'recruit', 'la manche suivante est déjà là');
  assert.equal(store.view.value?.round, 4);
  store.leave();
});

test('après « vu », le combat attend la manche suivante au lieu de remontrer l\'ancien recrutement', () => {
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  receive({ type: 'vue', vue: baseView({ round: 2 }), reste_ms: 30_000 });
  receive({ type: 'combat', combat: combatOf({ round: 2 }) });
  store.closeCombat();
  assert.equal(store.screen.value, 'combat');
  // Une reconnexion renvoie la vue du combat, puis le combat : il n'est pas rejoué.
  receive({ type: 'vue', vue: baseView({ round: 2, phase: 'combat' }), reste_ms: 20_000 });
  receive({ type: 'combat', combat: combatOf({ round: 2 }) });
  assert.equal(store.screen.value, 'combat');
  receive({ type: 'vue', vue: baseView({ round: 3 }), reste_ms: 35_000 });
  assert.equal(store.screen.value, 'recruit');
  receive({ type: 'combat', combat: combatOf({ round: 2 }) });
  assert.equal(store.screen.value, 'recruit', 'un combat déjà vu ne revient pas');
  store.leave();
});

test('combatHp : les sondages d\'avant le combat, et d\'après, même quand la vue compte déjà le combat', () => {
  const view = baseView({ round: 5, hp: 12 });
  const enemy = view.table.find((row) => row.seat === 1);
  assert.ok(enemy);
  const result = combatHp(combatOf({ round: 5, damage: [4, 2] }), view);
  assert.deepEqual(result.own, { before: 12, after: 8 });
  assert.deepEqual(result.enemy, { before: enemy.hp, after: enemy.hp - 2 });
  assert.equal(result.eliminated, false);
  const counted = combatHp(combatOf({ round: 5, damage: [4, 2] }), { ...view, hp: 8, phase: 'combat' });
  assert.deepEqual(counted.own, { before: 12, after: 8 });
  const tired = combatHp(combatOf({ round: view.params.wearinessRound + 1, damage: [0, 0], winner: null }), { ...view, round: view.params.wearinessRound + 1, hp: 2 });
  assert.equal(tired.eliminated, true, 'la lassitude des électeurs compte aussi');
});

// 3. Coupure en ligne : dite tout de suite, réessayée sans fin, jamais abandonnée sans le joueur.

test('une coupure se dit tout de suite, devient « perdue » vers 15 s, et le client réessaie sans fin', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { sockets, createSocket } = fakeSockets();
  const stored = new Map<string, string>();
  const transport = createWebSocketTransport({
    url: 'ws://test',
    createSocket,
    storage: { getItem: (k) => stored.get(k) ?? null, setItem: (k, v) => void stored.set(k, v), removeItem: (k) => void stored.delete(k) },
  });
  const statuses: ConnectionStatus[] = [];
  transport.onStatus((status) => statuses.push(status));
  sockets[0].open();
  sockets[0].onmessage?.({ data: JSON.stringify({ type: 'salon', salon: { code: 'ABC234', siege: 0, hote: 0, etat: 'en_jeu', options: { bots: 0, niveauBots: 'moyen', minuteur: true }, joueurs: [] }, jeton: 'jeton' }) });
  sockets[0].drop();
  assert.deepEqual(statuses, ['reconnecting'], 'dit dès la première coupure');
  for (let attempt = 0; attempt < 12; attempt++) {
    t.mock.timers.tick(8000);
    sockets.at(-1)?.drop();
  }
  assert.ok(sockets.length > 9, 'toujours des essais après huit');
  assert.deepEqual(statuses, ['reconnecting', 'lost']);
  assert.equal(stored.get('plateau.jeton'), 'jeton', 'le siège reste à reprendre');
  // « Réessayer » : un essai tout de suite, et le siège est repris avec son jeton.
  const count = sockets.length;
  t.mock.timers.tick(100);
  transport.retry();
  assert.equal(sockets.length, count + 1);
  sockets.at(-1)?.open();
  assert.deepEqual(statuses, ['reconnecting', 'lost', 'open']);
  assert.deepEqual(JSON.parse(sockets.at(-1)?.sent[0] ?? '{}'), { type: 'reprendre', jeton: 'jeton' });
  transport.close();
});

test('pendant la reconnexion, un geste n\'est pas envoyé en douce : le joueur est prévenu', () => {
  let report: (status: ConnectionStatus) => void = () => {};
  const { transport, sent, receive } = fakeTransport();
  let retried = 0;
  const store = createGameStore({ ...transport, onStatus: (listener) => (report = listener), retry: () => retried++ });
  receive({ type: 'vue', vue: baseView(), reste_ms: 30_000 });
  report('reconnecting');
  store.act({ t: 'roll' });
  assert.equal(sent.length, 0);
  assert.equal(store.notice.value, RECONNECTING_NOTICE);
  report('lost');
  assert.equal(store.connectionLost.value, true);
  store.retry();
  assert.equal(retried, 1);
  assert.equal(sent.some((message) => message.type === 'quitter'), false, 'rien ne rend le siège sans le joueur');
  report('open');
  store.act({ t: 'roll' });
  assert.equal(sent.at(-1)?.type, 'action');
  store.leave();
});

// 5. Un effet qui détruit demande toujours sa cible.

test('Hidalgo et la Primaire détruisent leur cible : elle se choisit toujours, même seule', () => {
  assert.equal(destroysTarget(CARD_BY_ID.hidalgo.effects ?? []), true);
  assert.equal(destroysTarget(heldSpellEffects({ uid: 1, spellId: 'primaire' })), true);
  assert.equal(destroysTarget(CARD_BY_ID.valls.effects ?? []), false);
  assert.equal(destroysTarget(SPELL_BY_ID.sondage_flatteur.effects), false);
  assert.equal(destroysTarget(heldSpellEffects({ uid: 2, casseroleId: 'x' })), false);
});

// 7. Un politique doré dit ce qu'il fait vraiment.

test('le texte d\'un politique doré double ce que le moteur double', () => {
  assert.ok(cardRuleLines(CARD_BY_ID.cheminade, { isGolden: true }).includes('**Vente** : **découvrez** un sort, deux fois.'));
  assert.ok(cardRuleLines(CARD_BY_ID.doucet, { isGolden: true }).includes('**Fin de tour** : gagne +2/+2.'));
  assert.match(cardRuleLines(CARD_BY_ID.chirac, { isGolden: true }).join(' '), /trois fois/);
  assert.match(cardRuleLines(CARD_BY_ID.oudea).join(' '), /Toujours doré.*\+1\/\+0/);
  assert.match(cardRuleLines(CARD_BY_ID.oudea, { isGolden: true }).join(' '), /\+2\/\+0/);
  assert.ok(cardRuleLines(CARD_BY_ID.doucet).includes('**Fin de tour** : gagne +1/+1.'), 'un politique simple garde son texte');
  for (const card of CARDS) {
    const lines = cardRuleLines(card, { isGolden: true });
    assert.ok(lines.every((line) => !/undefined|NaN/.test(line)), card.id);
  }
});

// 9. Le combat qui élimine le dit, et l'écran d'élimination passe avant le classement.

test('un combat mortel dit l\'élimination, pas « vous perdez 5 points »', () => {
  const view = baseView({ round: 4, hp: 1 });
  const fatal = combatOf({ round: 4, damage: [5, 0] });
  const { eliminated } = combatHp(fatal, view);
  assert.equal(eliminated, true);
  assert.match(summarizeCombatOutcome(fatal, { eliminated }), /éliminé/);
  assert.doesNotMatch(summarizeCombatOutcome(fatal, { eliminated }), /^Perdu/);
});

test('éliminé alors que le classement arrive aussitôt (solo) : l\'élimination se montre, puis le classement', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  receive({ type: 'vue', vue: baseView({ round: 4, hp: 1 }), reste_ms: 30_000 });
  receive({ type: 'combat', combat: combatOf({ round: 4, damage: [5, 0] }) });
  store.closeCombat();
  receive({ type: 'vue', vue: baseView({ round: 15, hp: -4, alive: false, place: 8 }), reste_ms: null });
  receive({ type: 'fin', classement: [{ seat: 0, pseudo: 'Vous', heroId: 'hollande', place: 8 }] });
  assert.equal(store.screen.value, 'eliminated');
  t.mock.timers.tick(6500);
  assert.equal(store.screen.value, 'end');
  store.leave();
});

test('l\'écran d\'élimination laisse voir le classement tout de suite, si le joueur le veut', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  receive({ type: 'vue', vue: baseView({ alive: false, place: 2 }), reste_ms: null });
  receive({ type: 'fin', classement: [{ seat: 0, pseudo: 'Vous', heroId: 'hollande', place: 2 }] });
  assert.equal(store.screen.value, 'eliminated');
  store.showRanking();
  assert.equal(store.screen.value, 'end');
  store.leave();
});

test('éliminé bien avant la fin (en ligne) : le classement s\'affiche dès qu\'il arrive', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  receive({ type: 'vue', vue: baseView({ alive: false, place: 6 }), reste_ms: null });
  assert.equal(store.screen.value, 'eliminated');
  t.mock.timers.tick(60_000);
  receive({ type: 'fin', classement: [{ seat: 0, pseudo: 'Vous', heroId: 'hollande', place: 6 }] });
  assert.equal(store.screen.value, 'end');
  store.leave();
});

// 11. Une partie locale coupée par un rechargement se dit à l'accueil.

test('une partie locale coupée par un rechargement se dit une fois, et une partie finie ne dit rien', () => {
  const storage = memoryMarks();
  markLocalGame({ kind: 'solo', botLevel: 'difficile', contexte: 'mercato' }, storage);
  const mark = takeInterruptedGame(storage);
  assert.deepEqual(mark, { kind: 'solo', botLevel: 'difficile', contexte: 'mercato' });
  assert.match(interruptedNotice(mark ?? { kind: 'solo' }).text, /rechargée/);
  assert.equal(takeInterruptedGame(storage), null, 'dit une seule fois');
  markLocalGame({ kind: 'carriere' }, storage);
  clearLocalGame(storage);
  assert.equal(takeInterruptedGame(storage), null);
  storage.setItem('casserolade.partie_locale', '{"kind":"autre"}');
  assert.equal(takeInterruptedGame(storage), null, 'une marque abîmée ne dit rien');
  assert.equal(takeInterruptedGame(null), null);
});

// 16, 22, 23 : textes et chiffres.

test('Bardella tient dans sa carte : la plus petite taille reste disponible', () => {
  assert.ok(fittedRulesSize(cardRuleLines(CARD_BY_ID.bardella)) < 24);
  assert.ok(fittedRulesSize(cardRuleLines(CARD_BY_ID.bardella, { isGolden: true })) < 24);
});

test('des sondages négatifs ne s\'affichent pas, et la première place se dit « 1re »', () => {
  assert.deepEqual(splitPolls(-6, 30), { polls: 0, electoralBase: 0 });
  assert.equal(`1${ordinalSuffix(1)}`, '1re');
  assert.equal(`8${ordinalSuffix(8)}`, '8e');
});

test('le chat : l\'historique remplace, une ligne reçue deux fois ne s\'affiche qu\'une fois, rien en solo', () => {
  const { transport, sent, receive } = fakeTransport();
  const store = createGameStore(transport);
  const salon = (code: string, humains: number) => ({
    type: 'salon' as const,
    jeton: 'j',
    salon: {
      code, siege: 0, hote: 0, etat: 'attente' as const, options: { bots: 0, niveauBots: 'moyen' as const, minuteur: true },
      joueurs: Array.from({ length: 8 }, (_, siege) => ({ siege, pseudo: `P${siege}`, bot: siege >= humains, connecte: true })),
    },
  });
  receive(salon('ABCD', 1));
  assert.equal(store.canChat.value, false, 'seul avec des bots : pas de chat');
  receive(salon('ABCD', 2));
  assert.equal(store.canChat.value, true);
  receive({ type: 'chat', messages: [{ id: 1, pseudo: 'P1', siege: 1, texte: 'salut' }], historique: true });
  receive({ type: 'chat', messages: [{ id: 2, pseudo: 'P0', siege: 0, texte: 'yo' }] });
  receive({ type: 'chat', messages: [{ id: 2, pseudo: 'P0', siege: 0, texte: 'yo' }] });
  assert.deepEqual(store.chat.value.map((line) => line.id), [1, 2]);
  store.sendChat('   gg   ');
  store.sendChat('    ');
  assert.deepEqual(sent.filter((m) => m.type === 'chat'), [{ type: 'chat', texte: 'gg' }]);
  assert.ok(parseClientMessage(JSON.stringify(sent.at(-1))));
  // Un autre salon : son chat n'est pas celui-ci.
  receive(salon('WXYZ', 2));
  assert.deepEqual(store.chat.value, []);
});
