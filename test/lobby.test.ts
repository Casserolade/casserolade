import test from 'node:test';
import assert from 'node:assert/strict';
import { Lobby, SIEGES } from '../src/lobby/lobby.ts';
import type { EvenementSalon } from '../src/lobby/lobby.ts';
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

test('un mauvais code ou un salon plein sont refusés, avant comme pendant la partie', () => {
  const t = creerTable();
  t.dire('x', { type: 'rejoindre', code: 'AAAAAA', pseudo: 'Xav' });
  assert.match(t.dernier('x', 'erreur')?.erreur ?? '', /existe pas/);
  const code = creerSalon(t);
  for (let i = 1; i < SIEGES; i++) t.dire(`j${i}`, { type: 'rejoindre', code, pseudo: `J${i}` });
  t.dire('tard', { type: 'rejoindre', code, pseudo: 'Tard' });
  assert.match(t.dernier('tard', 'erreur')?.erreur ?? '', /complet/);
  t.dire('a', { type: 'lancer' });
  t.dire('tard2', { type: 'rejoindre', code, pseudo: 'Tard' });
  assert.match(t.dernier('tard2', 'erreur')?.erreur ?? '', /complet/);
  t.lobby.destroy();
});

// Entrer pendant la partie (17 novembre 2026) : le salon reste un lieu où l'on se retrouve. Sans siège dans la partie
// en cours, on discute avec ceux qui jouent, et l'on joue la suivante.

