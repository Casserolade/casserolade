import test from 'node:test';
import assert from 'node:assert/strict';
import { SUCCES } from '../src/data/succes.ts';
import { PARAMS } from '../src/data/params.ts';
import { HEROES } from '../src/data/heroes.ts';
import { CHAPITRES, OUTRE_TOMBE } from '../src/data/histoire/chapitres.ts';
import { createGame, viewFor } from '../src/engine/game.ts';
import { apresResultat, progresValide, progresVierge, titres } from '../src/histoire/succes.ts';

const STATS = { casseroles: 0, scandals: 0, forgotten: 0, triples: 0, spells: 0 };

test('chaque succès a un identifiant unique, et ses chapitres existent', () => {
  assert.equal(new Set(SUCCES.map((s) => s.id)).size, SUCCES.length);
  const chapitres = new Set([...CHAPITRES, OUTRE_TOMBE].map((c) => c.id));
  for (const s of SUCCES) if (s.condition.type === 'chapitre') assert.ok(chapitres.has(s.condition.id), s.id);
});

test('une première victoire donne son titre, et un succès se gagne une fois', () => {
  let p = progresVierge();
  const gagne = apresResultat(p, { place: 1, stats: { ...STATS, casseroles: 9 } });
  p = gagne.progres;
  assert.ok(gagne.nouveaux.some((s) => s.id === 'premier_mandat'));
  assert.ok(gagne.nouveaux.some((s) => s.id === 'casserolade'));
  assert.ok(titres(p).includes('L\'Élu'));
  assert.ok(titres(p).includes('Le Batteur de casseroles'));
  const encore = apresResultat(p, { place: 1, stats: { ...STATS, casseroles: 9 } });
  assert.equal(encore.nouveaux.filter((s) => s.id === 'casserolade').length, 0, 'un succès ne se gagne qu\'une fois');
  assert.equal(encore.progres.victoires, 2);
});

test('gagner sans casserole, gagner après trois oublis, finir la carrière', () => {
  const propre = apresResultat(progresVierge(), { place: 1, stats: STATS });
  assert.ok(propre.nouveaux.some((s) => s.id === 'mains_propres'));
  const blanchi = apresResultat(progresVierge(), { place: 1, stats: { ...STATS, casseroles: 4, forgotten: 3 } });
  assert.ok(blanchi.nouveaux.some((s) => s.id === 'le_peuple_oublie'));
  assert.ok(!blanchi.nouveaux.some((s) => s.id === 'mains_propres'));
  const perdu = apresResultat(progresVierge(), { place: 5, stats: STATS });
  assert.ok(!perdu.nouveaux.some((s) => s.id === 'mains_propres'), 'il faut gagner');
  const elu = apresResultat(progresVierge(), { chapitre: 'second_tour' });
  assert.deepEqual(elu.nouveaux.map((s) => s.id), ['elu']);
  assert.equal(elu.progres.parties, 0, 'un chapitre n\'est pas une partie de plus');
  assert.ok(apresResultat(progresVierge(), { tutoriel: true }).nouveaux.some((s) => s.id === 'bizuth'));
});

test('une progression abîmée dans le navigateur ne casse rien', () => {
  assert.deepEqual(progresValide(null), progresVierge());
  assert.deepEqual(progresValide({ parties: -3, victoires: 'x', obtenus: ['premier_mandat', 'inconnu', 'premier_mandat', 4] }), {
    parties: 0,
    victoires: 0,
    obtenus: ['premier_mandat'],
  });
});

test('le moteur propose plus de héros au siège qui y a droit, sans doublon entre joueurs', () => {
  const game = createGame({ seed: 5, seats: 8, heroSelection: true, heroChoices: { 0: 4 } });
  const offres = game.players.map((p) => p.heroOffers ?? []);
  assert.equal(offres[0].length, 4);
  assert.equal(offres[1].length, PARAMS.heroChoices);
  const tous = offres.flat();
  // 4 + 7 × 2 = 18 propositions : tant qu'il reste des héros, aucun doublon.
  const distincts = Math.min(tous.length, HEROES.length);
  assert.equal(new Set(tous.slice(0, distincts)).size, distincts);
  assert.deepEqual(Object.keys(viewFor(game, 0).stats).sort(), ['casseroles', 'forgotten', 'scandals', 'spells', 'triples']);
});
