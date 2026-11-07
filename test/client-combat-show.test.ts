import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combatEventGapMs } from '../src/client/tools/combatEventGapMs.ts';
import { compactStat } from '../src/client/tools/compactStat.ts';
import { hurryStep } from '../src/client/tools/hurryStep.ts';
import { isHurryKey } from '../src/client/tools/isHurryKey.ts';
import { releaseSpeech } from '../src/client/tools/releaseSpeech.ts';
import { signed } from '../src/client/tools/signed.ts';
import { claimSpeech, createMixerState } from '../src/client/tools/soundMixer.ts';
import { statFontScale } from '../src/client/tools/statFontScale.ts';
import { statsChangeLabel } from '../src/client/tools/statsChangeLabel.ts';
import type { CombatEvent } from '../src/engine/types.ts';
import { combatEventDuration } from '../src/protocol/combatDuration.ts';
import { endOfTurnDurationMs } from '../src/protocol/endOfTurnDuration.ts';

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

const ATTACK: CombatEvent = { e: 'attaque', from: 1, to: 2 };
const BLOW: CombatEvent = { e: 'degats', uid: 2, value: 3, hp: 1 };
const RETURN_BLOW: CombatEvent = { e: 'degats', uid: 1, value: 2, hp: 0 };
const DEATH: CombatEvent = { e: 'mort', uid: 1, revient: false };

test('an attack lasts until its lunge lands, and the two blows of an exchange land together', () => {
  assert.ok(combatEventDuration(ATTACK) <= 260, 'the blow lands at the contact');
  assert.ok(combatEventGapMs(BLOW, RETURN_BLOW) <= 100);
  assert.equal(combatEventGapMs(RETURN_BLOW, DEATH), combatEventDuration(RETURN_BLOW));
  assert.ok(combatEventGapMs(DEATH, { e: 'mort', uid: 2, revient: false }) < combatEventDuration(DEATH));
  assert.equal(combatEventGapMs(DEATH, undefined), combatEventDuration(DEATH));
});

test('the client never plays an event longer than the server counts on', () => {
  const events: CombatEvent[] = [ATTACK, BLOW, RETURN_BLOW, DEATH, { e: 'mort', uid: 2, revient: false }, { e: 'immunite', uid: 3 }, { e: 'polemique', uid: 3, from: 1 }];
  events.forEach((event, index) => assert.ok(combatEventGapMs(event, events[index + 1]) <= combatEventDuration(event)));
});

test('the end of turn stays short however many effects play', () => {
  const step = { source: 1, changes: [], notes: [] };
  assert.equal(endOfTurnDurationMs([]), 0);
  assert.ok(endOfTurnDurationMs(Array.from({ length: 40 }, () => step)) <= 5000);
});

test('a tap hurries the combat one notch at a time', () => {
  const moment = { finished: false, speaking: false, resultShown: false, closed: false, speed: 1, fastest: 4 };
  assert.equal(hurryStep(moment), 'speed-up');
  assert.equal(hurryStep({ ...moment, speed: 4 }), 'skip-fight');
  assert.equal(hurryStep({ ...moment, speaking: true }), 'end-speech');
  assert.equal(hurryStep({ ...moment, finished: true, speaking: true }), 'end-speech');
  assert.equal(hurryStep({ ...moment, finished: true }), 'show-result');
  assert.equal(hurryStep({ ...moment, finished: true, resultShown: true }), 'close');
  assert.equal(hurryStep({ ...moment, finished: true, resultShown: true, closed: true }), null);
});

test('space, enter and the right arrow hurry; other keys keep their own use', () => {
  assert.ok(isHurryKey(' '));
  assert.ok(isHurryKey('Enter'));
  assert.ok(isHurryKey('ArrowRight'));
  assert.ok(!isHurryKey('ArrowLeft'));
  assert.ok(!isHurryKey('Delete'));
  assert.ok(!isHurryKey('a'));
});

test('a voice cut short frees the floor for the next one', () => {
  const mixer = createMixerState();
  assert.ok(claimSpeech(mixer, 1000, 5000));
  assert.ok(!claimSpeech(mixer, 2000, 1000));
  releaseSpeech(mixer, 2000);
  assert.ok(claimSpeech(mixer, 2100, 1000));
});