test('on entre dans un salon pendant sa partie : sans siège, on discute avec la table et on joue la suivante', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, table: 2, minuteur: false } });
  t.dire('a', { type: 'lancer' });
  t.dire('z', { type: 'rejoindre', code, pseudo: 'Zoé' });
  const vueZ = t.salon('z');
  assert.equal(vueZ.etat, 'en_jeu');
  assert.equal(vueZ.siege, -1, 'aucun siège dans la partie en cours');
  assert.equal(vueZ.moi, 'Zoé');
  assert.deepEqual(vueZ.enAttente, ['Zoé']);
  assert.deepEqual(vueZ.joueurs.map((j) => j.pseudo), ['Anne', 'Bot 1'], 'la table qui joue ne change pas');
  assert.equal(t.dernier('z', 'vue'), undefined, 'rien de la partie ne lui parvient');
  assert.deepEqual(t.salon('a').enAttente, ['Zoé'], 'ceux qui jouent savent qui attend');
  assert.equal(t.salon('a').hote, 0);

  // Le salon annonce l'entrée ; les deux se parlent, l'une à table, l'autre non.
  assert.deepEqual(t.dernier('a', 'chat')?.messages[0], { id: 1, pseudo: '', siege: -1, texte: 'Zoé entre dans le salon.', annonce: true });
  t.dire('z', { type: 'chat', texte: 'Je prends la suivante !' });
  assert.deepEqual(t.dernier('a', 'chat')?.messages[0], { id: 2, pseudo: 'Zoé', siege: -1, texte: 'Je prends la suivante !' });
  t.dire('a', { type: 'chat', texte: 'Ça marche' });
  assert.equal(t.dernier('z', 'chat')?.messages[0].siege, 0);

  // Elle ne joue pas pour un autre, et ne lance rien.
  t.dire('z', { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  assert.equal(t.dernier('z', 'refus')?.erreur, 'Aucune partie en cours.');
  t.dire('z', { type: 'lancer' });
  assert.equal(t.dernier('z', 'erreur')?.erreur, 'Seul l\'hôte lance la partie.');
  assert.equal(t.lobby.partiesEnLigne, 1, 'attendre n\'est pas jouer');
  assert.equal(t.lobby.joueursEnJeu, 1);

  // La partie finie, tout le monde est à la table de la suivante.
  t.dire('a', { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  for (let n = 0; n < 400 && !t.dernier('a', 'fin'); n++) {
    if (t.vue('a').phase === 'recrutement' && t.vue('a').alive) t.dire('a', { type: 'pret' });
    if (t.vue('a').phase === 'combat' || t.dernier('a', 'combat')) t.dire('a', { type: 'vu' });
    t.horloge.avancer(1000);
  }
  assert.equal(t.salon('z').etat, 'fini');
  assert.equal(t.salon('z').enAttente, undefined);
  assert.deepEqual(t.salon('z').joueurs.map((j) => j.pseudo), ['Anne', 'Zoé']);
  t.dire('a', { type: 'lancer' });
  assert.equal(t.salon('z').siege, 1);
  assert.ok(t.dernier('z', 'vue'), 'elle joue la partie suivante');
  t.lobby.destroy();
});

test('entré pendant la partie puis déconnecté, on ne garde sa place que 30 secondes ; resté seul, on devient l\'hôte', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('a', { type: 'lancer' });
  t.dire('z', { type: 'rejoindre', code, pseudo: 'Zoé' });
  t.dire('y', { type: 'rejoindre', code, pseudo: 'Yann' });
  assert.deepEqual(t.salon('a').enAttente, ['Zoé', 'Yann']);
  t.lobby.disconnect('y');
  t.horloge.avancer(30_000);
  assert.deepEqual(t.salon('a').enAttente, ['Zoé']);
  assert.equal(t.dernier('z', 'chat')?.messages[0].texte, 'Yann quitte le salon.');
  // L'hôte quitte la partie : plus aucun humain n'y joue, elle s'arrête là, et le salon est à celle qui attendait.
  t.dire('a', { type: 'quitter' });
  assert.equal(t.lobby.nombreDeSalons, 1);
  assert.equal(t.salon('z').etat, 'fini');
  assert.deepEqual([t.salon('z').siege, t.salon('z').hote], [0, 0]);
  assert.equal(t.dernier('z', 'fin'), undefined, 'pas de classement : elle n\'a pas joué');
  t.dire('z', { type: 'lancer' });
  assert.equal(t.salon('z').etat, 'en_jeu');
  assert.ok(t.dernier('z', 'vue'));
  t.lobby.destroy();
});

test('le seul humain à table ne revient pas : dès qu\'un bot tient son siège, le salon est à ceux qui attendent', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('a', { type: 'lancer' });
  t.dire('z', { type: 'rejoindre', code, pseudo: 'Zoé' });
  const jetonA = t.dernier('a', 'salon')?.jeton as string;
  t.lobby.disconnect('a');
  t.horloge.avancer(20_000);
  assert.equal(t.salon('z').etat, 'en_jeu', 'Bob joue encore : la partie continue');
  t.lobby.disconnect('b');
  t.horloge.avancer(5_000);
  assert.equal(t.salon('z').etat, 'en_jeu', 'le temps de recharger la page, son siège l\'attend');
  t.horloge.avancer(15_000);
  assert.equal(t.salon('z').etat, 'fini');
  assert.deepEqual(t.salon('z').joueurs.filter((j) => !j.bot).map((j) => j.pseudo), ['Zoé']);
  t.dire('a2', { type: 'reprendre', jeton: jetonA });
  assert.match(t.dernier('a2', 'erreur')?.erreur ?? '', /existe plus/, 'revenu trop tard, il repart de l\'accueil');
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
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, contexte: 'hasard' } });
  assert.equal(t.salon('b').options.contexte, 'hasard', 'un contexte tiré au lancement');
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, contexte: 'mercato' } });
  assert.equal(t.salon('b').options.contexte, 'mercato');
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
  assert.deepEqual(lu?.messages, [{ id: 2, pseudo: 'Anne', siege: 0, texte: 'Bonjour la table' }]);
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'Bonjour la table', 'on se lit soi-même');

  // Qui arrive après reçoit l'historique : l'entrée de Bob, annoncée par le salon, puis la ligne d'Anne.
  t.dire('c', { type: 'rejoindre', code, pseudo: 'Cléo' });
  const historique = (t.boites.get('c') ?? []).find((m) => m.type === 'chat' && m.historique);
  assert.deepEqual(historique?.type === 'chat' && historique.messages.map((m) => m.texte), ['Bob entre dans le salon.', 'Bonjour la table']);
  assert.equal(t.dernier('c', 'chat')?.messages[0].texte, 'Cléo entre dans le salon.');

  // En partie : le siège de jeu, et le chat ne passe pas par la partie.
  t.dire('a', { type: 'lancer' });
  t.dire('c', { type: 'chat', texte: 'gl hf' });
  assert.deepEqual(t.dernier('a', 'chat')?.messages[0], { id: 4, pseudo: 'Cléo', siege: 2, texte: 'gl hf' });

  // Un retour avec le jeton redonne tout.
  const jetonB = t.dernier('b', 'salon')?.jeton as string;
  t.lobby.disconnect('b');
  t.dire('b2', { type: 'reprendre', jeton: jetonB });
  assert.deepEqual(t.dernier('b2', 'chat')?.messages.map((m) => m.id), [1, 2, 3, 4]);
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

