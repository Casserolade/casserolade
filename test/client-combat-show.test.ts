import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactStat } from '../src/client/tools/compactStat.ts';
import { signed } from '../src/client/tools/signed.ts';
import { statFontScale } from '../src/client/tools/statFontScale.ts';
import { statsChangeLabel } from '../src/client/tools/statsChangeLabel.ts';

test('a stat of 1 000 or more is written short, truncated and never rounded up', () => {
  assert.equal(compactStat(0), '0');
  assert.equal(compactStat(7), '7');
  assert.equal(compactStat(999), '999');
  assert.equal(compactStat(1000), '1k');
  assert.equal(compactStat(1099), '1k');
  assert.equal(compactStat(1250), '1,2k');
  assert.equal(compactStat(1299), '1,2k');
  assert.equal(compactStat(3000), '3k');
  assert.equal(compactStat(9999), '9,9k');
  assert.equal(compactStat(12_345), '12k');
  assert.equal(compactStat(999_999), '999k');
  assert.equal(compactStat(1_000_000), '1M');
  assert.equal(compactStat(1_500_000), '1,5M');
  assert.equal(compactStat(42_000_000), '42M');
  assert.equal(compactStat(2_300_000_000), '2,3Md');
});

test('a negative or broken stat stays readable', () => {
  assert.equal(compactStat(-1250), '−1,2k');
  assert.equal(compactStat(-4), '−4');
  assert.equal(compactStat(-0.4), '0');
  assert.equal(compactStat(Number.NaN), '0');
  assert.equal(compactStat(12.9), '12');
});

test('three signs keep the full size in a badge, a longer number shrinks', () => {
  assert.equal(statFontScale('7'), 1);
  assert.equal(statFontScale('999'), 1);
  assert.ok(statFontScale('1,2k') < 1);
  assert.ok(statFontScale('999k') < statFontScale('1,2k'));
  assert.ok(statFontScale('1,5Md') < statFontScale('999k'));
  assert.ok(statFontScale('1,5Md') > 0.6);
});

test('gains and labels use the short numbers too', () => {
  assert.equal(signed(1500), '+1,5k');
  assert.equal(signed(-3), '-3');
  assert.equal(signed(-2400), '-2,4k');
  assert.equal(signed(0), '+0');
  assert.equal(statsChangeLabel(1000, 1000, 3000, 2500), '+2k/+1,5k');
});
