import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CombatClock } from '../src/client/pixi/combatClock.ts';
import { candidateFaces } from '../src/client/tools/candidateFaces.ts';
import { screenFaces } from '../src/client/tools/screenFaces.ts';
import { screenPlacement } from '../src/client/tools/screenPlacement.ts';
import { combatEventGapMs } from '../src/client/tools/combatEventGapMs.ts';
import { compactStat } from '../src/client/tools/compactStat.ts';
import { deathKind } from '../src/client/tools/deathKind.ts';
import { deathPlayed } from '../src/client/tools/deathPlayed.ts';
import { elasticPop } from '../src/client/tools/elasticPop.ts';
import { hitStopSeconds } from '../src/client/tools/hitStopSeconds.ts';
import { hitTrauma } from '../src/client/tools/hitTrauma.ts';
import { hurryStep } from '../src/client/tools/hurryStep.ts';
import { isHurryKey } from '../src/client/tools/isHurryKey.ts';
import { planDeaths } from '../src/client/tools/planDeaths.ts';
import { releaseSpeech } from '../src/client/tools/releaseSpeech.ts';
import { shakeOffset } from '../src/client/tools/shakeOffset.ts';
import { shardPolygons } from '../src/client/tools/shardPolygons.ts';
import { signed } from '../src/client/tools/signed.ts';
import { smoothNoise } from '../src/client/tools/smoothNoise.ts';
import { claimSpeech, createMixerState } from '../src/client/tools/soundMixer.ts';
import { springStep } from '../src/client/tools/springStep.ts';
import { statFontScale } from '../src/client/tools/statFontScale.ts';
import { statsChangeLabel } from '../src/client/tools/statsChangeLabel.ts';
import type { CombatEvent, CombatUnit } from '../src/engine/types.ts';
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
  assert.ok(combatEventGapMs(RETURN_BLOW, DEATH) <= 200, 'the victim goes at once');
  assert.equal(combatEventGapMs(RETURN_BLOW, ATTACK), combatEventDuration(RETURN_BLOW));
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

test('the shake is smooth noise, squared trauma: nothing at rest, a lot at full trauma', () => {
  assert.equal(smoothNoise(3, 1), smoothNoise(3, 1));
  for (let t = 0; t < 20; t += 0.37) assert.ok(Math.abs(smoothNoise(t, 2)) <= 1);
  assert.ok(Math.abs(smoothNoise(4.5, 1) - smoothNoise(4.51, 1)) < 0.05, 'smooth, not a buzz');
  const still = shakeOffset(0, 1.3, 26, 0.03);
  assert.equal(Math.abs(still.x) + Math.abs(still.y) + Math.abs(still.rotation), 0);
  const samples = Array.from({ length: 50 }, (_, index) => shakeOffset(1, index * 0.05, 26, 0.03));
  assert.ok(samples.some((sample) => Math.abs(sample.x) > 8));
  assert.ok(samples.every((sample) => Math.abs(sample.x) <= 26 && Math.abs(sample.rotation) <= 0.03));
  const half = Array.from({ length: 50 }, (_, index) => shakeOffset(0.5, index * 0.05, 26, 0.03));
  assert.ok(Math.max(...half.map((sample) => Math.abs(sample.x))) <= 26 * 0.25 + 1e-9, 'squared');
});

test('a harder blow shakes more and freezes longer, within bounds', () => {
  assert.equal(hitTrauma(0.6), 0);
  assert.ok(hitTrauma(1.5) > hitTrauma(1.1));
  assert.ok(hitTrauma(2) <= 0.7);
  assert.ok(hitStopSeconds(0.6) >= 0.03 && hitStopSeconds(0.6) < hitStopSeconds(2));
  assert.ok(hitStopSeconds(5) <= 0.1);
});

test('a knocked medallion springs home with a little bounce, whatever the frame length', () => {
  let spring = { offset: 0, velocity: 500 };
  let overshoot = false;
  for (let index = 0; index < 120; index++) {
    spring = springStep(spring, 1 / 60, 420, 18);
    if (spring.offset < -0.5) overshoot = true;
  }
  assert.ok(overshoot, 'it bounces back past home');
  assert.ok(Math.abs(spring.offset) < 0.5, 'and settles');
  const long = springStep({ offset: 20, velocity: 0 }, 0.5, 420, 18);
  assert.ok(Math.abs(long.offset) < 20, 'a long frame never makes it explode');
});

test('a number pops past full size and settles', () => {
  assert.equal(elasticPop(0), 0);
  assert.equal(elasticPop(1), 1);
  assert.ok(Math.max(...Array.from({ length: 20 }, (_, index) => elasticPop(index / 20))) > 1.1);
  assert.ok(Math.abs(elasticPop(0.95) - 1) < 0.08);
});

test('the combat clock freezes on a blow and crawls in slow motion', () => {
  const clock = new CombatClock();
  assert.equal(clock.advance(0.016), 0.016);
  clock.freeze(0.05);
  assert.equal(clock.advance(0.03), 0);
  assert.ok(Math.abs(clock.advance(0.03) - 0.01) < 1e-9);
  clock.slowDown(0.25, 0.1);
  assert.ok(Math.abs(clock.advance(0.1) - 0.025) < 1e-9);
  assert.equal(clock.advance(0.02), 0.02);
});

const unit = (uid: number, extra: Partial<CombatUnit> = {}): CombatUnit => ({
  uid, cardId: 'x', name: 'X', camp: 'insoumis', tier: 1, atk: 1, hp: 3, keywords: [], golden: false, token: false, noAttack: false, casseroles: [], effects: [], bonus: 0, ...extra,
});