// Une table de 2 à 8 (7 novembre 2026), comme un salon privé de Battlegrounds : deux amis, avec ou sans bots.

test('la table se règle de 2 à 8 : les bots ne prennent que les places vides, et la table grandit avec les humains', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, table: 2 } });
  assert.equal(t.salon('a').options.table, 2);
  assert.deepEqual(t.salon('a').joueurs.map((j) => j.bot), [false, true], 'seul, un bot en face');
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  assert.deepEqual(t.salon('a').joueurs.map((j) => j.bot), [false, false], 'à deux, sans bot');
  t.dire('c', { type: 'rejoindre', code, pseudo: 'Cléo' });
  assert.equal(t.salon('a').joueurs.length, 3, 'un troisième humain agrandit la table');
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, table: 5 } });
  assert.equal(t.salon('a').joueurs.filter((j) => j.bot).length, 2);
  t.lobby.destroy();
});

test('une table de deux humains se joue jusqu\'au classement, sur les plateaux de la campagne', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, table: 2, minuteur: false } });
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('a', { type: 'lancer' });
  assert.equal(t.salon('a').etat, 'en_jeu');
  for (const c of ['a', 'b']) t.dire(c, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  for (let n = 0; n < 400 && !t.dernier('a', 'fin'); n++) {
    for (const c of ['a', 'b']) {
      if (t.vue(c).phase === 'recrutement' && t.vue(c).alive) t.dire(c, { type: 'pret' });
      if (t.vue(c).phase === 'combat' || t.dernier(c, 'combat')) t.dire(c, { type: 'vu' });
    }
    t.horloge.avancer(1000);
  }
  const fin = t.dernier('a', 'fin');
  assert.ok(fin, 'la partie va au bout');
  assert.equal(fin.classement.length, 2);
  t.lobby.destroy();
});

test('le protocole refuse une table de moins de 2 ou de plus de 8', () => {
  for (const table of [0, 1, 9, 2.5]) {
    assert.equal(parseClientMessage(JSON.stringify({ type: 'regler_salon', options: { ...OPTIONS, table } })), null, `table ${table}`);
  }
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'regler_salon', options: { ...OPTIONS, table: 2 } })), { type: 'regler_salon', options: { ...OPTIONS, table: 2 } });
});

