import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIEL } from '../src/data/histoire/tutoriel.ts';
import { createBot, decide } from '../src/bots/bots.ts';
import { applyAction, createGame, finishRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { composerTutoriel, creerGuide } from '../src/histoire/tutoriel.ts';
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

/** Un joueur qui suit chaque consigne, comme on l'attend d'un débutant attentif. */
function suivreLaConsigne(game: Game, fini: string): void {
  const p = game.players[0];
  const act = (a: Parameters<typeof applyAction>[2]) => applyAction(game, 0, a).ok;
  const cheminade = () => p.shop.indexOf('cheminade');
  switch (fini) {
    case 'premier_achat':
      act({ t: 'buy', slot: Math.max(0, cheminade()), main: true });
      break;
    case 'premiere_pose':
      for (const m of [...p.hand]) act({ t: 'play', uid: m.uid });
      break;
    case 'echelon':
      act({ t: 'upgrade' });
      break;
    case 'actualise':
      act({ t: 'roll' });
      break;
    case 'gel':
      if (!p.frozen) act({ t: 'freeze' });
      break;
    case 'annonce': {
      const slot = p.shop.indexOf('kazib');
      if (slot >= 0) act({ t: 'buy', slot });
      break;
    }
    case 'porte_parole':
    case 'immunite':
    case 'fin_de_tour': {
      // Delogu, Guéant et Durif : achetés et posés d'un geste ; la Fin de tour se voit à la manche suivante.
      const wanted: Record<string, string> = { porte_parole: 'delogu', immunite: 'gueant', fin_de_tour: 'durif' };
      if (p.board.some((m) => m.cardId === wanted[fini])) break;
      const slot = p.shop.indexOf(wanted[fini]);
      if (slot >= 0) act({ t: 'buy', slot });
      break;
    }
    case 'deplace': {
      // Le politique cloué garde sa place : un autre passe devant.
      const libres = p.board.filter((m) => !m.locked);
      if (libres.length >= 2) act({ t: 'move', uid: libres[libres.length - 1].uid, to: p.board.indexOf(libres[0]) });
      break;
    }
    case 'premier_sort': {
      const tract = p.spells.find((s) => s.spellId === 'tract');
      if (tract && p.board[0]) act({ t: 'cast', uid: tract.uid, target: p.board[0].uid });
      break;
    }
    case 'casserole_posee':
    case 'scandale': {
      if (p.casseroleOffer) act({ t: 'buy_casserole' });
      const held = p.spells.find((s) => s.casseroleId);
      const porteur = p.board.find((m) => !m.token);
      if (held && porteur) act({ t: 'cast', uid: held.uid, target: porteur.uid });
      break;
    }
    case 'triple':
      while (cheminade() >= 0 && p.budget >= 3) act({ t: 'buy', slot: cheminade(), main: true });
      break;
    case 'decouvrir': {
      const dore = p.hand.find((m) => m.golden);
      if (dore) act({ t: 'play', uid: dore.uid });
      const investiture = p.spells.find((s) => s.spellId === 'investiture');
      if (investiture) act({ t: 'cast', uid: investiture.uid });
      break;
    }
    default:
      break;
  }
  // La découverte se choisit à la consigne suivante : le guide doit d'abord la voir.
  if (p.discover && fini !== 'decouvrir') act({ t: 'discover', i: 0 });
  // Ce qui reste en main se pose, pour ne pas bloquer la place.
  for (const m of [...p.hand]) if (p.board.length < 7) act({ t: 'play', uid: m.uid });
}

/** Joue le tutoriel en suivant chaque consigne. Rend la manche de fin, ou null s'il n'est pas allé au bout. */
function jouerLeTutoriel(seed: number): { termine: boolean; vivant: boolean; manche: number; vues: string[] } {
  const game = partie(seed);
  const guide = creerGuide();
  const bots = game.players.map((_, i) => createBot('debutant', 31 + i + seed));
  let combat: ResultatCombat | undefined;
  const vues: string[] = [];
  let termine = false;
  for (let manche = 0; manche < 14 && game.phase !== 'fini' && !termine; manche++) {
    for (let n = 0; n < 8; n++) {
      const etape = guide.observer(viewFor(game, 0), combat);
      combat = undefined;
      if (!etape || etape.fini === 'victoire') {
        termine = true;
        break;
      }
      vues.push(etape.fini);
      suivreLaConsigne(game, etape.fini);
    }
    for (const q of game.players.slice(1)) {
      if (!q.alive) continue;
      for (let n = 0; n < 40; n++) {
        const a = decide(viewFor(game, q.seat), bots[q.seat]);
        if (!a || !applyAction(game, q.seat, a).ok) break;
      }
    }
    startCombats(game);
    const record = game.roundCombats.find((r) => r.a === 0 || r.b === 0);
    if (record) {
      const side = record.a === 0 ? 0 : 1;
      combat = { gagne: record.result.winner === side, perdu: record.result.winner !== null && record.result.winner !== side };
    }
    finishRound(game);
  }
  return { termine, vivant: game.players[0].alive, manche: game.round, vues: [...new Set(vues)] };
}

test('un joueur qui suit les consignes arrive au bout du tutoriel', () => {
  const r = jouerLeTutoriel(4);
  assert.ok(r.termine, `consignes vues : ${r.vues.join(', ')}`);
  assert.ok(r.vivant, 'le joueur ne perd pas le tutoriel');
  assert.ok(r.manche <= 10, `tout est vu en ${r.manche} manches`);
});

test('le tutoriel montre les mots-clés, la Fin de tour, le scandale qui cloue et le déplacement autour de lui', () => {
  const r = jouerLeTutoriel(4);
  for (const etape of ['porte_parole', 'immunite', 'scandale', 'deplace', 'fin_de_tour', 'oubli']) {
    assert.ok(r.vues.includes(etape), `${etape} absente : ${r.vues.join(', ')}`);
  }
});

test('le tutoriel apprend à actualiser et à geler, et la boutique gelée passe la manche', () => {
  const r = jouerLeTutoriel(4);
  assert.ok(r.vues.includes('actualise') && r.vues.includes('gel'), `consignes vues : ${r.vues.join(', ')}`);
  const game = partie(4);
  const p = game.players[0];
  applyAction(game, 0, { t: 'roll' });
  const gelee = [...p.shop];
  applyAction(game, 0, { t: 'freeze' });
  startCombats(game);
  finishRound(game);
  assert.deepEqual(p.shop, gelee, 'la boutique écrite de la manche 2 ne remplace pas la boutique gelée');
});

test('quelle que soit la graine, le tutoriel se termine sans élimination', () => {
  const graines = Number(process.env.TUTO_GRAINES ?? 40);
  const echecs: string[] = [];
  for (let seed = 1; seed <= graines; seed++) {
    const r = jouerLeTutoriel(seed);
    if (!r.termine || !r.vivant || r.manche > 12) echecs.push(`graine ${seed} : ${r.termine ? 'fini' : 'pas fini'}, ${r.vivant ? 'vivant' : 'éliminé'}, manche ${r.manche}, vues ${r.vues.join(', ')}`);
  }
  assert.deepEqual(echecs, []);
});
