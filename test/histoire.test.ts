import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMATEURS } from '../src/data/animateurs.ts';
import { CHAPITRES, OUTRE_TOMBE } from '../src/data/histoire/chapitres.ts';
import { GISCARD } from '../src/data/histoire/boss.ts';
import { HEROES, HERO_BY_ID } from '../src/data/heroes.ts';
import { PLATEAUX, SECOND_TOUR } from '../src/data/plateaux.ts';
import { REPLIQUES } from '../src/data/repliques.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { applyAction, createGame, viewFor } from '../src/engine/game.ts';
import { makeMinion } from '../src/engine/minion.ts';
import type { PlayerView } from '../src/engine/game.ts';
import { actionAutorisee, apresChapitre, chapitreCourant, composerTable, creerSuivi, nouvelleCampagne, plateauDuChapitre, remplir, tirerBoss } from '../src/histoire/campagne.ts';
import { playGame } from '../src/sim/simulate.ts';

const TOUS = [...CHAPITRES, OUTRE_TOMBE];

test('les chapitres sont des données cohérentes', () => {
  const plateaux = new Set([...PLATEAUX, SECOND_TOUR].map((p) => p.id));
  const orateurs = new Set(['narrateur', ...ANIMATEURS.map((a) => a.id)]);
  for (const c of TOUS) {
    for (const p of c.plateaux) assert.ok(plateaux.has(p), `${c.id} : plateau ${p}`);
    for (const l of c.dialogues) assert.ok(orateurs.has(l.qui), `${c.id} : ${l.qui}`);
    assert.ok(c.dialogues.some((l) => l.quand === 'victoire'), `${c.id} : victoire`);
    assert.ok(c.dialogues.some((l) => l.quand === 'defaite'), `${c.id} : défaite`);
    assert.ok(c.placeRequise <= c.adversaires.length + 1, c.id);
  }
});

test('la carrière va des municipales au débat de TF1, toujours le dernier', () => {
  assert.equal(CHAPITRES[0].id, 'municipales');
  assert.deepEqual(CHAPITRES.at(-1)?.plateaux, ['tf1_second_tour']);
  assert.equal(CHAPITRES.at(-1)?.adversaires.length, 1);
});

test('le scénario est intemporel : ni année ni élection datée dans la narration', () => {
  for (const c of CHAPITRES) {
    for (const l of c.dialogues) assert.ok(!/20(2[0-9]|3[0-9])/.test(l.texte) || l.texte.includes('vidéo'), l.texte);
  }
});

test('chaque héros peut jouer chaque chapitre, sans action refusée', () => {
  for (const c of TOUS) {
    for (const h of HEROES.slice(0, 4)) {
      const t = composerTable(c, h.id, 21);
      const r = playGame({ seed: 21, levels: ['moyen', ...c.adversaires], params: t.game.params, heroes: t.game.heroes, heroOverrides: t.game.heroOverrides, contextId: t.game.contextId, activeCamps: t.game.activeCamps });
      assert.equal(r.rejected, 0, `${c.id}, ${h.id}`);
      assert.equal(r.truncated, false, `${c.id}, ${h.id}`);
      assert.equal(r.seats[0].heroId, h.id);
    }
  }
});

test('aucun doublon de héros à une table', () => {
  for (const c of TOUS) {
    const t = composerTable(c, 'macron', 4);
    const ids = t.sieges.map((s) => s.heroId);
    assert.equal(new Set(ids).size, ids.length, c.id);
    assert.equal(ids[0], 'macron');
    assert.equal(t.sieges[0].level, null);
  }
});

test('toutes les règles jouent dès le premier chapitre, et le bonus suit la durée', () => {
  const t = composerTable(CHAPITRES[0], 'macron', 8);
  assert.ok(t.game.heroOverrides?.macron.mods?.firstAnnonceTwice, 'les pouvoirs jouent dès les municipales');
  const game = createGame({ seed: 8, seats: t.sieges.length, ...t.game });
  assert.ok(game.players.every((p) => p.hp > 0));
  for (const chapitre of CHAPITRES) {
    assert.deepEqual(chapitre.bloque, [], `${chapitre.id} ne bloque rien`);
    assert.equal(chapitre.regles.tierMax, undefined, `${chapitre.id} ne bride pas les échelons`);
    assert.ok(chapitre.pouvoirs);
  }
  const legislatives = composerTable(CHAPITRES.find((c) => c.id === 'legislatives') as (typeof CHAPITRES)[0], 'macron', 8);
  assert.equal(legislatives.game.contextId, 'dissolution', 'chaque élection a sa règle spéciale');
});

