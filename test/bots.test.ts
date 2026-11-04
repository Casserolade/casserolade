import test from 'node:test';
import assert from 'node:assert/strict';
import { createBot, decide } from '../src/bots/bots.ts';
import { HEROES } from '../src/data/heroes.ts';
import { PERSONNALITES } from '../src/data/personnalites.ts';
import { REPLIQUES } from '../src/data/repliques.ts';
import { createGame, viewFor } from '../src/engine/game.ts';
import { playGame } from '../src/sim/simulate.ts';

const PERSONNAGES = Array(8).fill({ personnage: true });

function partiesAvecHeros(heroId: string, autre: string, games = 40) {
  const seats = [];
  for (let i = 0; i < games; i++) {
    const heroes = [heroId, autre, autre, autre, autre, autre, autre, autre].map((h, s) => (s === 0 ? h : HEROES[(s + i) % HEROES.length].id));
    seats.push(playGame({ seed: 3 + i * 7919, levels: Array(8).fill('moyen'), styles: PERSONNAGES, heroes }).seats[0]);
  }
  return seats;
}

const moyenne = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

test('chaque héros a un personnage et ses répliques', () => {
  for (const h of HEROES) {
    assert.ok(PERSONNALITES[h.id], `personnalité de ${h.id}`);
    for (const e of ['debut', 'victoire', 'defaite', 'elimine'] as const) assert.ok(REPLIQUES[h.id]?.[e], `${h.id} : ${e}`);
  }
});

test('un personnage n\'a jamais une action refusée, à aucun niveau', () => {
  for (const level of ['debutant', 'facile', 'moyen', 'difficile'] as const) {
    for (let i = 0; i < 6; i++) {
      const r = playGame({ seed: 50 + i, levels: Array(8).fill(level), styles: PERSONNAGES });
      assert.equal(r.rejected, 0, level);
      assert.equal(r.truncated, false, level);
    }
  }
});

test('la même graine donne les mêmes décisions, personnages compris', () => {
  const a = playGame({ seed: 77, levels: Array(8).fill('difficile'), styles: PERSONNAGES });
  const b = playGame({ seed: 77, levels: Array(8).fill('difficile'), styles: PERSONNAGES });
  assert.deepEqual(a.seats, b.seats);
});

test('le bot choisit un héros proposé, sans lire autre chose que sa vue', () => {
  const game = createGame({ seed: 5, heroSelection: true });
  const view = viewFor(game, 0);
  const action = decide(view, createBot('moyen', 1, { personnage: true }));
  assert.equal(action?.t, 'hero');
  assert.ok((action as { i: number }).i < (view.heroOffers as string[]).length);
});

test('Balkany revend plus que les autres : il exploite son pouvoir', () => {
  const balkany = moyenne(partiesAvecHeros('balkany', 'lepen').map((s) => s.actions.sell ?? 0));
  const retailleau = moyenne(partiesAvecHeros('retailleau', 'lepen').map((s) => s.actions.sell ?? 0));
  assert.ok(balkany > retailleau, `${balkany} contre ${retailleau}`);
});

test('Lassalle actualise plus que les autres, et Sarkozy pose plus de casseroles', () => {
  const lassalle = moyenne(partiesAvecHeros('lassalle', 'lepen').map((s) => s.actions.roll ?? 0));
  const philippe = moyenne(partiesAvecHeros('philippe', 'lepen').map((s) => s.actions.roll ?? 0));
  assert.ok(lassalle > philippe, `${lassalle} contre ${philippe}`);
  const sarkozy = moyenne(partiesAvecHeros('sarkozy', 'lepen').map((s) => s.casseroles));
  const tondelier = moyenne(partiesAvecHeros('tondelier', 'lepen').map((s) => s.casseroles));
  assert.ok(sarkozy > tondelier, `${sarkozy} contre ${tondelier}`);
});

test('Zemmour tient son camp quand il est en jeu', () => {
  let tenu = 0;
  let parties = 0;
  for (let i = 0; i < 40; i++) {
    const r = playGame({ seed: 9 + i * 7919, levels: Array(8).fill('moyen'), styles: PERSONNAGES, heroes: ['zemmour'], activeCamps: ['reconquete', 'rn', 'insoumis', 'macronie', 'socialistes'] });
    parties++;
    if (r.seats[0].camp === 'reconquete') tenu++;
  }
  assert.ok(tenu / parties > 0.7, `${tenu} sur ${parties}`);
});

test('la hiérarchie des niveaux tient : un moyen domine une table de faciles', () => {
  let places = 0;
  const games = 120;
  for (let i = 0; i < games; i++) {
    places += playGame({ seed: 5 + i * 7919, levels: ['moyen', ...Array(7).fill('facile')] }).seats[0].place;
  }
  assert.ok(places / games < 3.2, `place ${places / games}`);
});