test('each death fits its blow and its politician', () => {
  assert.equal(deathKind(unit(1), { value: 3, before: 3 }, false), 'eject');
  assert.equal(deathKind(unit(1), { value: 6, before: 3 }, false), 'shatter');
  assert.equal(deathKind(unit(1), { value: 9, before: 1 }, false), 'explode');
  assert.equal(deathKind(unit(1), { value: 9, before: 5 }, false), 'shatter');
  assert.equal(deathKind(unit(1), { value: 1, before: 1 }, true), 'burn');
  assert.equal(deathKind(unit(1, { golden: true }), { value: 2, before: 2 }, false), 'gold');
  assert.equal(deathKind(unit(1, { keywords: ['vedette'] }), { value: 2, before: 2 }, false), 'tv-off');
  assert.equal(deathKind(unit(1, { token: true }), { value: 2, before: 2 }, false), 'pop');
  assert.equal(deathKind(unit(1), undefined, false), 'light');
});

test('asked for less motion, or without WebGL, the deaths stay gentle', () => {
  assert.equal(deathPlayed('eject', false, true), 'eject');
  assert.equal(deathPlayed('eject', true, true), 'light');
  assert.equal(deathPlayed('pop', true, true), 'light');
  assert.equal(deathPlayed('explode', true, true), 'shatter');
  assert.equal(deathPlayed('burn', true, true), 'burn');
  assert.equal(deathPlayed('burn', false, false), 'light');
  assert.equal(deathPlayed('tv-off', false, false), 'light');
  assert.equal(deathPlayed('gold', true, false), 'gold');
});

test('the last death of the beaten side is the finale; a comeback is not planned', () => {
  const log: CombatEvent[] = [
    { e: 'debut', first: 0, sides: [[unit(1, { atk: 9 })], [unit(2, { hp: 1 }), unit(3, { hp: 2, keywords: ['retour'] })]] },
    { e: 'attaque', from: 1, to: 2 },
    { e: 'degats', uid: 2, value: 9, hp: -8 },
    { e: 'mort', uid: 2, revient: false },
    { e: 'attaque', from: 1, to: 3 },
    { e: 'degats', uid: 3, value: 9, hp: -7 },
    { e: 'mort', uid: 3, revient: true },
    { e: 'retour', uid: 3, hp: 1 },
    { e: 'attaque', from: 1, to: 3 },
    { e: 'degats', uid: 3, value: 2, hp: -1 },
    { e: 'mort', uid: 3, revient: false },
    { e: 'fin', winner: 0, sides: [[unit(1)], []] },
  ];
  const plan = planDeaths(log);
  assert.deepEqual(plan.get(2), { kind: 'explode', finale: false });
  assert.deepEqual(plan.get(3), { kind: 'explode', finale: true });
  assert.equal(plan.size, 2);
});

test('no finale when nobody is wiped out', () => {
  const log: CombatEvent[] = [
    { e: 'debut', first: 0, sides: [[unit(1)], [unit(2), unit(3)]] },
    { e: 'degats', uid: 2, value: 1, hp: 2 },
    { e: 'fin', winner: null, sides: [[unit(1)], [unit(2), unit(3)]] },
  ];
  assert.equal(planDeaths(log).size, 0);
});

test('the set shows you, then the candidates still in the race, the best polled first', () => {
  const row = (seat: number, heroId: string | null, hp: number, alive = true) => ({ seat, heroId, hp, alive, tier: 1, boardSize: 0, place: 0, triples: 0 });
  const table = [row(0, 'macron', 20), row(1, 'le_pen', 12), row(2, 'melenchon', 30), row(3, 'zemmour', 0, false), row(4, null, 25)];
  assert.deepEqual(candidateFaces(table, 0), ['macron', 'melenchon', 'le_pen']);
  assert.deepEqual(screenFaces(['a', 'b', 'c'], 1, 0), ['a', 'b', 'c']);
  assert.deepEqual(screenFaces(['a', 'b', 'c'], 2, 1), ['b']);
  assert.deepEqual(screenFaces(['a'], 2, 1), ['a']);
});

test('a screen stays on its sign of the set, whatever the window', () => {
  const place = screenPlacement({ x: 1915, y: 268, width: 236, turn: -16 });
  assert.equal(place.left, 'calc(50% + 635 * var(--k))');
  assert.equal(place.top, 'calc(50% + -452 * var(--k))');
  assert.equal(place['--screen-width'], 'calc(236 * var(--k))');
  assert.equal(place['--turn'], '-16deg');
});

test('a medallion breaks into pieces that cover it all', () => {
  let seed = 3;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pieces = shardPolygons(150, 180, 6, random);
  assert.equal(pieces.length, 12);
  const area = (polygon: [number, number][]) => Math.abs(polygon.reduce((sum, [x, y], index) => {
    const [nx, ny] = polygon[(index + 1) % polygon.length];
    return sum + x * ny - nx * y;
  }, 0)) / 2;
  const total = pieces.reduce((sum, piece) => sum + area(piece), 0);
  assert.ok(Math.abs(total - 150 * 180) < 1, `the pieces cover the medallion (${total})`);
  assert.ok(pieces.every((piece) => piece.length >= 3 && piece.every(([x, y]) => x >= -1e-6 && x <= 150 + 1e-6 && y >= -1e-6 && y <= 180 + 1e-6)));
});