test('la carrière ne donne plus de consignes : ses dialogues sont de la satire', () => {
  const consignes = /glissez|cliquez|posez-le|achetez|montez d'échelon|faites-les glisser/i;
  for (const chapitre of CHAPITRES) for (const ligne of chapitre.dialogues) assert.doesNotMatch(ligne.texte, consignes, `${chapitre.id} : ${ligne.texte}`);
});

test('le boss est tiré au sort, jamais le héros du joueur, et Giscard sort parfois', () => {
  const tires = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const boss = tirerBoss('macron', i);
    assert.notEqual(boss, 'macron');
    tires.add(boss);
  }
  assert.ok(tires.has('giscard'));
  assert.ok(tires.size >= 8, `${tires.size} boss différents`);
  const parGiscard = Array.from({ length: 500 }, (_, i) => tirerBoss('macron', i)).filter((b) => b === 'giscard').length;
  assert.ok(parGiscard > 50 && parGiscard < 200, `${parGiscard} sur 500`);
});

test('Giscard joue d\'outre-tombe, mais reste hors de la boutique et du choix des héros', () => {
  assert.ok(!HEROES.some((h) => h.id === 'giscard'));
  assert.equal(HERO_BY_ID.giscard, GISCARD);
  assert.ok(REPLIQUES.giscard.debut);
  const t = composerTable(OUTRE_TOMBE, 'macron', 3);
  assert.equal(t.bossId, 'giscard');
  assert.equal(t.sieges[1].heroId, 'giscard');
  const game = createGame({ seed: 3, seats: 2, ...t.game });
  assert.equal(game.players[1].hero.name, GISCARD.name);
  assert.ok(game.players[1].hero.mods.firstDeathRetour);
  // Un joueur sait contre quoi il joue : le pouvoir est public.
  assert.equal(viewFor(game, 0).table[1].heroId, 'giscard');
});

function vue(partielle: Partial<PlayerView>): PlayerView {
  const game = createGame({ seed: 1, seats: 2 });
  return { ...viewFor(game, 0), ...partielle };
}

test('le suivi déclenche chaque dialogue une fois, et seulement depuis la vue', () => {
  const chapitre = { ...CHAPITRES[0], dialogues: [...CHAPITRES[0].dialogues, { quand: 'combat_gagne' as const, qui: 'narrateur', texte: 'Gagné.' }] };
  const suivi = creerSuivi(chapitre);
  const debut = suivi.observer(vue({}));
  assert.ok(debut.some((l) => l.quand === 'debut'));
  assert.equal(suivi.observer(vue({})).filter((l) => l.quand === 'debut').length, 0);
  const apresCombat = suivi.observer(vue({}), { gagne: true, perdu: false });
  assert.ok(apresCombat.some((l) => l.quand === 'combat_gagne'));
  assert.equal(suivi.observer(vue({}), { gagne: true, perdu: false }).filter((l) => l.quand === 'combat_gagne').length, 0);
});

test('la main compte : un doré y est déjà obtenu, et n\'y recompte pas ses casseroles', () => {
  const chapitre = { ...CHAPITRES[0], objectifs: [{ type: 'triple' as const }, { type: 'casseroles_min' as const, n: 2 }] };
  const game = createGame({ seed: 2, seats: 2 });
  applyAction(game, 0, { t: 'buy', slot: 0 });
  const base = viewFor(game, 0);
  const serviteur = base.board[0] ?? base.hand[0];
  const avecUne = { ...serviteur, casseroles: ['ecoutes'] };
  const suivi = creerSuivi(chapitre);
  suivi.observer({ ...base, board: [], hand: [] });
  suivi.observer({ ...base, board: [avecUne], hand: [] });
  // Il fusionne en doré, passe en main, puis revient sur le plateau.
  const dore = { ...avecUne, golden: true };
  const enMain = suivi.observer({ ...base, board: [], hand: [dore] });
  assert.ok(enMain.every((l) => l.quand !== 'casserole_posee'));
  suivi.observer({ ...base, board: [dore], hand: [] });
  const bilan = suivi.conclure({ ...base, board: [dore], hand: [] }, 1);
  assert.deepEqual(bilan.objectifs.map((o) => o.atteint), [true, false]);
});

