import assert from 'node:assert/strict';
import { test } from 'node:test';
import { jawOpeningFromLevel } from './jaw_opening_from_level.js';

test('stays closed in silence', () => {
  assert.equal(jawOpeningFromLevel(0), 0);
});

test('has only three positions', () => {
  assert.equal(jawOpeningFromLevel(0.06), 0.55);
  assert.equal(jawOpeningFromLevel(0.5), 1);
});
