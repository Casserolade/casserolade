import test from 'node:test';
import assert from 'node:assert/strict';
import { Lobby, SIEGES } from '../src/lobby/lobby.ts';
import type { ClientMessage, OptionsSalon, ServerMessage, VueSalon } from '../src/protocol/messages.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import type { PlayerView } from '../src/engine/game.ts';

const OPTIONS: OptionsSalon = { bots: 0, niveauBots: 'facile', minuteur: true };

/** Une horloge manuelle : le temps n'avance que quand le test le demande. */
function creerHorloge() {
  let t = 0;
  let id = 0;
  const attente = new Map<number, { at: number; cb: () => void }>();
  return {
    now: () => t,
    setTimeout(cb: () => void, ms: number) {
      attente.set(++id, { at: t + ms, cb });
      return id;
    },
    clearTimeout(h: unknown) {
      attente.delete(h as number);
    },
    avancer(ms: number) {
      const fin = t + ms;
      for (;;) {
        const prochain = [...attente.entries()].filter(([, x]) => x.at <= fin).sort((a, b) => a[1].at - b[1].at)[0];
        if (!prochain) break;
        attente.delete(prochain[0]);
        t = prochain[1].at;
        prochain[1].cb();
      }
      t = fin;
    },
  };
}

function creerTable() {
  const horloge = creerHorloge();
  const boites = new Map<string, ServerMessage[]>();
  const lobby = new Lobby({
    clock: horloge,
    graine: () => 42,
    send(c, m) {
      if (!boites.has(c)) boites.set(c, []);
      (boites.get(c) as ServerMessage[]).push(JSON.parse(JSON.stringify(m)));
    },
  });
  const dire = (c: string, m: ClientMessage) => lobby.handleMessage(c, m);
  const dernier = <T extends ServerMessage['type']>(c: string, type: T) =>
    [...(boites.get(c) ?? [])].reverse().find((m) => m.type === type) as Extract<ServerMessage, { type: T }> | undefined;
  const salon = (c: string): VueSalon => (dernier(c, 'salon') as Extract<ServerMessage, { type: 'salon' }>).salon;
  const vue = (c: string): PlayerView => (dernier(c, 'vue') as Extract<ServerMessage, { type: 'vue' }>).vue;
  return { horloge, boites, lobby, dire, dernier, salon, vue };
}

function creerSalon(t: ReturnType<typeof creerTable>, c = 'a', pseudo = 'Anne'): string {
  t.dire(c, { type: 'creer_salon', pseudo, options: OPTIONS });
  return t.salon(c).code;
}

test('créer un salon donne un code lisible, un jeton et 8 sièges, bots compris', () => {
  const t = creerTable();
  const code = creerSalon(t);
  assert.match(code, /^[A-HJKMNP-Z2-9]{6}$/);
  const s = t.salon('a');
  assert.equal(s.etat, 'attente');
  assert.equal(s.siege, 0);
  assert.equal(s.hote, 0);
  assert.equal(s.joueurs.length, SIEGES);
  assert.equal(s.joueurs.filter((j) => j.bot).length, 7);
  assert.ok((t.dernier('a', 'salon')?.jeton.length ?? 0) >= 32);
});

test('rejoindre remplace un bot, prévient tout le monde et accepte un code en minuscules', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code: code.toLowerCase(), pseudo: 'Anne' });
  assert.equal(t.salon('b').siege, 1);
  assert.equal(t.salon('a').joueurs.filter((j) => !j.bot).length, 2);
  // Deux joueurs ne portent jamais le même pseudo : le jeu les désigne par là.
  assert.equal(t.salon('a').joueurs[1].pseudo, 'Anne 2');
});

