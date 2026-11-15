import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIEL } from '../src/data/histoire/tutoriel.ts';
import { HERO_BY_ID } from '../src/data/heroes.ts';
import { createBot, decide } from '../src/bots/bots.ts';
import { applyAction, createGame, finishRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game, PlayerView } from '../src/engine/game.ts';
import type { PlayerAction } from '../src/engine/types.ts';
import { composerTutoriel, creerGuide, refusTutoriel, resteADepenser } from '../src/histoire/tutoriel.ts';
import type { Consigne } from '../src/histoire/tutoriel.ts';

function partie(seed = 4): Game {
  const table = composerTutoriel(seed);
  return createGame({ seed, seats: table.sieges.length, ...table.game });
}

/** Passe les manches sans rien faire, jusqu'à celle-ci. */
function allerALaManche(game: Game, manche: number): void {
  while (game.round < manche) {
    startCombats(game);
    finishRound(game);
  }
}

test('la boutique du tutoriel suit son script, manche par manche', () => {
  const game = partie();
  assert.deepEqual(game.players[0].shop, TUTORIEL.boutique[1]);
  assert.equal(game.players[0].hero.id, TUTORIEL.heros);
  assert.ok(game.players[0].hp > game.players[1].hp, 'le joueur apprend sans risque de perdre');
  for (let manche = 2; manche <= 7; manche++) {
    allerALaManche(game, manche);
    assert.deepEqual(game.players[0].shop, TUTORIEL.boutique[manche], `manche ${manche}`);
  }
});

/** Un geste du joueur, par les rails : refusé par la consigne, l'essai échoue. */
function geste(game: Game, consigne: Consigne, action: PlayerAction): boolean {
  const refus = refusTutoriel(consigne, viewFor(game, 0), action);
  assert.equal(refus, null, `${consigne.cle} refuse ${JSON.stringify(action)}`);
  const resultat = applyAction(game, 0, action);
  assert.ok(resultat.ok, `${consigne.cle} : ${JSON.stringify(action)} échoue`);
  return resultat.ok;
}

/**
 * Un joueur qui suit chaque consigne, comme on l'attend d'un débutant attentif. La graine fait varier ses choix libres :
 * le premier politique, celui qui reçoit la casserole, la carte découverte. Rend vrai quand il appuie sur Prêt.
 */
