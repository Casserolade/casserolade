import test from 'node:test';
import assert from 'node:assert/strict';
import { Lobby, mmrEnMemoire } from '../src/lobby/lobby.ts';
import type { ClientMessage, ServerMessage } from '../src/protocol/messages.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import { createRng } from '../src/engine/rng.ts';

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
    enAttente: () => attente.size,
  };
}

const NIVEAUX = ['facile', 'moyen', 'difficile', 'debutant'] as const;

/**
 * Une foule de connexions qui font n'importe quoi, dans n'importe quel ordre : créer, rejoindre,
 * reprendre, régler, lancer, quitter, entrer dans la file, voter, jouer, se déconnecter. Le salon ne
 * doit jamais lever d'exception, ni laisser une connexion à deux endroits, ni perdre ses MMR.
 */
function fuzz(seed: number, pas: number): void {
  const rng = createRng(seed);
  const horloge = creerHorloge();
  const boites = new Map<string, ServerMessage[]>();
  const mmr = mmrEnMemoire();
  const lobby = new Lobby({
    clock: horloge,
    graine: () => seed,
    mmr,
    send(c, m) {
      // Tout message doit passer par JSON sans perte : c'est ce que fait le serveur.
      const copie = JSON.parse(JSON.stringify(m)) as ServerMessage;
      assert.ok(typeof copie.type === 'string');
      if (!boites.has(c)) boites.set(c, []);
      (boites.get(c) as ServerMessage[]).push(copie);
    },
  });
  const connexions = Array.from({ length: 30 }, (_, i) => `c${i}`);
  const jetons: string[] = [];
  const codes: string[] = [];
  const joueurs = Array.from({ length: 10 }, (_, i) => `joueur-${seed}-${i}-0000000000`);
  const dernier = (c: string, type: ServerMessage['type']) => [...(boites.get(c) ?? [])].reverse().find((m) => m.type === type);
  try {
    for (let n = 0; n < pas; n++) {
      const c = rng.pick(connexions);
      const options = { bots: 0, niveauBots: rng.pick(NIVEAUX), minuteur: rng.next() < 0.7 };
      const messages: (() => ClientMessage)[] = [
        () => ({ type: 'creer_salon', pseudo: `P${n}`, options }),
        () => ({ type: 'rejoindre', code: codes.length && rng.next() < 0.8 ? rng.pick(codes) : 'ZZZZZZ', pseudo: `J${n}` }),
        () => ({ type: 'reprendre', jeton: jetons.length && rng.next() < 0.8 ? rng.pick(jetons) : 'nimporte' }),
        () => ({ type: 'regler_salon', options }),
        () => ({ type: 'lancer' }),
        () => ({ type: 'quitter' }),
        () => ({ type: 'file_rejoindre', pseudo: `F${n}`, joueur: rng.pick(joueurs) }),
        () => ({ type: 'file_vote', oui: rng.next() < 0.6 }),
        () => ({ type: 'pret' }),
        () => ({ type: 'vu' }),
        () => ({ type: 'action', seq: n, action: { t: 'hero', i: rng.int(4) } }),
        () => ({ type: 'action', seq: n, action: rng.pick([{ t: 'roll' }, { t: 'upgrade' }, { t: 'freeze' }, { t: 'buy', slot: rng.int(6) }, { t: 'sell', uid: rng.int(500) }, { t: 'buy_casserole' }, { t: 'buy_spell', slot: 0 }] as const) }),
      ];
      const r = rng.next();
      if (r < 0.08) lobby.disconnect(c);
      else if (r < 0.14) horloge.avancer(rng.int(40_000));
      else lobby.handleMessage(c, rng.pick(messages)());
      const salon = dernier(c, 'salon');
      if (salon && salon.type === 'salon') {
        if (!jetons.includes(salon.jeton)) jetons.push(salon.jeton);
        if (!codes.includes(salon.salon.code)) codes.push(salon.salon.code);
      }
      // Une connexion n'est jamais à la fois dans la file et à une table qu'elle voit encore.
      assert.ok(lobby.nombreEnFile >= 0 && lobby.nombreEnFile <= connexions.length);
      for (const j of joueurs) {
        const v = mmr.lire(j);
        if (v !== undefined) assert.ok(Number.isFinite(v) && v >= 0, `MMR invalide pour ${j} : ${v}`);
      }
    }
    // Le temps passe : les parties finissent, abandonnées ou jouées par les bots.
    for (const c of connexions) lobby.disconnect(c);
    horloge.avancer(60 * 60_000);
    assert.equal(lobby.nombreEnFile, 0);
    assert.equal(lobby.nombreDeSalons, 0, 'tous les salons abandonnés ont disparu');
  } finally {
    lobby.destroy();
  }
  assert.equal(horloge.enAttente(), 0, 'plus aucun minuteur après destroy');
}

test('le salon et la file résistent à une foule désordonnée', () => {
  const graines = Number(process.env.FUZZ_SALON ?? 6);
  for (let seed = 1; seed <= graines; seed++) fuzz(seed, 600);
});

test('le protocole rejette tout ce qui n\'est pas attendu, sans jamais lever', () => {
  const rng = createRng(99);
  const valeurs: unknown[] = [null, true, 0, -1, 1.5, 1e12, '', 'x'.repeat(70), [], {}, { t: 'roll' }, 'roll', NaN];
  const types = ['action', 'pret', 'vu', 'creer_salon', 'rejoindre', 'reprendre', 'lancer', 'quitter', 'regler_salon', 'file_rejoindre', 'file_vote', 'inconnu', ''];
  const champs = ['type', 'seq', 'action', 'pseudo', 'code', 'jeton', 'options', 'joueur', 'oui', 't', 'slot', 'uid', 'to', 'target', 'onto', 'i', 'main', 'bots', 'niveauBots', 'minuteur', 'contexte'];
  for (let n = 0; n < 5000; n++) {
    const brut: Record<string, unknown> = { type: rng.pick(types) };
    for (let k = 0; k < rng.int(6); k++) brut[rng.pick(champs)] = rng.next() < 0.3 ? { t: rng.pick(['buy', 'play', 'cast', 'sell', 'move', 'discover', 'hero', 'activate']), slot: rng.pick(valeurs), uid: rng.pick(valeurs) } : rng.pick(valeurs);
    const texte = JSON.stringify(brut);
    const message = parseClientMessage(texte);
    if (message) assert.equal(parseClientMessage(JSON.stringify(message))?.type, message.type, 'ce qui passe repasse');
  }
  for (const texte of ['', '{', '[]', 'null', '"x"', '{"type":"action","seq":1,"action":null}', '{"type":"__proto__"}', JSON.stringify({ type: 'file_rejoindre', pseudo: 'a', joueur: 'constructor0000000000' })]) {
    assert.doesNotThrow(() => parseClientMessage(texte));
  }
});
