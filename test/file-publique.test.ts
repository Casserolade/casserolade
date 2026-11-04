import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FENETRE_DEPART, FENETRE_MAX, fenetreMmr, formerGroupes, majorite, niveauDesBots } from '../src/lobby/file.ts';
import { Lobby, SIEGES, mmrEnMemoire } from '../src/lobby/lobby.ts';
import { K_MMR, MMR_DEPART, chanceDevant, variationsMmr } from '../src/lobby/mmr.ts';
import type { ClientMessage, ServerMessage, VueFile } from '../src/protocol/messages.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import { openMmrFile } from '../src/server/mmrFile.ts';

// ---- Le MMR ----

test('MMR : à niveau égal, le premier gagne K/2 et le dernier perd K/2, la somme reste nulle', () => {
  const joueurs = Array.from({ length: SIEGES }, (_, i) => ({ mmr: MMR_DEPART, place: i + 1 }));
  const v = variationsMmr(joueurs);
  assert.equal(v[0], K_MMR / 2);
  assert.equal(v[SIEGES - 1], -K_MMR / 2);
  assert.ok(v.every((x, i) => i === 0 || x < v[i - 1]), 'chaque place rapporte moins que la précédente');
  assert.equal(v.reduce((a, b) => a + b, 0), 0);
});

test('MMR : battre un joueur mieux classé rapporte plus, seul on ne bouge pas', () => {
  const [contreFort] = variationsMmr([{ mmr: 1000, place: 1 }, { mmr: 1400, place: 2 }]);
  const [contreFaible] = variationsMmr([{ mmr: 1000, place: 1 }, { mmr: 600, place: 2 }]);
  assert.ok(contreFort > contreFaible);
  assert.ok(contreFaible > 0);
  assert.deepEqual(variationsMmr([{ mmr: 1000, place: 3 }]), [0]);
  assert.ok(Math.abs(chanceDevant(1400, 1000) - 10 / 11) < 1e-9);
  // Deux joueurs à la même place font match nul.
  assert.deepEqual(variationsMmr([{ mmr: 1000, place: 2 }, { mmr: 1000, place: 2 }]), [0, 0]);
});

// ---- La composition des tables ----

test('la fenêtre de MMR s\'élargit avec l\'attente, jusqu\'à un plafond', () => {
  assert.equal(fenetreMmr(0), FENETRE_DEPART);
  assert.ok(fenetreMmr(30_000) > fenetreMmr(10_000));
  assert.equal(fenetreMmr(3_600_000), FENETRE_MAX);
});

test('les tables se forment autour du plus ancien, par MMR proche, 8 au plus', () => {
  const a = { id: 'a', mmr: 1000, depuis: 0 };
  const b = { id: 'b', mmr: 1050, depuis: 1000 };
  const c = { id: 'c', mmr: 1600, depuis: 500 };
  // À t = 1 s, la fenêtre fait 110 : C est trop loin de A.
  const groupes = formerGroupes([b, c, a], 1000, SIEGES);
  assert.deepEqual(groupes.map((g) => g.map((e) => e.id)), [['a', 'b'], ['c']]);
  // Une minute plus tard, tout le monde joue ensemble.
  assert.deepEqual(formerGroupes([b, c, a], 61_000, SIEGES).map((g) => g.length), [3]);
  // Neuf joueurs de même niveau : une table pleine, et le dernier arrivé attend la suivante.
  const neuf = Array.from({ length: 9 }, (_, i) => ({ id: `j${i}`, mmr: 1000, depuis: i }));
  const tables = formerGroupes(neuf, 10, SIEGES);
  assert.deepEqual(tables.map((g) => g.length), [8, 1]);
  assert.equal(tables[1][0].id, 'j8');
});

test('majorité stricte et niveau des bots selon le MMR moyen', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 7].map(majorite), [1, 2, 2, 3, 3, 4]);
  assert.equal(niveauDesBots(MMR_DEPART), 'moyen');
  assert.equal(niveauDesBots(700), 'facile');
  assert.equal(niveauDesBots(1400), 'difficile');
});

// ---- La file dans le salon ----

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

