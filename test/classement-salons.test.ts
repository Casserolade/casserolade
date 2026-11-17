import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Lobby, mmrEnMemoire } from '../src/lobby/lobby.ts';
import { MMR_DEPART, variationsMmr } from '../src/lobby/mmr.ts';
import type { ClientMessage, OptionsSalon, ServerMessage, VueSalon } from '../src/protocol/messages.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import { empreinte, openMmrFile } from '../src/server/mmrFile.ts';

// Le classement des salons (18 novembre 2026) : une partie de salon jouée contre un autre humain compte pour le MMR,
// à la manière d'un Elo, et les bots ne comptent jamais.

const OPTIONS: OptionsSalon = { bots: 0, niveauBots: 'facile', minuteur: false };
const CLE = { a: 'joueur-a-0000000000', b: 'joueur-b-0000000000', c: 'joueur-c-0000000000' };

function creerLobby() {
  // Une horloge manuelle : le temps n'avance que quand le test le demande.
  let t = 0;
  let id = 0;
  const attente = new Map<number, { at: number; cb: () => void }>();
  const avancer = (ms: number): void => {
    const fin = t + ms;
    for (;;) {
      const prochain = [...attente.entries()].filter(([, x]) => x.at <= fin).sort((a, b) => a[1].at - b[1].at)[0];
      if (!prochain) break;
      attente.delete(prochain[0]);
      t = prochain[1].at;
      prochain[1].cb();
    }
    t = fin;
  };
  const mmr = mmrEnMemoire();
  const boites = new Map<string, ServerMessage[]>();
  const lobby = new Lobby({
    clock: {
      now: () => t,
      setTimeout: (cb: () => void, ms: number) => {
        attente.set(++id, { at: t + ms, cb });
        return id;
      },
      clearTimeout: (h: unknown) => void attente.delete(h as number),
    },
    graine: () => 11,
    mmr,
    send(c, m) {
      if (!boites.has(c)) boites.set(c, []);
      (boites.get(c) as ServerMessage[]).push(JSON.parse(JSON.stringify(m)));
    },
  });
  const dire = (c: string, m: ClientMessage) => lobby.handleMessage(c, m);
  const dernier = <T extends ServerMessage['type']>(c: string, type: T) =>
    [...(boites.get(c) ?? [])].reverse().find((m) => m.type === type) as Extract<ServerMessage, { type: T }> | undefined;
  const salon = (c: string): VueSalon => (dernier(c, 'salon') as Extract<ServerMessage, { type: 'salon' }>).salon;
  /** Un salon où entrent ces joueurs, le premier en hôte ; `cles` : la clé de chacun, absente pour un joueur sans clé. */
  const ouvrir = (joueurs: string[], cles: Record<string, string | undefined>, options = OPTIONS): void => {
    const [hote, ...autres] = joueurs;
    dire(hote, { type: 'creer_salon', pseudo: hote.toUpperCase(), options, ...(cles[hote] ? { joueur: cles[hote] } : {}) });
    for (const c of autres) dire(c, { type: 'rejoindre', code: salon(hote).code, pseudo: c.toUpperCase(), ...(cles[c] ? { joueur: cles[c] } : {}) });
  };
  /** La partie jusqu'au bout : chacun choisit son héros, puis se dit prêt à chaque manche, sans rien acheter. */
  const jouer = (joueurs: string[], temoin = joueurs[0]): void => {
    for (const c of joueurs) dire(c, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
    for (let n = 0; n < 600 && !dernier(temoin, 'fin'); n++) {
      for (const c of joueurs) {
        dire(c, { type: 'pret' });
        dire(c, { type: 'vu' });
      }
      // Le bot qui tient le siège d'un joueur parti prend son tour à l'horloge.
      avancer(5000);
    }
    assert.ok(dernier(temoin, 'fin'), 'la partie va au bout');
  };
  const place = (c: string): number => dernier(c, 'fin')?.classement.find((r) => r.seat === salon(c).siege)?.place ?? 0;
  return { lobby, mmr, dire, dernier, salon, ouvrir, jouer, place };
}

test('chaque joueur affronté pèse autant : un duel entre égaux vaut 5, une table de huit 32', () => {
  assert.deepEqual(variationsMmr([{ mmr: 1000, place: 1 }, { mmr: 1000, place: 2 }]), [5, -5]);
  assert.deepEqual(variationsMmr([1, 2, 3, 4].map((p) => ({ mmr: 1000, place: p }))), [14, 5, -5, -14]);
  const huit = variationsMmr(Array.from({ length: 8 }, (_, i) => ({ mmr: 1000, place: i + 1 })));
  assert.deepEqual([huit[0], huit[7], huit.reduce((a, b) => a + b, 0)], [32, -32, 0]);
  // Battre plus fort que soi rapporte plus, et lui coûte plus ; battre plus faible ne rapporte presque rien.
  assert.deepEqual(variationsMmr([{ mmr: 1000, place: 1 }, { mmr: 1400, place: 2 }]), [8, -8]);
  assert.deepEqual(variationsMmr([{ mmr: 1400, place: 1 }, { mmr: 1000, place: 2 }]), [1, -1]);
  // Perdre contre plus faible que soi coûte le plus cher.
  assert.deepEqual(variationsMmr([{ mmr: 1400, place: 2 }, { mmr: 1000, place: 1 }]), [-8, 8]);
});

test('dans un salon, une partie entre deux humains compte, les bots non : ce que l\'un gagne, l\'autre le perd', () => {
  const t = creerLobby();
  t.ouvrir(['a', 'b'], CLE, { ...OPTIONS, nomPublic: 'Table ouverte', minuteur: true });
  assert.deepEqual(t.salon('a').joueurs.slice(0, 2).map((j) => j.mmr), [undefined, undefined], 'personne n\'a de cote avant sa première partie');
  t.dire('a', { type: 'lancer' });
  t.jouer(['a', 'b']);
  const a = t.dernier('a', 'mmr');
  const b = t.dernier('b', 'mmr');
  assert.ok(a && b, 'chacun reçoit sa cote avec le classement');
  assert.deepEqual([a.avant, b.avant], [MMR_DEPART, MMR_DEPART]);
  const attendu = t.place('a') < t.place('b') ? 5 : t.place('a') > t.place('b') ? -5 : 0;
  assert.deepEqual([a.apres - a.avant, b.apres - b.avant], [attendu, -attendu || 0], 'un seul humain affronté : 5 points, pas 32');
  assert.deepEqual([t.mmr.lire(CLE.a), t.mmr.lire(CLE.b)], [a.apres, b.apres]);
  // La table montre la cote de chacun, et pas celle des bots.
  const sieges = t.salon('a').joueurs;
  assert.deepEqual(sieges.filter((j) => !j.bot).map((j) => j.mmr).sort(), [a.apres, b.apres].sort());
  assert.ok(sieges.filter((j) => j.bot).every((j) => j.mmr === undefined));
  t.lobby.destroy();
});

test('un salon privé compte comme un salon public, et la cote se retrouve à la partie suivante', () => {
  const t = creerLobby();
  t.mmr.ecrire(CLE.b, 1400);
  t.ouvrir(['a', 'b'], CLE);
  assert.equal(t.salon('a').joueurs[1].mmr, 1400, 'la cote d\'un joueur connu se voit dès son entrée');
  t.dire('a', { type: 'lancer' });
  t.jouer(['a', 'b']);
  const a = t.dernier('a', 'mmr');
  const b = t.dernier('b', 'mmr');
  assert.ok(a && b);
  assert.equal(b.avant, 1400);
  const attendu = t.place('a') < t.place('b') ? 8 : t.place('a') > t.place('b') ? -1 : 4;
  assert.equal(a.apres - a.avant, attendu, 'battre un joueur fort rapporte 8, perdre contre lui ne coûte que 1');
  assert.equal(a.apres - a.avant, -(b.apres - b.avant));
  t.lobby.destroy();
});

test('seul avec des bots, sans clé, ou assis deux fois : rien ne compte', () => {
  const seul = creerLobby();
  seul.ouvrir(['a'], CLE);
  seul.dire('a', { type: 'lancer' });
  seul.jouer(['a']);
  assert.equal(seul.dernier('a', 'mmr'), undefined, 'battre des bots ne rapporte rien');
  assert.equal(seul.mmr.lire(CLE.a), undefined);
  seul.lobby.destroy();

  const sansCle = creerLobby();
  sansCle.ouvrir(['a', 'b'], { a: CLE.a });
  sansCle.dire('a', { type: 'lancer' });
  sansCle.jouer(['a', 'b']);
  assert.equal(sansCle.dernier('a', 'mmr'), undefined, 'un seul joueur classé à la table : personne à qui se mesurer');
  assert.equal(sansCle.mmr.lire(CLE.a), undefined);
  sansCle.lobby.destroy();

  const deuxOnglets = creerLobby();
  deuxOnglets.ouvrir(['a', 'b'], { a: CLE.a, b: CLE.a });
  deuxOnglets.dire('a', { type: 'lancer' });
  deuxOnglets.jouer(['a', 'b']);
  assert.equal(deuxOnglets.dernier('a', 'mmr'), undefined, 'on ne se bat pas soi-même');
  assert.equal(deuxOnglets.mmr.lire(CLE.a), undefined);
  deuxOnglets.lobby.destroy();
});

test('partir en cours de partie ne fait pas échapper au classement', () => {
  const t = creerLobby();
  t.ouvrir(['a', 'b', 'c'], CLE);
  t.dire('a', { type: 'lancer' });
  for (const c of ['a', 'b', 'c']) t.dire(c, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  t.dire('c', { type: 'quitter' });
  t.jouer(['a', 'b']);
  const cotes = [t.mmr.lire(CLE.a), t.mmr.lire(CLE.b), t.mmr.lire(CLE.c)];
  assert.ok(cotes.every((cote) => cote !== undefined), 'les trois sont classés, le partant compris');
  assert.equal((cotes as number[]).reduce((somme, cote) => somme + cote, 0), 3 * MMR_DEPART, 'rien ne se crée, rien ne se perd');
  t.lobby.destroy();
});

test('le protocole garde la clé d\'un joueur à l\'entrée d\'un salon, et laisse tomber une clé douteuse', () => {
  const creer = { type: 'creer_salon', pseudo: 'Anne', options: OPTIONS };
  assert.deepEqual(parseClientMessage(JSON.stringify({ ...creer, joueur: CLE.a })), { ...creer, joueur: CLE.a });
  assert.deepEqual(parseClientMessage(JSON.stringify({ ...creer, joueur: '../etc' })), creer, 'sans clé valable, on entre quand même, hors classement');
  assert.deepEqual(parseClientMessage(JSON.stringify(creer)), creer);
  const entrer = { type: 'rejoindre', code: 'ABCDEF', pseudo: 'Bob' };
  assert.deepEqual(parseClientMessage(JSON.stringify({ ...entrer, joueur: CLE.b })), { ...entrer, joueur: CLE.b });
  assert.deepEqual(parseClientMessage(JSON.stringify({ ...entrer, joueur: 42 })), entrer);
});

test('le fichier des cotes ne garde que l\'empreinte des clés, et reprend l\'ancien format', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cotes-'));
  try {
    const chemin = join(dossier, 'mmr.json');
    const fichier = openMmrFile(chemin);
    fichier.ecrire(CLE.a, 1042);
    fichier.flush();
    const ecrit = readFileSync(chemin, 'utf8');
    assert.ok(!ecrit.includes(CLE.a), 'la clé du joueur n\'est écrite nulle part');
    assert.deepEqual(JSON.parse(ecrit), { version: 2, cotes: { [empreinte(CLE.a)]: 1042 } });
    assert.equal(openMmrFile(chemin).lire(CLE.a), 1042);
    assert.equal(openMmrFile(chemin).lire(empreinte(CLE.a)), undefined, 'connaître l\'empreinte ne donne pas le profil');
    // L'ancien format gardait les clés : elles deviennent des empreintes à la première écriture.
    writeFileSync(chemin, JSON.stringify({ [CLE.b]: 990 }));
    const repris = openMmrFile(chemin);
    assert.equal(repris.lire(CLE.b), 990);
    repris.ecrire(CLE.a, 1010);
    repris.flush();
    assert.ok(!readFileSync(chemin, 'utf8').includes(CLE.b));
    assert.deepEqual([openMmrFile(chemin).lire(CLE.a), openMmrFile(chemin).lire(CLE.b)], [1010, 990]);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});