test('un mauvais code, un salon plein ou une partie commencée sont refusés', () => {
  const t = creerTable();
  t.dire('x', { type: 'rejoindre', code: 'AAAAAA', pseudo: 'Xav' });
  assert.match(t.dernier('x', 'erreur')?.erreur ?? '', /existe pas/);
  const code = creerSalon(t);
  for (let i = 1; i < SIEGES; i++) t.dire(`j${i}`, { type: 'rejoindre', code, pseudo: `J${i}` });
  t.dire('tard', { type: 'rejoindre', code, pseudo: 'Tard' });
  assert.match(t.dernier('tard', 'erreur')?.erreur ?? '', /complet/);
  t.dire('a', { type: 'lancer' });
  t.dire('tard2', { type: 'rejoindre', code, pseudo: 'Tard' });
  assert.match(t.dernier('tard2', 'erreur')?.erreur ?? '', /commencé/);
  t.lobby.destroy();
});

test('les pseudos sont nettoyés, jamais interprétés', () => {
  const t = creerTable();
  t.dire('a', { type: 'creer_salon', pseudo: '  Jean\u0000\n  Lassalle  ', options: OPTIONS });
  assert.equal(t.salon('a').joueurs[0].pseudo, 'Jean Lassalle');
  t.dire('b', { type: 'creer_salon', pseudo: '\u0007', options: OPTIONS });
  assert.equal(t.salon('b').joueurs[0].pseudo, 'Sans étiquette');
});

test('seul l\'hôte règle et lance, et le niveau de mesure n\'est pas proposé à table', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('b', { type: 'regler_salon', options: { ...OPTIONS, niveauBots: 'difficile' } });
  assert.match(t.dernier('b', 'erreur')?.erreur ?? '', /hôte/);
  t.dire('b', { type: 'lancer' });
  assert.equal(t.salon('a').etat, 'attente');
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, niveauBots: 'difficile', contexte: 'inconnu' } });
  assert.equal(t.salon('b').options.niveauBots, 'difficile');
  assert.equal(t.salon('b').options.contexte, undefined);
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, niveauBots: 'debutant' } });
  assert.equal(t.salon('b').options.niveauBots, 'moyen');
});

test('l\'hôte qui part passe la main au joueur suivant, et un salon vide disparaît', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('a', { type: 'quitter' });
  assert.equal(t.salon('b').siege, 0);
  assert.equal(t.salon('b').hote, 0);
  assert.equal(t.salon('b').joueurs[0].pseudo, 'Bob');
  t.dire('b', { type: 'regler_salon', options: { ...OPTIONS, minuteur: false } });
  assert.equal(t.salon('b').options.minuteur, false);
  t.dire('b', { type: 'quitter' });
  assert.equal(t.lobby.nombreDeSalons, 0);
});

test('en attente, une déconnexion garde la place 30 secondes, le jeton la reprend', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  const jeton = t.dernier('b', 'salon')?.jeton as string;
  t.lobby.disconnect('b');
  assert.equal(t.salon('a').joueurs[1].connecte, false);
  t.horloge.avancer(20_000);
  t.dire('b2', { type: 'reprendre', jeton });
  assert.equal(t.salon('b2').siege, 1);
  assert.equal(t.salon('a').joueurs[1].connecte, true);
  t.horloge.avancer(60_000);
  assert.equal(t.salon('a').joueurs[1].pseudo, 'Bob');
  t.lobby.disconnect('b2');
  t.horloge.avancer(31_000);
  assert.equal(t.salon('a').joueurs[1].bot, true);
  t.dire('b3', { type: 'reprendre', jeton });
  assert.match(t.dernier('b3', 'erreur')?.erreur ?? '', /existe plus/);
});

test('l\'hôte déconnecté trop longtemps passe aussi la main', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.lobby.disconnect('a');
  t.horloge.avancer(31_000);
  assert.equal(t.salon('b').hote, 0);
  assert.equal(t.salon('b').siege, 0);
});