function creerFile(mmr = mmrEnMemoire()) {
  const horloge = creerHorloge();
  const boites = new Map<string, ServerMessage[]>();
  const lobby = new Lobby({
    clock: horloge,
    graine: () => 7,
    mmr,
    send(c, m) {
      if (!boites.has(c)) boites.set(c, []);
      (boites.get(c) as ServerMessage[]).push(JSON.parse(JSON.stringify(m)));
    },
  });
  const dire = (c: string, m: ClientMessage) => lobby.handleMessage(c, m);
  const dernier = <T extends ServerMessage['type']>(c: string, type: T) =>
    [...(boites.get(c) ?? [])].reverse().find((m) => m.type === type) as Extract<ServerMessage, { type: T }> | undefined;
  const file = (c: string): VueFile | null | undefined => dernier(c, 'file')?.file;
  const entrer = (c: string, pseudo = c.toUpperCase()) => dire(c, { type: 'file_rejoindre', pseudo, joueur: `joueur-${c}-0000000000` });
  return { horloge, boites, lobby, dire, dernier, file, entrer, mmr };
}

test('la file montre sa table à chacun, et quitter retire le joueur et son vote', () => {
  const t = creerFile();
  t.entrer('a');
  t.entrer('b');
  const vue = t.file('a') as VueFile;
  assert.equal(vue.mmr, MMR_DEPART);
  assert.equal(vue.groupe.length, 2);
  assert.deepEqual(vue.groupe.map((g) => g.moi), [true, false]);
  assert.equal(vue.majorite, 2);
  assert.equal(vue.en_file, 2);
  t.dire('a', { type: 'file_vote', oui: true });
  assert.equal(t.file('b')?.groupe.find((g) => g.pseudo === 'A')?.vote, true);
  assert.equal(t.lobby.nombreDeSalons, 0, 'un vote sur deux ne suffit pas');
  t.dire('a', { type: 'quitter' });
  assert.equal(t.file('a'), null);
  assert.equal(t.file('b')?.groupe.length, 1);
  assert.equal(t.lobby.nombreEnFile, 1);
  t.lobby.disconnect('b');
  assert.equal(t.lobby.nombreEnFile, 0);
});

test('une majorité stricte lance la table avec des bots, à un niveau suivant le MMR', () => {
  const t = creerFile();
  for (const c of ['a', 'b', 'c']) t.entrer(c);
  t.dire('a', { type: 'file_vote', oui: true });
  assert.equal(t.lobby.nombreDeSalons, 0);
  t.dire('b', { type: 'file_vote', oui: true });
  assert.equal(t.lobby.nombreDeSalons, 1);
  assert.equal(t.lobby.nombreEnFile, 0);
  for (const c of ['a', 'b', 'c']) {
    assert.equal(t.file(c), null);
    const salon = t.dernier(c, 'salon')?.salon;
    assert.equal(salon?.etat, 'en_jeu');
    assert.equal(salon?.publique, true);
    assert.equal(salon?.joueurs.filter((j) => j.bot).length, SIEGES - 3);
    assert.equal(salon?.options.niveauBots, 'moyen');
    assert.equal(salon?.options.minuteur, true);
  }
  // Une table publique ne se règle ni ne se relance.
  t.dire('a', { type: 'regler_salon', options: { bots: 0, niveauBots: 'facile', minuteur: false } });
  assert.match(t.dernier('a', 'erreur')?.erreur ?? '', /publique/);
  t.lobby.destroy();
});

test('à 8 joueurs, la table part sans vote, et le neuvième attend', () => {
  const t = creerFile();
  for (let i = 0; i < 9; i++) t.entrer(`j${i}`);
  assert.equal(t.lobby.nombreDeSalons, 1);
  assert.equal(t.lobby.nombreEnFile, 1);
  assert.equal(t.dernier('j0', 'salon')?.salon.joueurs.filter((j) => j.bot).length, 0);
  assert.equal(t.file('j8')?.groupe.length, 1);
  t.lobby.destroy();
});

test('des MMR éloignés attendent, puis la fenêtre s\'élargit et les réunit', () => {
  const mmr = mmrEnMemoire();
  mmr.ecrire('joueur-b-0000000000', 1600);
  const t = creerFile(mmr);
  t.entrer('a');
  t.entrer('b');
  assert.equal(t.file('a')?.groupe.length, 1);
  assert.equal(t.file('b')?.mmr, 1600);
  t.horloge.avancer(60_000);
  assert.equal(t.file('a')?.groupe.length, 2);
  assert.ok((t.file('a')?.attente_ms ?? 0) >= 55_000);
  t.lobby.destroy();
});