test('pour l\'accueil, une partie en ligne par joueur : connecté, et encore en lice une fois la partie lancée', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('c', { type: 'rejoindre', code, pseudo: 'Cléo' });
  assert.equal(t.lobby.partiesEnLigne, 3, 'trois humains qui attendent, les bots ne comptent pas');
  t.dire('a', { type: 'lancer' });
  assert.equal(t.lobby.partiesEnLigne, 3);
  t.lobby.disconnect('c');
  assert.equal(t.lobby.partiesEnLigne, 2, 'un joueur parti ne joue plus');
  const room = t.lobby.partiesEnCours[0].room;
  room.game.players[t.vue('b').seat].alive = false;
  assert.equal(t.lobby.partiesEnLigne, 1, 'un éliminé a fini sa partie');
  creerSalon(t, 'd', 'Dédé');
  assert.equal(t.lobby.partiesEnLigne, 2);
  t.lobby.destroy();
});

// Les salons publics (17 novembre 2026) : un salon nommé que l'accueil affiche à tout le monde, où l'on entre d'un
// clic, où l'on discute en attendant, et que son hôte lance quand il veut, les bots aux places vides.

test('un salon public s\'affiche sous son nom, avec son hôte et ses joueurs ; un salon privé ne s\'affiche jamais', () => {
  const t = creerTable();
  creerSalon(t, 'p', 'Paul');
  assert.equal(t.lobby.salonsPublics.length, 0, 'un salon privé ne se montre pas');
  t.dire('a', { type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, nomPublic: 'Soirée casseroles' } });
  const code = t.salon('a').code;
  assert.equal(t.salon('a').options.nomPublic, 'Soirée casseroles', 'ceux du salon lisent son nom');
  assert.deepEqual(t.lobby.salonsPublics, [{ code, nom: 'Soirée casseroles', hote: 'Anne', joueurs: 1, places: SIEGES, manche: null, nouveau: true }]);
  t.horloge.avancer(2 * 60_000);
  assert.deepEqual(t.lobby.salonsPublics, [{ code, nom: 'Soirée casseroles', hote: 'Anne', joueurs: 1, places: SIEGES, manche: null }], 'deux minutes plus tard, il n\'est plus nouveau');
  // On y entre avec le code que la liste donne, et le chat est là tout de suite.
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  assert.equal(t.lobby.salonsPublics[0].joueurs, 2);
  t.dire('b', { type: 'chat', texte: 'Bonsoir !' });
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'Bonsoir !');
  t.lobby.destroy();
});

test('le nom d\'un salon public est du texte nettoyé, 32 caractères au plus ; sans nom, le salon est privé', () => {
  const t = creerTable();
  t.dire('a', { type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, nomPublic: '  <b>Table</b>\u0000\n des   amis  ' } });
  assert.equal(t.salon('a').options.nomPublic, '<b>Table</b> des amis', 'du texte, jamais interprété');
  t.dire('b', { type: 'creer_salon', pseudo: 'Bob', options: { ...OPTIONS, nomPublic: 'x'.repeat(60) } });
  assert.equal(t.salon('b').options.nomPublic?.length, 32);
  t.dire('c', { type: 'creer_salon', pseudo: 'Cléo', options: { ...OPTIONS, nomPublic: ' ​ ' } });
  assert.equal(t.salon('c').options.nomPublic, undefined, 'un nom vide une fois nettoyé : salon privé');
  assert.equal(t.lobby.salonsPublics.length, 2);
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, nomPublic: 'Chez Anne' } })), { type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, nomPublic: 'Chez Anne' } });
  for (const nomPublic of ['', 'x'.repeat(65), 3, null]) {
    assert.equal(parseClientMessage(JSON.stringify({ type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, nomPublic } })), null, `nom ${String(nomPublic).slice(0, 8)}`);
  }
  t.lobby.destroy();
});

