import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIEL } from '../src/data/histoire/tutoriel.ts';
import { createBot, decide } from '../src/bots/bots.ts';
import { applyAction, createGame, finishRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import type { PlayerAction } from '../src/engine/types.ts';
import { composerTutoriel, creerGuide, refusTutoriel, resteADepenser } from '../src/histoire/tutoriel.ts';
import type { Consigne } from '../src/histoire/tutoriel.ts';
import type { ResultatCombat } from '../src/histoire/campagne.ts';

function partie(seed = 4): Game {
  const table = composerTutoriel(seed);
  return createGame({ seed, seats: table.sieges.length, ...table.game });
}

test('la boutique du tutoriel suit son script, manche par manche', () => {
  const game = partie();
  assert.deepEqual(game.players[0].shop, TUTORIEL.boutique[1]);
  assert.equal(game.players[0].hero.id, TUTORIEL.heros);
  assert.ok(game.players[0].hp > game.players[1].hp, 'le joueur apprend sans risque de perdre');
});

/** Un geste du joueur, par les rails : refusé par la consigne, l'essai échoue. */
function geste(game: Game, consigne: Consigne, action: PlayerAction): boolean {
  const refus = refusTutoriel(consigne, viewFor(game, 0), action);
  assert.equal(refus, null, `${consigne.cle} refuse ${JSON.stringify(action)}`);
  return applyAction(game, 0, action).ok;
}

/** Un joueur qui suit chaque consigne, comme on l'attend d'un débutant attentif. Rend vrai quand il appuie sur Prêt. */
function suivreLaConsigne(game: Game, consigne: Consigne): boolean {
  const p = game.players[0];
  const act = (a: PlayerAction) => geste(game, consigne, a);
  const acheterEtPoser = (id: string) => {
    const slot = p.shop.indexOf(id);
    if (slot >= 0) act({ t: 'buy', slot, main: true });
    const m = p.hand.find((x) => x.cardId === id);
    if (m) act({ t: 'play', uid: m.uid });
  };
  // Un choix ouvert se fait d'abord, sauf celui que la leçon de l'Investiture doit montrer.
  if (p.discover && consigne.cle !== 'decouvrir') {
    act({ t: 'discover', i: 0 });
    return false;
  }
  switch (consigne.cle) {
    case 'premier_achat':
      act({ t: 'buy', slot: 0, main: true });
      break;
    case 'premiere_pose':
      for (const m of [...p.hand]) act({ t: 'play', uid: m.uid });
      break;
    case 'annonce':
      acheterEtPoser('kazib');
      break;
    case 'premier_sort': {
      const tract = p.spells.find((s) => s.spellId === 'tract');
      if (tract && p.board[0]) act({ t: 'cast', uid: tract.uid, target: p.board[0].uid });
      break;
    }
    case 'actualise':
      act({ t: 'roll' });
      break;
    case 'echelon':
      act({ t: 'upgrade' });
      break;
    case 'porte_parole':
      acheterEtPoser('delogu');
      break;
    case 'immunite':
      acheterEtPoser('gueant');
      break;
    case 'fin_de_tour':
      acheterEtPoser('durif');
      break;
    case 'gel':
      act({ t: 'freeze' });
      break;
    case 'triple':
      act({ t: 'buy', slot: p.shop.indexOf('cheminade'), main: true });
      break;
    case 'decouvrir': {
      const investiture = p.spells.find((s) => s.spellId === 'investiture');
      const dore = p.hand.find((m) => m.golden);
      if (p.discover) act({ t: 'discover', i: 0 });
      else if (investiture) act({ t: 'cast', uid: investiture.uid });
      else if (dore) act({ t: 'play', uid: dore.uid });
      break;
    }
    case 'casserole_posee':
    case 'scandale': {
      if (p.casseroleOffer) act({ t: 'buy_casserole' });
      const held = p.spells.find((s) => s.casseroleId);
      const porteur = consigne.cle === 'scandale' ? p.board.find((m) => m.casseroles.length > m.oublie) : p.board.find((m) => !m.token);
      if (held && porteur) act({ t: 'cast', uid: held.uid, target: porteur.uid });
      break;
    }
    case 'oubli': {
      const slot = p.shopSpells.indexOf('bracelet_electronique');
      if (slot >= 0) act({ t: 'buy_spell', slot });
      const bracelet = p.spells.find((s) => s.spellId === 'bracelet_electronique');
      if (bracelet) act({ t: 'cast', uid: bracelet.uid });
      break;
    }
    case 'deplace': {
      // Le politique cloué garde sa place : un autre passe devant.
      const libres = p.board.filter((m) => !m.locked);
      act({ t: 'move', uid: libres[libres.length - 1].uid, to: p.board.indexOf(libres[0]) });
      break;
    }
    case 'plein': {
      const faible = p.board.filter((m) => !m.locked).sort((a, b) => a.atk + a.hp - (b.atk + b.hp))[0];
      act({ t: 'sell', uid: faible.uid });
      break;
    }
    case 'sorts': {
      // Le premier sort de la main qui fait quelque chose, sur le premier politique qui le prend.
      for (const held of [...p.spells].filter((x) => x.spellId)) {
        if (p.board.some((m) => applyAction(game, 0, { t: 'cast', uid: held.uid, target: m.uid }).ok)) break;
        if (applyAction(game, 0, { t: 'cast', uid: held.uid }).ok) break;
      }
      break;
    }
    case 'budget': {
      for (const m of [...p.hand]) if (p.board.length < 7) act({ t: 'play', uid: m.uid });
      const view = viewFor(game, 0);
      if (view.rollCost > 0 && p.budget >= view.rollCost) act({ t: 'roll' });
      else if (p.budget >= view.upgradeCost) act({ t: 'upgrade' });
      else act({ t: 'buy', slot: 0, main: true });
      break;
    }
    case 'combat':
    case 'pret':
      assert.equal(refusTutoriel(consigne, viewFor(game, 0), 'pret'), null, `${consigne.cle} : Prêt doit passer`);
      return true;
    default:
      break;
  }
  return false;
}

interface Parcours {
  termine: boolean;
  vivant: boolean;
  manche: number;
  /** Les consignes vues, dans l'ordre, une fois chacune. */
  vues: string[];
  /** Les consignes vues à chaque manche. */
  parManche: Record<number, string[]>;
  /** Ce qui n'allait pas : une consigne qui parle d'une carte absente, un Prêt avec du budget. */
  fautes: string[];
}

/** Joue le tutoriel en suivant chaque consigne, jusqu'à la dernière. */
function jouerLeTutoriel(seed: number): Parcours {
  const game = partie(seed);
  const guide = creerGuide();
  const bots = game.players.map((_, i) => createBot('debutant', 31 + i + seed));
  let combat: ResultatCombat | undefined;
  const vues: string[] = [];
  const parManche: Record<number, string[]> = {};
  const fautes: string[] = [];
  let termine = false;
  for (let manche = 0; manche < 14 && game.phase !== 'fini' && !termine; manche++) {
    for (let n = 0; n < 40; n++) {
      const view = viewFor(game, 0);
      const consigne = guide.observer(view, combat);
      combat = undefined;
      if (consigne.cle === 'victoire') {
        termine = true;
        break;
      }
      vues.push(consigne.cle);
      (parManche[game.round] ??= []).push(consigne.cle);
      // Une leçon qui nomme une carte ne s'affiche que si la carte est là.
      for (const id of ['kazib', 'delogu', 'gueant', 'durif']) {
        if (TUTORIEL.etapes[consigne.cle as 'annonce']?.si?.includes(`carte:${id}`) && !view.shop.includes(id) && !view.hand.some((m) => m.cardId === id)) {
          fautes.push(`manche ${view.round} : ${consigne.cle} sans ${id}`);
        }
      }
      if (suivreLaConsigne(game, consigne)) {
        if (resteADepenser(viewFor(game, 0))) fautes.push(`manche ${game.round} : Prêt avec ${game.players[0].budget} de budget`);
        break;
      }
    }
    for (const q of game.players.slice(1)) {
      if (!q.alive) continue;
      for (let n = 0; n < 40; n++) {
        const a = decide(viewFor(game, q.seat), bots[q.seat]);
        if (!a || !applyAction(game, q.seat, a).ok) break;
      }
    }
    if (termine) break;
    startCombats(game);
    const record = game.roundCombats.find((r) => r.a === 0 || r.b === 0);
    if (record) {
      const side = record.a === 0 ? 0 : 1;
      combat = { gagne: record.result.winner === side, perdu: record.result.winner !== null && record.result.winner !== side };
    }
    finishRound(game);
  }
  return { termine, vivant: game.players[0].alive, manche: game.round, vues: [...new Set(vues)], parManche, fautes };
}

test('un joueur qui suit les consignes arrive au bout du tutoriel, en huit manches', () => {
  const r = jouerLeTutoriel(4);
  assert.ok(r.termine, `consignes vues : ${r.vues.join(', ')}`);
  assert.ok(r.vivant, 'le joueur ne perd pas le tutoriel');
  assert.equal(r.manche, 8, `tout est vu en ${r.manche} manches`);
  assert.deepEqual(r.fautes, []);
});

test('chaque manche donne ses leçons, dans l\'ordre, et le budget se dépense avant Prêt', () => {
  const r = jouerLeTutoriel(4);
  const lecons = (manche: number) => r.parManche[manche].filter((cle) => !['choix', 'plein', 'sorts', 'budget', 'pret'].includes(cle));
  assert.deepEqual(lecons(1), ['premier_achat', 'premiere_pose', 'combat']);
  assert.deepEqual(lecons(2), ['annonce', 'premier_sort', 'actualise']);
  assert.deepEqual(lecons(3), ['echelon', 'porte_parole']);
  assert.deepEqual(lecons(4), ['immunite', 'fin_de_tour', 'gel']);
  assert.deepEqual([...new Set(lecons(5))], ['triple', 'decouvrir']);
  assert.deepEqual(lecons(6), ['casserole_posee']);
  assert.deepEqual(lecons(7), ['scandale', 'oubli', 'deplace']);
  // Entre deux leçons, le rappel du budget, puis Prêt.
  assert.ok(r.parManche[3].includes('budget'), `manche 3 : ${r.parManche[3].join(', ')}`);
  for (let manche = 2; manche <= 7; manche++) assert.equal(r.parManche[manche].at(-1), 'pret', `manche ${manche} : ${r.parManche[manche].join(', ')}`);
});

test('quelle que soit la graine, le tutoriel se termine sans élimination ni faute', () => {
  const graines = Number(process.env.TUTO_GRAINES ?? 40);
  const echecs: string[] = [];
  for (let seed = 1; seed <= graines; seed++) {
    const r = jouerLeTutoriel(seed);
    if (!r.termine || !r.vivant || r.manche > 8 || r.fautes.length > 0) {
      echecs.push(`graine ${seed} : ${r.termine ? 'fini' : 'pas fini'}, ${r.vivant ? 'vivant' : 'éliminé'}, manche ${r.manche}, ${r.fautes.join(' ; ')}, vues ${r.vues.join(', ')}`);
    }
  }
  assert.deepEqual(echecs, []);
});

test('sur les rails : seul le geste de la consigne passe, et Prêt attend le budget dépensé', () => {
  const game = partie(4);
  const guide = creerGuide();
  const premiere = guide.observer(viewFor(game, 0));
  assert.equal(premiere.cle, 'premier_achat');
  assert.ok(refusTutoriel(premiere, viewFor(game, 0), { t: 'roll' }), 'pas d\'actualisation avant la leçon');
  assert.ok(refusTutoriel(premiere, viewFor(game, 0), { t: 'upgrade' }), 'pas d\'échelon avant la leçon');
  assert.match(refusTutoriel(premiere, viewFor(game, 0), 'pret') ?? '', /3 de budget/);
  assert.equal(refusTutoriel(premiere, viewFor(game, 0), { t: 'buy', slot: 1, main: true }), null);
  // À la manche 2, seul Kazib s'achète pour la leçon de l'Annonce.
  const consigne: Consigne = { cle: 'annonce', texte: '', permis: TUTORIEL.etapes.annonce?.permis as Consigne['permis'] };
  const view = { ...viewFor(game, 0), shop: ['kazib', 'cheminade', 'tiberi'] };
  assert.equal(refusTutoriel(consigne, view, { t: 'buy', slot: 0, main: true }), null);
  assert.ok(refusTutoriel(consigne, view, { t: 'buy', slot: 2, main: true }), 'Tibéri attend');
  // Un rappel laisse tout faire, sauf partir avec du budget.
  const rappel: Consigne = { cle: 'budget', texte: '', permis: 'tout' };
  assert.equal(refusTutoriel(rappel, viewFor(game, 0), { t: 'roll' }), null);
  assert.ok(refusTutoriel(rappel, viewFor(game, 0), 'pret'));
  assert.equal(refusTutoriel(rappel, { ...viewFor(game, 0), budget: 0 }, 'pret'), null);
});

test('le gel de la manche 4 garde les Cheminade, et la manche 5 apporte le troisième et de quoi le payer', () => {
  const game = partie(4);
  const p = game.players[0];
  for (let manche = 1; manche < 4; manche++) {
    startCombats(game);
    finishRound(game);
  }
  assert.equal(game.round, 4);
  assert.deepEqual(p.shop, TUTORIEL.boutique[4]);
  // Guéant et Durif achetés, les deux Cheminade restent : gelés.
  applyAction(game, 0, { t: 'buy', slot: 0, main: true });
  applyAction(game, 0, { t: 'buy', slot: 0, main: true });
  assert.deepEqual(p.shop, ['cheminade', 'cheminade']);
  applyAction(game, 0, { t: 'freeze' });
  startCombats(game);
  finishRound(game);
  assert.equal(p.shop.filter((id) => id === 'cheminade').length, 3, `boutique : ${p.shop.join(', ')}`);
  assert.ok(p.budget >= 9, `budget : ${p.budget}`);
});

test('le scandale de la manche 7 trouve le Bracelet électronique en boutique, qui l\'efface tout de suite', () => {
  const r = jouerLeTutoriel(4);
  assert.ok(r.parManche[7].includes('oubli'), `manche 7 : ${r.parManche[7].join(', ')}`);
  assert.deepEqual(TUTORIEL.sorts[7], ['bracelet_electronique']);
});