test('3 humains et 5 bots jouent : une déconnexion ne casse rien et le siège se reprend', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('c', { type: 'rejoindre', code, pseudo: 'Cléo' });
  t.dire('a', { type: 'lancer' });
  assert.equal(t.salon('a').etat, 'en_jeu');
  assert.equal(t.salon('c').siege, 2);
  assert.equal(t.salon('a').joueurs.filter((j) => j.bot).length, 5);
  for (const c of ['a', 'b', 'c']) t.dire(c, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  assert.equal(t.vue('a').phase, 'recrutement');

  const jetonB = t.dernier('b', 'salon')?.jeton as string;
  t.lobby.disconnect('b');
  assert.equal(t.salon('a').joueurs[1].connecte, false);
  // Le minuteur et la reprise par un bot font avancer la partie sans lui.
  t.horloge.avancer(120_000);
  assert.ok(t.vue('a').round >= 1);

  t.boites.delete('b2');
  t.dire('b2', { type: 'reprendre', jeton: jetonB });
  assert.equal(t.salon('b2').siege, 1);
  assert.equal(t.vue('b2').seat, 1);
  assert.equal(t.salon('a').joueurs[1].connecte, true);
  t.lobby.destroy();
});

test('chacun ne reçoit que sa vue, sans réserve ni graine', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('a', { type: 'lancer' });
  for (const c of ['a', 'b']) t.dire(c, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  assert.equal(t.vue('a').seat, 0);
  assert.equal(t.vue('b').seat, 1);
  for (const c of ['a', 'b']) {
    const texte = JSON.stringify(t.boites.get(c));
    assert.ok(!texte.includes('"pool"'));
    assert.ok(!texte.includes('"seed"'));
    assert.ok(!texte.includes('"rng"'));
  }
  t.lobby.destroy();
});

test('un joueur ne peut pas jouer pour un autre, ni avant le lancement', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('b', { type: 'action', seq: 9, action: { t: 'roll' } });
  assert.equal(t.dernier('b', 'refus')?.seq, 9);
  t.dire('inconnu', { type: 'action', seq: 1, action: { t: 'roll' } });
  assert.match(t.dernier('inconnu', 'erreur')?.erreur ?? '', /aucun salon/);
});

test('un humain seul joue sans minuteur, jusqu\'au classement, puis peut rejouer', () => {
  const t = creerTable();
  creerSalon(t);
  t.dire('a', { type: 'lancer' });
  t.dire('a', { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  assert.equal(t.dernier('a', 'vue')?.reste_ms, null);
  for (let n = 0; n < 200 && !t.dernier('a', 'fin'); n++) {
    if (t.vue('a').phase === 'recrutement' && t.vue('a').alive) t.dire('a', { type: 'pret' });
    if (t.vue('a').phase === 'combat' || t.dernier('a', 'combat')) t.dire('a', { type: 'vu' });
    t.horloge.avancer(1000);
  }
  const fin = t.dernier('a', 'fin');
  assert.ok(fin);
  assert.equal(fin.classement.length, SIEGES);
  assert.equal(t.salon('a').etat, 'fini');
  t.boites.delete('a');
  t.dire('a', { type: 'lancer' });
  assert.equal(t.salon('a').etat, 'en_jeu');
  assert.ok(!t.dernier('a', 'fin'));
  t.lobby.destroy();
});

test('après la partie, un hôte absent passe la main et un retour redonne le classement', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('a', { type: 'lancer' });
  for (const c of ['a', 'b']) t.dire(c, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  for (let n = 0; n < 400 && !t.dernier('a', 'fin'); n++) {
    for (const c of ['a', 'b']) {
      t.dire(c, { type: 'pret' });
      t.dire(c, { type: 'vu' });
    }
  }
  assert.ok(t.dernier('a', 'fin'));
  const jetonB = t.dernier('b', 'salon')?.jeton as string;
  t.lobby.disconnect('b');
  t.dire('b2', { type: 'reprendre', jeton: jetonB });
  assert.ok(t.dernier('b2', 'fin'));
  t.lobby.disconnect('a');
  t.horloge.avancer(31_000);
  assert.equal(t.salon('b2').hote, 0);
  assert.equal(t.salon('b2').siege, 0);
  t.dire('b2', { type: 'lancer' });
  assert.equal(t.salon('b2').etat, 'en_jeu');
  t.lobby.destroy();
});

test('un salon abandonné finit par disparaître et ses minuteurs avec lui', () => {
  const t = creerTable();
  creerSalon(t);
  t.dire('a', { type: 'lancer' });
  t.lobby.disconnect('a');
  assert.equal(t.lobby.nombreDeSalons, 1);
  t.horloge.avancer(6 * 60_000);
  assert.equal(t.lobby.nombreDeSalons, 0);
});

test('le protocole accepte regler_salon et quitter, et rejette le reste', () => {
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'quitter', pirate: 1 })), { type: 'quitter' });
  const m = parseClientMessage(JSON.stringify({ type: 'regler_salon', options: OPTIONS }));
  assert.deepEqual(m, { type: 'regler_salon', options: OPTIONS });
  assert.equal(parseClientMessage(JSON.stringify({ type: 'regler_salon', options: { bots: -1 } })), null);
});