test('entre inconnus, le minuteur est toujours là ; l\'hôte, et lui seul, ouvre ou referme son salon qui attend', () => {
  const t = creerTable();
  t.dire('a', { type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, minuteur: false, nomPublic: 'Chez Anne' } });
  const code = t.salon('a').code;
  assert.equal(t.salon('a').options.minuteur, true, 'un salon public ne se joue pas sans minuteur');
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('b', { type: 'regler_salon', options: { ...OPTIONS } });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'Seul l\'hôte règle le salon.');
  assert.equal(t.lobby.salonsPublics.length, 1);
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, minuteur: false } });
  assert.equal(t.lobby.salonsPublics.length, 0, 'refermé : il ne s\'affiche plus, ses joueurs restent');
  assert.equal(t.salon('b').options.nomPublic, undefined);
  assert.equal(t.salon('b').options.minuteur, false, 'entre amis, le minuteur redevient un choix');
  assert.equal(t.salon('a').joueurs.filter((j) => !j.bot).length, 2);
  t.dire('a', { type: 'regler_salon', options: { ...OPTIONS, nomPublic: 'Chez Anne, le retour' } });
  assert.equal(t.lobby.salonsPublics[0].nom, 'Chez Anne, le retour');
  t.lobby.destroy();
});

test('les salons qui attendent passent devant, les plus remplis en tête ; celui qui joue montre sa manche, puis attend de nouveau', () => {
  const t = creerTable();
  const ouvrir = (c: string, nom: string): string => {
    t.dire(c, { type: 'creer_salon', pseudo: c.toUpperCase(), options: { ...OPTIONS, nomPublic: nom } });
    return t.salon(c).code;
  };
  const premier = ouvrir('a', 'Premier');
  const rempli = ouvrir('b', 'Rempli');
  ouvrir('c', 'Dernier');
  t.dire('d', { type: 'rejoindre', code: rempli, pseudo: 'Dédé' });
  assert.deepEqual(t.lobby.salonsPublics.map((s) => s.nom), ['Rempli', 'Premier', 'Dernier']);

  // L'hôte lance quand il veut : les bots prennent les places vides.
  t.dire('a', { type: 'lancer' });
  assert.equal(t.salon('a').etat, 'en_jeu');
  assert.equal(t.salon('a').joueurs.filter((j) => j.bot).length, SIEGES - 1);
  assert.deepEqual(t.lobby.salonsPublics.map((s) => [s.nom, s.manche]), [['Rempli', null], ['Dernier', null], ['Premier', 0]]);

  // La partie finie, le salon attend de nouveau : il remonte dans la liste.
  t.dire('a', { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  for (let n = 0; n < 400 && !t.dernier('a', 'fin'); n++) {
    if (t.vue('a').phase === 'recrutement' && t.vue('a').alive) t.dire('a', { type: 'pret' });
    if (t.vue('a').phase === 'combat' || t.dernier('a', 'combat')) t.dire('a', { type: 'vu' });
    t.horloge.avancer(1000);
  }
  assert.ok(t.dernier('a', 'fin'), 'la partie va au bout');
  assert.equal(t.lobby.salonsPublics.find((s) => s.nom === 'Premier')?.manche, null);
  t.dire('e', { type: 'rejoindre', code: premier, pseudo: 'Eve' });
  assert.equal(t.salon('e').etat, 'fini');
  assert.equal(t.lobby.salonsPublics.find((s) => s.nom === 'Premier')?.joueurs, 2);
  t.lobby.destroy();
});

test('un salon public dont plus personne n\'est connecté ne s\'affiche pas, et disparaît avec son dernier joueur', () => {
  const t = creerTable();
  t.dire('a', { type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, nomPublic: 'Chez Anne' } });
  const jeton = t.dernier('a', 'salon')?.jeton as string;
  t.lobby.disconnect('a');
  assert.equal(t.lobby.salonsPublics.length, 0, 'personne n\'y répondrait');
  t.dire('a2', { type: 'reprendre', jeton });
  assert.equal(t.lobby.salonsPublics.length, 1, 'revenue à temps, elle le retrouve affiché');
  t.dire('a2', { type: 'quitter' });
  assert.equal(t.lobby.salonsPublics.length, 0);
  assert.equal(t.lobby.nombreDeSalons, 0);
  t.lobby.destroy();
});

test('les mesures disent publique la partie d\'un salon public, et le tableau de bord lit son nom', () => {
  const evenements: EvenementSalon[] = [];
  const horloge = creerHorloge();
  const lobby = new Lobby({ clock: horloge, graine: () => 42, send: () => {}, evenement: (e) => evenements.push(e) });
  lobby.handleMessage('a', { type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, nomPublic: 'Chez Anne' } });
  lobby.handleMessage('b', { type: 'creer_salon', pseudo: 'Bob', options: OPTIONS });
  lobby.handleMessage('b', { type: 'regler_salon', options: { ...OPTIONS, nomPublic: 'Chez Bob' } });
  lobby.handleMessage('b', { type: 'regler_salon', options: { ...OPTIONS, nomPublic: 'Chez Bob', table: 4 } });
  lobby.handleMessage('a', { type: 'lancer' });
  assert.deepEqual(evenements, [
    { type: 'salon_cree', nomPublic: 'Chez Anne' },
    { type: 'salon_cree', nomPublic: null },
    { type: 'salon_public', nom: 'Chez Bob' },
    { type: 'partie', publique: true, humains: 1 },
  ]);
  lobby.destroy();
});