function suivreLaConsigne(game: Game, consigne: Consigne, seed: number): boolean {
  const p = game.players[0];
  const act = (a: PlayerAction) => geste(game, consigne, a);
  const acheterEtPoser = (id: string) => {
    act({ t: 'buy', slot: p.shop.indexOf(id), main: true });
    act({ t: 'play', uid: (p.hand.find((m) => m.cardId === id) as { uid: number }).uid });
  };
  const lancerLesTracts = () => {
    for (const held of [...p.spells].filter((s) => s.spellId === 'tract')) act({ t: 'cast', uid: held.uid, target: p.board[0].uid });
  };
  const lePlusFaible = () => p.board.filter((m) => !m.locked).sort((a, b) => a.atk + a.hp - (b.atk + b.hp))[0];
  switch (consigne.cle) {
    case 'premier_achat':
      act({ t: 'buy', slot: seed % 3, main: true });
      break;
    case 'premiere_pose':
    case 'pose':
      for (const m of [...p.hand]) act({ t: 'play', uid: m.uid });
      break;
    case 'annonce':
      acheterEtPoser('kazib');
      break;
    case 'premier_sort':
      lancerLesTracts();
      break;
    case 'actualise':
    case 'budget':
      act({ t: 'roll' });
      break;
    case 'echelon':
    case 'echelon_3':
    case 'depense':
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
    case 'celebration':
      acheterEtPoser('morano');
      break;
    case 'gel':
      act({ t: 'freeze' });
      break;
    case 'triple':
      act({ t: 'buy', slot: p.shop.indexOf('kazib'), main: true });
      break;
    case 'choix':
      act({ t: 'discover', i: 0 });
      break;
    case 'decouvrir': {
      const investiture = p.spells.find((s) => s.spellId === 'investiture');
      const dore = p.hand.find((m) => m.golden);
      if (p.discover) act({ t: 'discover', i: seed % 3 });
      else if (investiture) act({ t: 'cast', uid: investiture.uid });
      else if (dore) act({ t: 'play', uid: dore.uid });
      break;
    }
    case 'casserole_posee':
    case 'scandale': {
      act({ t: 'buy_casserole' });
      const held = p.spells.find((s) => s.casseroleId) as { uid: number };
      const porteur = consigne.cle === 'scandale' ? p.board.find((m) => m.casseroles.length > m.oublie) : p.board[seed % p.board.length];
      act({ t: 'cast', uid: held.uid, target: (porteur as { uid: number }).uid });
      break;
    }
    case 'oubli': {
      act({ t: 'buy_spell', slot: p.shopSpells.indexOf('bracelet_electronique') });
      act({ t: 'cast', uid: (p.spells.find((s) => s.spellId === 'bracelet_electronique') as { uid: number }).uid });
      break;
    }
    case 'deplace': {
      // Le politique cloué garde sa place : un autre passe devant.
      const libres = p.board.filter((m) => !m.locked);
      act({ t: 'move', uid: libres[libres.length - 1].uid, to: p.board.indexOf(libres[0]) });
      break;
    }
    case 'renvoi':
    case 'plein':
      act({ t: 'sell', uid: lePlusFaible().uid });
      break;
    case 'budget_achat':
      act({ t: 'buy', slot: 0, main: true });
      break;
    case 'sorts':
      lancerLesTracts();
      return true;
    case 'combat':
    case 'gele':
    case 'pret':
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
  /** Les consignes vues à chaque manche, dans l'ordre, une fois chacune. */
  parManche: Record<number, string[]>;
  /** Le budget au moment de Prêt, manche par manche. */
  budgetAuCombat: Record<number, number>;
  /** La boutique au début de chaque manche. */
  boutiques: Record<number, string[]>;
  /** Les manches dont le joueur a gagné le combat. */
  gagnees: number[];
  /** Ce qui n'allait pas : une consigne sans sa carte, un Prêt refusé, des rails qui lâchent. */
  fautes: string[];
}

const CARTES_DE_LECON: Record<string, string> = { annonce: 'kazib', porte_parole: 'delogu', immunite: 'gueant', fin_de_tour: 'durif', celebration: 'morano', triple: 'kazib' };

/** Ce que les rails doivent refuser à cette consigne, si elle ne le demande pas elle-même. */
function railsQuiLachent(consigne: Consigne, view: PlayerView): string[] {
  if (consigne.cle === 'victoire') return [];
  const fautes: string[] = [];
  const interdits: [string, PlayerAction, string[]][] = [
    ['geler', { t: 'freeze' }, ['gel']],
    ['actualiser', { t: 'roll' }, ['actualise', 'budget', 'budget_achat']],
    ['monter d\'échelon', { t: 'upgrade' }, ['echelon', 'echelon_3', 'depense']],
    ['renvoyer', { t: 'sell', uid: view.board[0]?.uid ?? 0 }, ['renvoi', 'plein']],
  ];
  for (const [nom, action, lecons] of interdits) {
    if (!lecons.includes(consigne.cle) && refusTutoriel(consigne, view, action) === null) fautes.push(`manche ${view.round} : ${consigne.cle} laisse ${nom}`);
  }
  if (consigne.permis === 'tout') fautes.push(`manche ${view.round} : ${consigne.cle} laisse tout faire`);
  return fautes;
}

/** Joue le tutoriel en suivant chaque consigne, jusqu'à la dernière. */
function jouerLeTutoriel(seed: number): Parcours {
  const game = partie(seed);
  const guide = creerGuide();
  const bots = game.players.map((_, i) => createBot('debutant', 31 + i + seed));
  const parManche: Record<number, string[]> = {};
  const budgetAuCombat: Record<number, number> = {};
  const boutiques: Record<number, string[]> = {};
  const fautes: string[] = [];
  const gagnees: number[] = [];
  let termine = false;
  for (let manche = 0; manche < 14 && game.phase !== 'fini' && !termine; manche++) {
    boutiques[game.round] = [...game.players[0].shop];
    for (let n = 0; n < 40; n++) {
      const view = viewFor(game, 0);
      const consigne = guide.observer(view);
      const vues = (parManche[game.round] ??= []);
      if (vues.at(-1) !== consigne.cle) vues.push(consigne.cle);
      if (consigne.cle === 'victoire') {
        termine = true;
        break;
      }
      // Une leçon qui nomme une carte ne s'affiche que si la carte est là.
      const carte = CARTES_DE_LECON[consigne.cle];
      if (carte && !view.shop.includes(carte) && !view.hand.some((m) => m.cardId === carte)) fautes.push(`manche ${view.round} : ${consigne.cle} sans ${carte}`);
      fautes.push(...railsQuiLachent(consigne, view));
      if (suivreLaConsigne(game, consigne, seed)) {
        const refus = refusTutoriel(consigne, viewFor(game, 0), 'pret');
        if (refus) fautes.push(`manche ${game.round} : Prêt refusé (${refus})`);
        if (resteADepenser(viewFor(game, 0))) fautes.push(`manche ${game.round} : Prêt avec ${game.players[0].budget} de budget`);
        budgetAuCombat[game.round] = game.players[0].budget;
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
    const combat = game.roundCombats.find((c) => c.a === 0 || c.b === 0);
    if (combat && combat.result.winner === (combat.a === 0 ? 0 : 1)) gagnees.push(game.round);
    finishRound(game);
  }
  return { termine, vivant: game.players[0].alive, manche: game.round, parManche, budgetAuCombat, boutiques, gagnees, fautes };
}

/** Tout est dépensé : qu'il reste des Tracts en main ou non, c'est le rappel de Prêt. */
const sansLesTracts = (cles: string[]) => cles.map((cle) => (cle === 'sorts' ? 'pret' : cle));

test('un joueur qui suit les consignes voit tout le tutoriel en sept manches', () => {
  const r = jouerLeTutoriel(4);
  assert.deepEqual(r.fautes, []);
  assert.ok(r.termine, `consignes vues : ${JSON.stringify(r.parManche)}`);
  assert.ok(r.vivant, 'le joueur ne perd pas le tutoriel');
  assert.equal(r.manche, 7);
});

test('chaque manche est écrite d\'un bout à l\'autre : ses leçons dans l\'ordre, et un budget qui tombe juste', () => {
  const r = jouerLeTutoriel(4);
  assert.deepEqual(sansLesTracts(r.parManche[1]), ['premier_achat', 'premiere_pose', 'combat']);
  assert.deepEqual(sansLesTracts(r.parManche[2]), ['annonce', 'premier_sort', 'actualise', 'pret']);
  assert.deepEqual(sansLesTracts(r.parManche[3]), ['echelon', 'porte_parole', 'budget', 'pret']);
  assert.deepEqual(sansLesTracts(r.parManche[4]), ['immunite', 'fin_de_tour', 'gel', 'gele']);
  assert.deepEqual(sansLesTracts(r.parManche[5]), ['triple', 'decouvrir', 'pose', 'budget', 'pret']);
  assert.deepEqual(sansLesTracts(r.parManche[6]), ['casserole_posee', 'echelon_3', 'celebration', 'budget', 'pret']);
  assert.deepEqual(r.parManche[7], ['scandale', 'oubli', 'deplace', 'renvoi', 'victoire']);
  assert.deepEqual(r.budgetAuCombat, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
});

test('quelle que soit la graine, le tutoriel suit le même chemin, sans élimination ni faute', () => {
  const graines = Number(process.env.TUTO_GRAINES ?? 40);
  const attendu = jouerLeTutoriel(4);
  const echecs: string[] = [];
  for (let seed = 1; seed <= graines; seed++) {
    const r = jouerLeTutoriel(seed);
    const memeChemin = [1, 2, 3, 4, 5, 6, 7].every((m) => JSON.stringify(sansLesTracts(r.parManche[m] ?? [])) === JSON.stringify(sansLesTracts(attendu.parManche[m])));
    if (!r.termine || !r.vivant || r.manche !== 7 || r.fautes.length > 0 || !memeChemin) {
      echecs.push(`graine ${seed} : ${r.termine ? 'fini' : 'pas fini'}, ${r.vivant ? 'vivant' : 'éliminé'}, manche ${r.manche}, ${r.fautes.join(' ; ')}, ${JSON.stringify(r.parManche)}`);
    }
  }
  assert.deepEqual(echecs, []);
});

test('les adversaires ont moins de budget : qui suit les consignes gagne la plupart de ses combats, dès le premier', () => {
  const table = composerTutoriel(4);
  for (const { heroId } of table.sieges.slice(1)) {
    const prevu = (HERO_BY_ID[heroId].mods.budgetPerRound ?? 0) - TUTORIEL.malusAdversaires;
    assert.equal(table.game.heroOverrides?.[heroId]?.mods?.budgetPerRound, prevu, heroId);
  }
  const graines = 40;
  const gagnes: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (let seed = 1; seed <= graines; seed++) for (const manche of jouerLeTutoriel(seed).gagnees) gagnes[manche]++;
  for (const [manche, combats] of Object.entries(gagnes)) {
    assert.ok(combats > (graines * 2) / 3, `manche ${manche} : ${combats} combats gagnés sur ${graines} (${JSON.stringify(gagnes)})`);
  }
});

test('le gel de la manche 4 tient : les deux Kazib gelés sont là à la manche 5, à leur place', () => {
  const r = jouerLeTutoriel(4);
  assert.deepEqual(r.boutiques[5], ['kazib', 'kazib', 'hortefeux', 'rigault']);
  // Trois Kazib font un doré, avec le budget de la manche et sans avance.
  assert.ok(r.parManche[5].includes('decouvrir'));
});

test('une boutique gelée garde toutes ses cartes, même quand la manche suivante est écrite', () => {
  const game = partie(4);
  const p = game.players[0];
  // Geler dès la première manche, deux cartes restantes : la manche 2 les garde, et Kazib arrive à côté.
  applyAction(game, 0, { t: 'buy', slot: 0, main: true });
  const gardees = [...p.shop];
  assert.equal(gardees.length, 2);
  applyAction(game, 0, { t: 'freeze' });
  allerALaManche(game, 2);
  assert.deepEqual(p.shop.slice(0, 2), gardees, `boutique : ${p.shop.join(', ')}`);
  assert.ok(p.shop.includes('kazib'), `la carte de la leçon arrive quand même : ${p.shop.join(', ')}`);
  // Une boutique pleine, gelée : rien ne la remplace, et aucune de ses cartes ne disparaît.
  applyAction(game, 0, { t: 'roll' });
  const pleine = [...p.shop];
  applyAction(game, 0, { t: 'freeze' });
  allerALaManche(game, 3);
  assert.deepEqual(p.shop, pleine);
});

test('sur les rails, on ne gèle qu\'à la leçon du gel, et on ne dégèle pas ensuite', () => {
  const game = partie(4);
  const guide = creerGuide();
  // Manche 1 : la boutique de la manche 2 est écrite, un gel ne servirait à rien. Il est refusé.
  const premiere = guide.observer(viewFor(game, 0));
  assert.ok(refusTutoriel(premiere, viewFor(game, 0), { t: 'freeze' }));
  // La leçon du gel le demande, puis celle d'après le garde.
  const gel: Consigne = { cle: 'gel', texte: '', permis: TUTORIEL.etapes.gel.permis as Consigne['permis'], rappel: false };
  assert.equal(refusTutoriel(gel, viewFor(game, 0), { t: 'freeze' }), null);
  const gele: Consigne = { cle: 'gele', texte: '', permis: TUTORIEL.etapes.gele.permis as Consigne['permis'], rappel: false };
  assert.ok(refusTutoriel(gele, { ...viewFor(game, 0), frozen: true }, { t: 'freeze' }), 'le gel ne se défait pas');
  assert.equal(refusTutoriel(gele, { ...viewFor(game, 0), frozen: true, budget: 0 }, 'pret'), null);
});

test('aucun rappel ne propose de geler', () => {
  for (const [cle, texte] of Object.entries(TUTORIEL.rappels)) assert.doesNotMatch(texte, /gel/i, cle);
});

test('la fin venue, une boutique gelée ne force pas à actualiser avant le combat', () => {
  const game = partie(4);
  const libre: Consigne = { cle: 'victoire', texte: '', permis: 'tout', rappel: false };
  const view = { ...viewFor(game, 0), budget: 2, shopSpells: [], casseroleOffer: null, upgradeCost: 9 };
  assert.match(refusTutoriel(libre, view, 'pret') ?? '', /2 de budget/, 'sans gel, il reste à actualiser');
  assert.equal(refusTutoriel(libre, { ...view, frozen: true }, 'pret'), null, 'gelée, la boutique se garde : Prêt passe');
  assert.equal(refusTutoriel(libre, { ...view, frozen: true }, { t: 'freeze' }), null, 'et le gel se défait librement');
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
  const consigne: Consigne = { cle: 'annonce', texte: '', permis: TUTORIEL.etapes.annonce.permis as Consigne['permis'], rappel: false };
  const view = { ...viewFor(game, 0), shop: ['kazib', 'tiberi', 'leaument'] };
  assert.equal(refusTutoriel(consigne, view, { t: 'buy', slot: 0, main: true }), null);
  assert.ok(refusTutoriel(consigne, view, { t: 'buy', slot: 2, main: true }), 'Léaument attend');
  // Le rappel du budget ne laisse qu'actualiser, et pas partir.
  const rappel: Consigne = { cle: 'budget', texte: '', permis: ['actualise'], rappel: true };
  assert.equal(refusTutoriel(rappel, viewFor(game, 0), { t: 'roll' }), null);
  assert.ok(refusTutoriel(rappel, viewFor(game, 0), { t: 'buy', slot: 0, main: true }));
  assert.ok(refusTutoriel(rappel, viewFor(game, 0), 'pret'));
  // Poser, déplacer et lancer un sort de la main passent toujours.
  assert.equal(refusTutoriel(rappel, viewFor(game, 0), { t: 'play', uid: 1 }), null);
  assert.equal(refusTutoriel(rappel, viewFor(game, 0), { t: 'move', uid: 1, to: 0 }), null);
});

test('l\'Investiture du doré propose les trois politiques écrits', () => {
  const game = partie(4);
  const guide = creerGuide();
  const p = game.players[0];
  for (let n = 0; n < 200 && !p.discover; n++) {
    const consigne = guide.observer(viewFor(game, 0));
    if (!suivreLaConsigne(game, consigne, 4)) continue;
    startCombats(game);
    finishRound(game);
  }
  assert.equal(game.round, 5);
  assert.deepEqual(viewFor(game, 0).discover, TUTORIEL.decouvertes[5]);
});

test('le scandale de la manche 7 trouve le Bracelet électronique en boutique, qui l\'efface tout de suite', () => {
  const r = jouerLeTutoriel(4);
  assert.ok(r.parManche[7].includes('oubli'), `manche 7 : ${r.parManche[7].join(', ')}`);
  assert.deepEqual(TUTORIEL.sorts[7], ['bracelet_electronique']);
});