test('le chat : tout le salon lit, avant et pendant la partie, et qui revient retrouve les dernières lignes', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('a', { type: 'chat', texte: '  Bonjour   la\ntable  ' });
  const lu = t.dernier('b', 'chat');
  assert.deepEqual(lu?.messages, [{ id: 1, pseudo: 'Anne', siege: 0, texte: 'Bonjour la table' }]);
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'Bonjour la table', 'on se lit soi-même');

  // Qui arrive après reçoit l'historique.
  t.dire('c', { type: 'rejoindre', code, pseudo: 'Cléo' });
  const historique = t.dernier('c', 'chat');
  assert.equal(historique?.historique, true);
  assert.deepEqual(historique?.messages.map((m) => m.texte), ['Bonjour la table']);

  // En partie : le siège de jeu, et le chat ne passe pas par la partie.
  t.dire('a', { type: 'lancer' });
  t.dire('c', { type: 'chat', texte: 'gl hf' });
  assert.deepEqual(t.dernier('a', 'chat')?.messages[0], { id: 2, pseudo: 'Cléo', siege: 2, texte: 'gl hf' });

  // Un retour avec le jeton redonne tout.
  const jetonB = t.dernier('b', 'salon')?.jeton as string;
  t.lobby.disconnect('b');
  t.dire('b2', { type: 'reprendre', jeton: jetonB });
  assert.deepEqual(t.dernier('b2', 'chat')?.messages.map((m) => m.id), [1, 2]);
  t.lobby.destroy();
});

test('le chat : du texte seulement, pas plus de 5 lignes en 10 secondes, et rien hors d\'un salon', () => {
  const t = creerTable();
  creerSalon(t);
  t.dire('a', { type: 'chat', texte: '\u0000​   ' });
  assert.equal(t.dernier('a', 'chat')?.messages.length ?? 0, 0, 'une ligne vide après nettoyage ne part pas');
  for (let i = 0; i < 8; i++) t.dire('a', { type: 'chat', texte: `ligne ${i}` });
  const recues = (t.boites.get('a') ?? []).filter((m) => m.type === 'chat' && !m.historique);
  assert.equal(recues.length, 5);
  t.horloge.avancer(10_000);
  t.dire('a', { type: 'chat', texte: 'encore' });
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'encore');
  t.dire('z', { type: 'chat', texte: 'personne ?' });
  assert.equal(t.dernier('z', 'erreur')?.erreur, 'Vous n\'êtes dans aucun salon.');
  assert.equal(parseClientMessage(JSON.stringify({ type: 'chat', texte: 'x'.repeat(201) })), null);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'chat', texte: '' })), null);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'chat', texte: 3 })), null);
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'chat', texte: 'gg', extra: 1 })), { type: 'chat', texte: 'gg' });
  t.lobby.destroy();
});