test('le même joueur dans deux onglets n\'occupe qu\'une place', () => {
  const t = creerFile();
  t.entrer('a');
  t.dire('a2', { type: 'file_rejoindre', pseudo: 'A', joueur: 'joueur-a-0000000000' });
  assert.equal(t.lobby.nombreEnFile, 1);
  assert.equal(t.file('a'), null);
  assert.equal(t.file('a2')?.groupe.length, 1);
  t.lobby.destroy();
});

test('après une partie publique, le MMR bouge entre humains et se retrouve à la partie suivante', () => {
  const t = creerFile();
  t.entrer('a');
  t.entrer('b');
  t.dire('a', { type: 'file_vote', oui: true });
  t.dire('b', { type: 'file_vote', oui: true });
  for (const c of ['a', 'b']) t.dire(c, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  for (let n = 0; n < 400 && !t.dernier('a', 'fin'); n++) {
    for (const c of ['a', 'b']) {
      t.dire(c, { type: 'pret' });
      t.dire(c, { type: 'vu' });
    }
  }
  const fin = t.dernier('a', 'fin');
  assert.ok(fin);
  const mmrA = t.dernier('a', 'mmr');
  const mmrB = t.dernier('b', 'mmr');
  assert.ok(mmrA && mmrB);
  assert.equal(mmrA.avant, MMR_DEPART);
  const placeA = fin.classement.find((r) => r.seat === t.dernier('a', 'salon')?.salon.siege)?.place ?? 0;
  const placeB = fin.classement.find((r) => r.seat === t.dernier('b', 'salon')?.salon.siege)?.place ?? 0;
  assert.equal(Math.sign(mmrA.apres - mmrA.avant), Math.sign(placeB - placeA));
  assert.equal(mmrA.apres - mmrA.avant, -(mmrB.apres - mmrB.avant));
  assert.equal(t.mmr.lire('joueur-a-0000000000'), mmrA.apres);
  // Pas de « Rejouer » à une table publique : on retourne dans la file, avec son nouveau MMR.
  t.dire('a', { type: 'lancer' });
  assert.match(t.dernier('a', 'erreur')?.erreur ?? '', /file/);
  t.entrer('a');
  assert.equal(t.file('a')?.mmr, mmrA.apres);
  t.lobby.destroy();
});

test('le protocole accepte la file et refuse un identifiant de joueur douteux', () => {
  const joueur = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'file_rejoindre', pseudo: 'Anne', joueur, x: 1 })), {
    type: 'file_rejoindre',
    pseudo: 'Anne',
    joueur,
  });
  assert.equal(parseClientMessage(JSON.stringify({ type: 'file_rejoindre', pseudo: 'Anne', joueur: '../etc' })), null);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'file_rejoindre', pseudo: 'Anne', joueur: '__proto__' })), null);
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'file_vote', oui: false })), { type: 'file_vote', oui: false });
  assert.equal(parseClientMessage(JSON.stringify({ type: 'file_vote', oui: 'oui' })), null);
});

test('le fichier de MMR survit à un redémarrage et ignore les entrées douteuses', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'mmr-'));
  try {
    const chemin = join(dossier, 'sous', 'mmr.json');
    const fichier = openMmrFile(chemin);
    assert.equal(fichier.lire('joueur-a-0000000000'), undefined);
    fichier.ecrire('joueur-a-0000000000', 1032);
    fichier.flush();
    assert.equal(openMmrFile(chemin).lire('joueur-a-0000000000'), 1032);
    writeFileSync(chemin, JSON.stringify({ 'joueur-a-0000000000': 990, bad: 5, 'joueur-b-0000000000': 'x' }));
    const relu = openMmrFile(chemin);
    assert.equal(relu.lire('joueur-a-0000000000'), 990);
    assert.equal(relu.lire('bad'), undefined);
    assert.equal(relu.lire('joueur-b-0000000000'), undefined);
    assert.ok(readFileSync(chemin, 'utf8').length > 0);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});
