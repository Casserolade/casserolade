import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackGuard } from '../src/client/services/createBackGuard.ts';

/** A page with a history stack: back pops an entry and fires popstate, as a browser does a moment later. */
function fakePage() {
  const listeners = new Set<() => void>();
  const page = {
    entries: 1,
    history: {
      pushState() { page.entries += 1; },
      back() { page.entries -= 1; for (const listener of listeners) listener(); },
    },
    addEventListener(_type: 'popstate', listener: () => void) { listeners.add(listener); },
    removeEventListener(_type: 'popstate', listener: () => void) { listeners.delete(listener); },
  };
  return page;
}

test('back guard: in a game, a back gesture stays on the page', () => {
  const page = fakePage();
  const guard = createBackGuard(page);
  guard.hold();
  assert.equal(page.entries, 2);
  page.history.back();
  page.history.back();
  assert.equal(page.entries, 2, 'the guard puts its entry back each time');
});

test('back guard: back home, its entry goes and back leaves the site again', () => {
  const page = fakePage();
  const guard = createBackGuard(page);
  guard.hold();
  guard.hold();
  assert.equal(page.entries, 2, 'one entry, however often it is held');
  guard.release();
  assert.equal(page.entries, 1);
  guard.release();
  assert.equal(page.entries, 1, 'releasing twice takes nothing more');
  guard.hold();
  assert.equal(page.entries, 2, 'a new game holds again');
});
