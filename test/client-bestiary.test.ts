import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestiaryCamps } from '../src/client/tools/bestiaryCamps.ts';
import { CARDS, PARTY_CAMPS } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';

test('bestiaryCamps : chaque politique une fois, dans son camp, par échelon puis par nom, avec ses casseroles', () => {
  const camps = bestiaryCamps(CARDS, CASSEROLES, [...PARTY_CAMPS, 'civile']);
  const all = camps.flatMap((c) => c.entries.map((e) => e.face.cardId));
  assert.equal(all.length, CARDS.filter((c) => !c.token).length);
  assert.equal(new Set(all).size, all.length);
  for (const camp of camps) {
    assert.ok(camp.entries.every((e) => e.face.camp === camp.camp), camp.camp);
    const tiers = camp.entries.map((e) => e.face.tier);
    assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b), camp.camp);
  }
  const sarkozy = camps.flatMap((c) => c.entries).find((e) => e.face.cardId === 'sarkozy');
  assert.ok(sarkozy && sarkozy.casseroles.includes('Les écoutes'));
  assert.equal(camps.find((c) => c.camp === 'reconquete')?.label, 'Reconquête');
});
