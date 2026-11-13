import test from 'node:test';
import assert from 'node:assert/strict';
import { pollsLabel } from '../src/client/tools/pollsLabel.ts';

test('pollsLabel : les sondages, et le socle électoral tant qu\'il en reste', () => {
  assert.equal(pollsLabel(38, 30), '30 sondages, 8 de socle électoral');
  assert.equal(pollsLabel(30, 30), '30 sondages');
  assert.equal(pollsLabel(12, 30), '12 sondages');
  assert.equal(pollsLabel(1, 30), '1 sondage');
  assert.equal(pollsLabel(-4, 30), '0 sondage');
});