// L'hôte modère son salon (17 novembre 2026) : il coupe le chat d'un joueur, ou l'exclut, quand il veut, avant comme
// pendant la partie.

test('l\'hôte coupe le chat d\'un joueur, puis le lui rend : ses lignes ne partent plus, et tout le salon le sait', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('c', { type: 'rejoindre', code, pseudo: 'Cléo' });
  assert.equal(t.salon('a').estHote, true);
  assert.equal(t.salon('b').estHote, false);

  t.dire('a', { type: 'muet', pseudo: 'Bob', oui: true });
  assert.deepEqual(t.salon('c').muets, ['Bob']);
  assert.equal(t.dernier('c', 'chat')?.messages[0].texte, 'L\'hôte a coupé le chat de Bob.');
  t.dire('b', { type: 'chat', texte: 'vous m\'entendez ?' });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'L\'hôte a coupé votre chat.');
  assert.equal(t.dernier('c', 'chat')?.messages[0].texte, 'L\'hôte a coupé le chat de Bob.', 'sa ligne n\'est pas partie');
  t.dire('c', { type: 'chat', texte: 'moi oui' });
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'moi oui', 'les autres parlent toujours');

  // Le chat coupé le reste en partie, jusqu'à ce que l'hôte le rende.
  t.dire('a', { type: 'lancer' });
  assert.deepEqual(t.salon('a').muets, ['Bob']);
  t.dire('a', { type: 'muet', pseudo: 'Bob', oui: false });
  assert.equal(t.salon('a').muets, undefined);
  t.dire('b', { type: 'chat', texte: 'merci' });
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'merci');
  t.lobby.destroy();
});

test('seul l\'hôte modère, jamais sur lui-même ni sur un inconnu', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('b', { type: 'muet', pseudo: 'Anne', oui: true });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'Seul l\'hôte modère le salon.');
  t.dire('b', { type: 'exclure', pseudo: 'Anne' });
  assert.equal(t.salon('a').joueurs.filter((j) => !j.bot).length, 2, 'l\'hôte est toujours là');
  for (const pseudo of ['Anne', 'Personne', 'Bot 1']) {
    t.dire('a', { type: 'exclure', pseudo });
    assert.equal(t.dernier('a', 'erreur')?.erreur, 'Ce joueur n\'est pas dans le salon.', pseudo);
  }
  assert.equal(t.salon('a').muets, undefined);
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'muet', pseudo: 'Bob', oui: true, extra: 1 })), { type: 'muet', pseudo: 'Bob', oui: true });
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'exclure', pseudo: 'Bob' })), { type: 'exclure', pseudo: 'Bob' });
  for (const message of [{ type: 'muet', pseudo: 'Bob' }, { type: 'muet', pseudo: '', oui: true }, { type: 'exclure' }, { type: 'exclure', pseudo: 3 }]) {
    assert.equal(parseClientMessage(JSON.stringify(message)), null, JSON.stringify(message));
  }
  t.lobby.destroy();
});