/** Un chapitre qui dit une ligne pour chaque geste : pour vérifier ce que le suivi reconnaît. */
function chapitreBavard() {
  const quand = ['premier_achat', 'premiere_pose', 'plateau_plein', 'debut'] as const;
  return { ...CHAPITRES[0], dialogues: quand.map((q) => ({ quand: q, qui: 'narrateur', texte: q === 'plateau_plein' ? 'Plateau plein : renvoyez-en un à la taverne.' : q })) };
}

test('le suivi distingue l\'achat en main de la pose sur le plateau', () => {
  const suivi = creerSuivi(chapitreBavard());
  const game = createGame({ seed: 2, seats: 2 });
  const base = viewFor(game, 0);
  const m = { ...(applyAction(game, 0, { t: 'buy', slot: 0 }), viewFor(game, 0).board[0] ?? viewFor(game, 0).hand[0]) };
  suivi.observer({ ...base, board: [], hand: [] });
  const achat = suivi.observer({ ...base, board: [], hand: [m] });
  assert.ok(achat.some((l) => l.quand === 'premier_achat'));
  assert.ok(!achat.some((l) => l.quand === 'premiere_pose'));
  const pose = suivi.observer({ ...base, board: [m], hand: [] });
  assert.ok(pose.some((l) => l.quand === 'premiere_pose'));
});

test('le suivi reconnaît le plateau plein', () => {
  const suivi = creerSuivi(chapitreBavard());
  const base = vue({ boardLimit: 2 });
  const game = createGame({ seed: 2, seats: 2 });
  applyAction(game, 0, { t: 'buy', slot: 0 });
  const m = viewFor(game, 0).board[0] ?? viewFor(game, 0).hand[0];
  assert.ok(!suivi.observer({ ...base, board: [m], hand: [] }).some((l) => l.quand === 'plateau_plein'));
  const plein = suivi.observer({ ...base, board: [m, { ...m, uid: m.uid + 1 }], hand: [] });
  assert.ok(plein.some((l) => /taverne/.test(l.texte)));
});

test('les objectifs se mesurent sur ce que le joueur a vraiment fait', () => {
  const chapitre = { ...CHAPITRES[0], placeRequise: 2, objectifs: [{ type: 'scandale' as const }, { type: 'sans_scandale' as const }, { type: 'manches_max' as const, n: 3 }] };
  const game = createGame({ seed: 2, seats: 2 });
  const base = viewFor(game, 0);
  const suivi = creerSuivi(chapitre);
  suivi.observer({ ...base, round: 2 });
  const enScandale = { ...makeMinion(CARD_BY_ID[base.shop[0]], 501), casseroles: ['homards', 'lapsus'], oublie: 0, scandal: { until: 5, budget: -2, hpLoss: 0, locked: false, silenced: null } };
  suivi.observer({ ...base, round: 3, board: [enScandale] });
  const b = suivi.conclure({ ...base, round: 3 }, 1);
  assert.equal(b.reussi, true);
  assert.deepEqual(b.objectifs.map((o) => o.atteint), [true, false, true]);
  const perdu = creerSuivi(chapitre).conclure(base, 2 + 1);
  assert.equal(perdu.reussi, false);
  assert.ok(perdu.objectifs.every((o) => !o.atteint));
  assert.ok(perdu.lignes.some((l) => l.quand === 'defaite'));
});

test('un chapitre peut bloquer une action, le moteur n\'en sait rien', () => {
  const bride = { ...CHAPITRES[0], bloque: ['buy_casserole' as const] };
  assert.equal(actionAutorisee(bride, { t: 'buy_casserole' }), false);
  assert.equal(actionAutorisee(bride, { t: 'buy', slot: 0 }), true);
  assert.equal(actionAutorisee(CHAPITRES[0], { t: 'buy_casserole' }), true);
  const game = createGame({ seed: 1, seats: 2, params: { tierMax: 1 } });
  const achat = viewFor(game, 0).shop[0];
  applyAction(game, 0, { t: 'buy', slot: 0 });
  assert.ok(viewFor(game, 0).board.some((m) => m.cardId === achat));
});