test('exclu par l\'hôte, on repart à l\'accueil, le salon l\'annonce, et l\'on n\'y revient pas', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('c', { type: 'rejoindre', code, pseudo: 'Cléo' });
  t.dire('a', { type: 'exclure', pseudo: 'Bob' });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'L\'hôte vous a exclu de ce salon.');
  assert.deepEqual(t.salon('a').joueurs.filter((j) => !j.bot).map((j) => j.pseudo), ['Anne', 'Cléo']);
  assert.equal(t.dernier('c', 'chat')?.messages[0].texte, 'L\'hôte a exclu Bob.');
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob le retour' });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'L\'hôte vous a exclu de ce salon.');
  assert.equal(t.salon('a').joueurs.filter((j) => !j.bot).length, 2);
  t.dire('b', { type: 'chat', texte: 'encore moi' });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'Vous n\'êtes dans aucun salon.');
  // Un autre salon lui reste ouvert.
  t.dire('d', { type: 'creer_salon', pseudo: 'Dédé', options: OPTIONS });
  t.dire('b', { type: 'rejoindre', code: t.salon('d').code, pseudo: 'Bob' });
  assert.equal(t.salon('b').code, t.salon('d').code);
  t.lobby.destroy();
});

test('l\'exclusion suit l\'origine de la connexion : un nouvel onglet ne suffit pas à revenir', () => {
  const horloge = creerHorloge();
  const boites = new Map<string, ServerMessage[]>();
  const lobby = new Lobby({
    clock: horloge,
    graine: () => 42,
    // Deux onglets du même visiteur partagent leur origine : « b » et « b2 ».
    origine: (connexion) => connexion.replace(/\d+$/, ''),
    send: (c, m) => void boites.set(c, [...(boites.get(c) ?? []), m]),
  });
  const dernier = <T extends ServerMessage['type']>(c: string, type: T) => [...(boites.get(c) ?? [])].reverse().find((m) => m.type === type) as Extract<ServerMessage, { type: T }> | undefined;
  lobby.handleMessage('a', { type: 'creer_salon', pseudo: 'Anne', options: { ...OPTIONS, nomPublic: 'Chez Anne' } });
  const code = dernier('a', 'salon')?.salon.code as string;
  lobby.handleMessage('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  lobby.handleMessage('a', { type: 'exclure', pseudo: 'Bob' });
  lobby.handleMessage('b2', { type: 'rejoindre', code, pseudo: 'Robert' });
  assert.equal(dernier('b2', 'erreur')?.erreur, 'L\'hôte vous a exclu de ce salon.');
  lobby.handleMessage('c', { type: 'rejoindre', code, pseudo: 'Cléo' });
  assert.equal(dernier('c', 'salon')?.salon.joueurs.filter((j) => !j.bot).length, 2, 'une autre origine entre');
  lobby.destroy();
});

test('exclu pendant la partie : un bot tient le siège jusqu\'à la fin, et celui qui attendait sort aussi', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('a', { type: 'lancer' });
  t.dire('z', { type: 'rejoindre', code, pseudo: 'Zoé' });
  const siegeBob = t.salon('b').siege;
  t.dire('a', { type: 'exclure', pseudo: 'Bob' });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'L\'hôte vous a exclu de ce salon.');
  assert.equal(t.salon('a').etat, 'en_jeu', 'la partie continue');
  assert.equal(t.salon('a').joueurs[siegeBob].bot, true, 'pour la table, c\'est désormais un bot');
  t.dire('b', { type: 'action', seq: 9, action: { t: 'hero', i: 0 } });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'Vous n\'êtes dans aucun salon.');
  t.dire('a', { type: 'exclure', pseudo: 'Zoé' });
  assert.equal(t.dernier('z', 'erreur')?.erreur, 'L\'hôte vous a exclu de ce salon.');
  assert.equal(t.salon('a').enAttente, undefined);
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'L\'hôte a exclu Zoé.');
  t.lobby.destroy();
});