test('les plateaux du chapitre avancent puis restent sur le dernier', () => {
  const c = CHAPITRES.find((x) => x.id === 'presidentielle') as (typeof CHAPITRES)[0];
  assert.equal(plateauDuChapitre(c, 1), 'grand_oral');
  assert.equal(plateauDuChapitre(c, 3), 'tf1_20h');
  assert.equal(plateauDuChapitre(c, 12), 'tf1_20h');
});

test('la campagne avance, garde le meilleur score, et ramène Giscard après le second tour', () => {
  let c = nouvelleCampagne('hollande', 1);
  c.bossId = 'lepen';
  const reussite = (etoiles: boolean[]) => ({ reussi: true, place: 1, lignes: [], objectifs: etoiles.map((atteint) => ({ objectif: { type: 'triple' as const }, texte: '', atteint })) });
  const echec = { reussi: false, place: 8, lignes: [], objectifs: [] };
  assert.equal(chapitreCourant(c)?.id, 'municipales');
  const avant = c;
  c = apresChapitre(c, CHAPITRES[0], echec);
  assert.equal(c.chapitre, avant.chapitre);
  for (const ch of CHAPITRES) {
    assert.equal(chapitreCourant(c)?.id, ch.id);
    c = apresChapitre(c, ch, reussite([true, false]));
  }
  assert.equal(c.elu, true);
  assert.equal(c.etoiles.municipales, 1);
  assert.equal(chapitreCourant(c)?.id, 'outre_tombe');
  c = apresChapitre(c, OUTRE_TOMBE, reussite([true]));
  assert.equal(chapitreCourant(c), null);
});

test('si Giscard était le boss du second tour, il ne revient pas une deuxième fois', () => {
  let c = { ...nouvelleCampagne('hollande', 1), bossId: 'giscard', chapitre: CHAPITRES.length - 1 };
  c = apresChapitre(c, CHAPITRES.at(-1) as (typeof CHAPITRES)[0], { reussi: true, place: 1, lignes: [], objectifs: [] });
  assert.equal(chapitreCourant(c), null);
});

test('le texte remplit le nom du héros et de l\'adversaire', () => {
  assert.equal(remplir('{heros} face à {adversaire}.', 'hollande', 'giscard'), 'François Hollande face à Valéry Giscard d\'Estaing.');
  assert.equal(remplir('{adversaire}', 'hollande', null), 'son adversaire');
});

test('le suivi compte les sorts joués et voit les Annonces, sans compter les casseroles', () => {
  assert.ok(!JSON.stringify(CHAPITRES).includes('Alliance'), 'l\'Alliance est abandonnée');
  const chapitre = {
    ...CHAPITRES[0],
    objectifs: [{ type: 'sorts_min' as const, n: 3 }, { type: 'manches_max' as const, n: 9 }],
    dialogues: [
      { quand: 'premier_sort' as const, qui: 'narrateur', texte: 'Un sort.' },
      { quand: 'annonce' as const, qui: 'narrateur', texte: 'Une Annonce.' },
    ],
  };
  const suivi = creerSuivi(chapitre);
  const base = vue({ board: [], hand: [] });
  const partie = createGame({ seed: 2, seats: 2 });
  applyAction(partie, 0, { t: 'buy', slot: 0 });
  const achete = viewFor(partie, 0).hand[0] ?? viewFor(partie, 0).board[0];
  const annonceur = { ...achete, uid: 900, cardId: 'chikirou' };
  suivi.observer({ ...base, spells: [{ uid: 1, spellId: 'tract', count: 2 }, { uid: 2, casseroleId: 'homards' }] });
  // La casserole part de la main : ce n'est pas un sort.
  const casserole = suivi.observer({ ...base, spells: [{ uid: 1, spellId: 'tract', count: 2 }] });
  assert.ok(!casserole.some((l) => l.quand === 'premier_sort'));
  const tract = suivi.observer({ ...base, spells: [{ uid: 1, spellId: 'tract', count: 1 }] });
  assert.ok(tract.some((l) => l.quand === 'premier_sort'));
  suivi.observer({ ...base, spells: [] });
  const pose = suivi.observer({ ...base, spells: [], board: [annonceur] });
  assert.ok(pose.some((l) => l.quand === 'annonce'));
  const bilan = suivi.conclure({ ...base, spells: [] }, 1);
  assert.deepEqual(bilan.objectifs.map((o) => [o.texte, o.atteint]), [['Jouer 3 sorts', false], ['Finir en 9 manches ou moins', true]]);
});