// Choisir son pseudo depuis le salon (18 novembre 2026) : qui est entré sans pseudo en choisit un sur place.

test('entré sans pseudo, on en choisit un depuis le salon : la table et le chat le montrent', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Sans étiquette' });
  t.dire('c', { type: 'rejoindre', code, pseudo: 'Sans étiquette' });
  assert.deepEqual(t.salon('a').joueurs.slice(0, 3).map((j) => j.pseudo), ['Anne', 'Sans étiquette', 'Sans étiquette 2']);
  t.dire('c', { type: 'renommer', pseudo: '  Cléo\n ' });
  assert.equal(t.salon('c').moi, 'Cléo');
  assert.deepEqual(t.salon('a').joueurs.slice(0, 3).map((j) => j.pseudo), ['Anne', 'Sans étiquette', 'Cléo']);
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'Sans étiquette 2 s\'appelle maintenant Cléo.');
  t.dire('c', { type: 'chat', texte: 'c\'est moi' });
  assert.equal(t.dernier('a', 'chat')?.messages[0].pseudo, 'Cléo');
  // Un pseudo déjà pris dans le salon se numérote ; le même qu'avant ne change rien.
  t.dire('b', { type: 'renommer', pseudo: 'Anne' });
  assert.equal(t.salon('b').moi, 'Anne 2');
  const lignes = (t.boites.get('a') ?? []).length;
  t.dire('b', { type: 'renommer', pseudo: 'Anne 2' });
  assert.equal((t.boites.get('a') ?? []).length, lignes, 'rien ne part pour un pseudo inchangé');
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'renommer', pseudo: 'Cléo', extra: 1 })), { type: 'renommer', pseudo: 'Cléo' });
  assert.equal(parseClientMessage(JSON.stringify({ type: 'renommer', pseudo: '' })), null);
  t.lobby.destroy();
});

test('à table en pleine partie, on garde son nom ; entré pendant la partie, on peut encore en choisir un', () => {
  const t = creerTable();
  const code = creerSalon(t);
  t.dire('b', { type: 'rejoindre', code, pseudo: 'Bob' });
  t.dire('a', { type: 'lancer' });
  t.dire('b', { type: 'renommer', pseudo: 'Robert' });
  assert.equal(t.dernier('b', 'erreur')?.erreur, 'On ne change pas de pseudo en pleine partie.');
  assert.equal(t.salon('b').moi, 'Bob');
  t.dire('z', { type: 'rejoindre', code, pseudo: 'Sans étiquette' });
  t.dire('z', { type: 'renommer', pseudo: 'Zoé' });
  assert.deepEqual(t.salon('a').enAttente, ['Zoé']);
  // Un joueur au chat coupé se renomme sans que le salon l'annonce, et pas plus souvent qu'il n'écrit.
  t.dire('a', { type: 'muet', pseudo: 'Zoé', oui: true });
  t.dire('z', { type: 'renommer', pseudo: 'Insulte' });
  assert.equal(t.salon('z').moi, 'Insulte');
  assert.equal(t.dernier('a', 'chat')?.messages[0].texte, 'L\'hôte a coupé le chat de Zoé.', 'pas d\'annonce pour un joueur au chat coupé');
  for (let i = 0; i < 8; i++) t.dire('z', { type: 'renommer', pseudo: `Nom ${i}` });
  assert.equal(t.salon('z').moi, 'Nom 2', 'cinq changements en dix secondes, pas plus : les deux d\'avant comptent');
  t.lobby.destroy();
});
