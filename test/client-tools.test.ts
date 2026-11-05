import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARD_LAYOUT } from '../src/client/const/cardLayout.ts';
import { EMPTY_MANIFEST } from '../src/client/const/gameManifest.ts';
import type { GameManifest } from '../src/client/const/gameManifest.ts';
import { RIG_LAYOUT } from '../src/client/const/rigLayout.ts';
import { campArtKey } from '../src/client/tools/campArtKey.ts';
import { cardFaceStyle } from '../src/client/tools/cardFaceStyle.ts';
import { combatCharacterIds } from '../src/client/tools/combatCharacterIds.ts';
import { combatLayout } from '../src/client/tools/combatLayout.ts';
import { MEDALLION_LAYOUT } from '../src/client/const/medallionLayout.ts';
import { cssImage } from '../src/client/tools/cssImage.ts';
import { fittedNameSize } from '../src/client/tools/fittedNameSize.ts';
import { orderWithCorpses } from '../src/client/tools/orderWithCorpses.ts';
import { heroQuotes } from '../src/client/tools/heroQuotes.ts';
import { nextQuote } from '../src/client/tools/nextQuote.ts';
import { healthTone } from '../src/client/tools/healthTone.ts';
import { sourceMatches } from '../src/client/tools/sourceMatches.ts';
import { pickOne } from '../src/client/tools/pickOne.ts';
import { chaseStep } from '../src/client/tools/chaseStep.ts';
import { chaseMood, RESTED } from '../src/client/tools/chaseMood.ts';
import { otherFaces } from '../src/client/tools/otherFaces.ts';
import type { FaceTextures } from '../src/client/pixi/loadCombatTextures.ts';
import { puppetStyle } from '../src/client/tools/puppetStyle.ts';
import { samplePose } from '../src/client/tools/samplePose.ts';
import { sheetSpriteStyle } from '../src/client/tools/sheetSpriteStyle.ts';
import { statsChangeLabel } from '../src/client/tools/statsChangeLabel.ts';
import { fittedRulesSize } from '../src/client/tools/fittedRulesSize.ts';
import { studioElements } from '../src/client/tools/studioElements.ts';
import { isInsideBox } from '../src/client/tools/isInsideBox.ts';
import { REST_DANGLE, stepDangle } from '../src/client/tools/stepDangle.ts';
import { claimVoice, createMixerState, MAX_VOICES, varySound } from '../src/client/tools/soundMixer.ts';
import { hitStrength } from '../src/client/tools/hitStrength.ts';
import { tripleStars } from '../src/client/tools/tripleStars.ts';
import type { CombatEvent, CombatUnit } from '../src/engine/types.ts';
import { describeCasserole } from '../src/client/tools/describeCasserole.ts';
import { describeEffect } from '../src/client/tools/describeEffect.ts';
import { describeTripleProgress } from '../src/client/tools/describeTripleProgress.ts';
import { highlightForEvent } from '../src/client/tools/highlightForEvent.ts';
import { narrateCombatEvent } from '../src/client/tools/narrateCombatEvent.ts';
import { insertionIndex } from '../src/client/tools/insertionIndex.ts';
import { nearestSlotIndex } from '../src/client/tools/nearestSlotIndex.ts';
import { previewCombatBonuses } from '../src/client/tools/previewCombatBonuses.ts';
import { slotOffset } from '../src/client/tools/slotOffset.ts';
import { reorderAroundLocked } from '../src/engine/reorderAroundLocked.ts';
import { seenBoardSummary } from '../src/client/tools/seenBoardSummary.ts';
import { signed } from '../src/client/tools/signed.ts';
import { summarizeCombatOutcome } from '../src/client/tools/summarizeCombatOutcome.ts';
import { toCardProps } from '../src/client/tools/toCardProps.ts';
import { CARDS } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import { applyAction, combatViewFor, createGame, finishRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { CombatView } from '../src/engine/game.ts';
import { applyCombatEvent } from '../src/engine/replay.ts';
import type { CombatSides } from '../src/engine/replay.ts';
import { makeMinion, tripleCopies } from '../src/engine/minion.ts';
import { createRng } from '../src/engine/rng.ts';

const BROKEN_TEXT = /undefined|null|NaN|\[object/;

test('signed writes the sign of a value', () => {
  assert.equal(signed(2), '+2');
  assert.equal(signed(0), '+0');
  assert.equal(signed(-1), '-1');
});

test('every effect of every card and casserole has a readable text', () => {
  const effects = [...CARDS.flatMap((c) => c.effects ?? []), ...CASSEROLES.flatMap((c) => c.effects ?? [])];
  assert.ok(effects.length > 0);
  for (const effect of effects) assert.doesNotMatch(describeEffect(effect), BROKEN_TEXT, JSON.stringify(effect));
});

test('every casserole has at least one rule line, without a hole in the text', () => {
  for (const casserole of CASSEROLES) {
    const lines = describeCasserole(casserole);
    assert.ok(lines.length > 0, `${casserole.id} has no rule text`);
    for (const line of lines) assert.doesNotMatch(line, BROKEN_TEXT, casserole.id);
  }
});

test('highlightForEvent marks both sides of an attack and nothing without an event', () => {
  assert.equal(highlightForEvent(null).size, 0);
  const attack = highlightForEvent({ e: 'attaque', from: 1, to: 2 });
  assert.equal(attack.get(1), 'attacking');
  assert.equal(attack.get(2), 'hit');
  assert.equal(highlightForEvent({ e: 'mort', uid: 3, revient: false }).get(3), 'dead');
});

test('toCardProps drops what the card does not display', () => {
  const props = toCardProps(makeMinion(CARDS[0], 12));
  assert.equal(props.name, CARDS[0].name);
  assert.ok(!('uid' in props));
  assert.ok(!('budgetPerRound' in props));
});

test('seenBoardSummary lists the board, or says it is empty', () => {
  assert.equal(seenBoardSummary({ seat: 1, heroId: 'attal', round: 3, board: [] }), 'plateau vide');
  const minion = makeMinion(CARDS[0], 1);
  assert.equal(seenBoardSummary({ seat: 1, heroId: 'attal', round: 3, board: [minion] }), `${minion.name} ${minion.atk}/${minion.hp}`);
});

test('summarizeCombatOutcome speaks from the player\'s side', () => {
  const base = { round: 1, opponent: { seat: 1, heroId: 'attal' }, log: [], endOfTurn: [] } satisfies Partial<CombatView>;
  assert.match(summarizeCombatOutcome({ ...base, side: 1, winner: 1, damage: [6, 0] }), /Gagné.*6 points/);
  assert.match(summarizeCombatOutcome({ ...base, side: 0, winner: 1, damage: [1, 0] }), /Perdu.*1 point de sondage/);
  assert.match(summarizeCombatOutcome({ ...base, side: 0, winner: null, damage: [0, 0] }), /Égalité/);
  assert.match(summarizeCombatOutcome({ ...base, side: 0, winner: null, damage: [2, 0] }), /vous perdez 2 points/);
});

function playedGame(seed: number) {
  const game = createGame({ seed, combatLog: true });
  const policy = createRng(seed);
  for (const p of game.players) {
    for (let i = 0; i < 4; i++) {
      const view = viewFor(game, p.seat);
      if (view.shop.length) applyAction(game, p.seat, { t: 'buy', slot: policy.int(view.shop.length) });
    }
  }
  return game;
}

test('the Alliance shown during recruitment is the one the combat applies', () => {
  let compared = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const game = playedGame(seed);
    for (let round = 0; round < 6 && game.phase === 'recrutement'; round++) {
      const previews = game.players.map((p) => (p.alive ? previewCombatBonuses(viewFor(game, p.seat).board) : []));
      const boards = game.players.map((p) => p.board.map((m) => m.uid));
      startCombats(game);
      for (const p of game.players) {
        const combat = combatViewFor(game, p.seat);
        const opening = combat?.log[0];
        if (!combat || opening?.e !== 'debut') continue;
        const units = opening.sides[combat.side];
        assert.deepEqual(units.map((u) => u.uid), boards[p.seat]);
        assert.deepEqual(units.map((u) => u.bonus), previews[p.seat], `seed ${seed}, seat ${p.seat}`);
        compared++;
      }
      finishRound(game);
    }
  }
  assert.ok(compared > 200);
});

test('every event of real combats narrates without a hole in the text', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const game = playedGame(seed);
    startCombats(game);
    for (const { result } of game.roundCombats) {
      let sides: CombatSides = [[], []];
      for (const event of result.log) {
        assert.doesNotMatch(narrateCombatEvent(event, sides), BROKEN_TEXT, JSON.stringify(event));
        sides = applyCombatEvent(sides, event);
      }
    }
  }
});

const ROW = [0, 1, 2, 3].map((i) => ({ left: i * 100, top: 0, width: 90, height: 150 }));

test('reorderAroundLocked moves an item and shifts the others', () => {
  const never = () => false;
  assert.deepEqual(reorderAroundLocked(['a', 'b', 'c', 'd'], 0, 2, never), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorderAroundLocked(['a', 'b', 'c', 'd'], 3, 0, never), ['d', 'a', 'b', 'c']);
  assert.deepEqual(reorderAroundLocked(['a', 'b', 'c'], 1, 1, never), ['a', 'b', 'c']);
  assert.equal(reorderAroundLocked(['a'], 0, 4, never), null);
});

test('reorderAroundLocked leaves locked items in place, and refuses to move or land on them', () => {
  const locked = (item: string) => item === 'L';
  assert.deepEqual(reorderAroundLocked(['a', 'L', 'b', 'c'], 0, 3, locked), ['b', 'L', 'c', 'a']);
  assert.deepEqual(reorderAroundLocked(['a', 'b', 'L', 'c'], 3, 0, locked), ['c', 'a', 'L', 'b']);
  assert.equal(reorderAroundLocked(['a', 'L'], 0, 1, locked), null);
  assert.equal(reorderAroundLocked(['L', 'a'], 0, 1, locked), null);
});

test('nearestSlotIndex finds the slot under a card, on one row or several', () => {
  const available = [0, 1, 2, 3];
  assert.equal(nearestSlotIndex(ROW, available, { x: 45, y: 75 }), 0);
  assert.equal(nearestSlotIndex(ROW, available, { x: 260, y: 75 }), 2);
  assert.equal(nearestSlotIndex(ROW, available, { x: 9999, y: 75 }), 3);
  assert.equal(nearestSlotIndex(ROW, [0, 1, 3], { x: 245, y: 75 }), 1, 'a locked slot is not a target');
  const wrapped = [ROW[0], ROW[1], { left: 0, top: 200, width: 90, height: 150 }];
  assert.equal(nearestSlotIndex(wrapped, [0, 1, 2], { x: 45, y: 270 }), 2);
});

test('slotOffset gives the shift from one slot to another', () => {
  assert.deepEqual(slotOffset(ROW[0], ROW[2]), { x: 200, y: 0 });
  assert.deepEqual(slotOffset(ROW[1], ROW[1]), { x: 0, y: 0 });
});

test('describeTripleProgress says how close a card is to a triple', () => {
  assert.match(describeTripleProgress(1), /1\/3/);
  assert.match(describeTripleProgress(2), /[Tt]riple/);
});

test('tripleCopies ignores golden minions and tokens', () => {
  const card = CARDS[0];
  const plain = makeMinion(card, 1);
  const golden = { ...makeMinion(card, 2), golden: true };
  const token = { ...makeMinion(card, 3), token: true };
  const other = makeMinion(CARDS[1], 4);
  assert.deepEqual(tripleCopies([plain, golden, token, other], card.id), [plain]);
});

test('buying the third copy makes a golden minion with doubled stats, and playing it gives an Investiture', () => {
  const game = createGame({ seed: 3, heroes: Array(8).fill('attal') });
  const card = CARDS.find((c) => c.id === 'thevenoud') as (typeof CARDS)[number];
  const player = game.players[0];
  player.board = [makeMinion(card, 9001), makeMinion(card, 9002)];
  player.shop = [card.id];
  player.budget = 10;
  assert.deepEqual(applyAction(game, 0, { t: 'buy', slot: 0 }), { ok: true });
  const inHand = viewFor(game, 0);
  assert.equal(inHand.board.length, 0);
  assert.equal(inHand.hand[0].golden, true);
  assert.deepEqual(applyAction(game, 0, { t: 'play', uid: inHand.hand[0].uid }), { ok: true });
  const view = viewFor(game, 0);
  assert.equal(view.board[0].golden, true);
  assert.equal(view.board[0].atk, card.atk * 2);
  assert.equal(view.board[0].hp, card.hp * 2);
  const investiture = view.spells.find((s) => s.spellId === 'investiture');
  assert.equal(investiture?.tier, 2);
  assert.deepEqual(applyAction(game, 0, { t: 'cast', uid: investiture!.uid }), { ok: true });
  const choice = viewFor(game, 0);
  assert.equal(choice.discover?.length, 3);
  for (const id of choice.discover ?? []) assert.equal(CARDS.find((c) => c.id === id)?.tier, 2);
});

test('insertionIndex lands before or after the nearest card', () => {
  assert.equal(insertionIndex([], { x: 10, y: 10 }), 0);
  assert.equal(insertionIndex(ROW, { x: 20, y: 75 }), 0);
  assert.equal(insertionIndex(ROW, { x: 70, y: 75 }), 1);
  assert.equal(insertionIndex(ROW, { x: 160, y: 75 }), 2);
  assert.equal(insertionIndex(ROW, { x: 9999, y: 75 }), 4);
});


test('fittedNameSize shrinks long names only', () => {
  assert.equal(fittedNameSize('Jean Tiberi'), 46);
  assert.ok(fittedNameSize('Jean-Luc Mélenchon le très long') < 46);
});

test('campArtKey follows the manifest for the civil society camp', () => {
  assert.equal(campArtKey('civile'), 'societe_civile');
  assert.equal(campArtKey('rn'), 'rn');
});

test('cssImage leaves a missing asset empty', () => {
  assert.equal(cssImage(undefined), 'none');
  assert.equal(cssImage('carte/pv.webp'), 'url("/carte/pv.webp")');
});

const ART_MANIFEST: GameManifest = {
  ...EMPTY_MANIFEST,
  camps: { societe_civile: { nom: 'Société civile', couleur: '#8c8574' } },
  corps: { societe_civile: 'corps/civile.webp' },
  carte: { cadres: { 1: 'carte/cadre_1.webp', dore: 'carte/cadre_dore.webp' } },
  personnages: {
    tiberi: {
      atlas: 'personnages/tiberi.webp',
      pieces: { tete: { x: 0, y: 0, w: 100, h: 200 }, machoire: { x: 104, y: 0, w: 96, h: 50, pose: [10, 150], pivot: [50, 5] } },
      ancres: { oeil_g: [30, 60, 20], oeil_d: [70, 60, 20], bouche: [50, 150], menton: [50, 190] },
    },
  },
};

test('cardFaceStyle takes the frame of the tier, or the golden one, and the camp color', () => {
  assert.equal(cardFaceStyle(ART_MANIFEST, 'civile', 1, false)['--frame-image'], 'url("/carte/cadre_1.webp")');
  assert.equal(cardFaceStyle(ART_MANIFEST, 'civile', 1, true)['--frame-image'], 'url("/carte/cadre_dore.webp")');
  assert.equal(cardFaceStyle(ART_MANIFEST, 'civile', 1, false)['--camp-color'], '#8c8574');
  assert.equal(cardFaceStyle(EMPTY_MANIFEST, 'rn', 3, false)['--frame-image'], 'none');
  assert.equal(cardFaceStyle(EMPTY_MANIFEST, 'rn', 3, false)['--camp-color'], 'var(--camp-rn)');
});

test('puppetStyle puts the chin on the neck, as the rig does', () => {
  const style = puppetStyle(ART_MANIFEST, 'tiberi', 'civile');
  const neckY = CARD_LAYOUT.feetY - RIG_LAYOUT.bodyHeight * RIG_LAYOUT.bodyScale + RIG_LAYOUT.neckOverlap;
  assert.equal(Number(style['--head-top']) + 190 * RIG_LAYOUT.headScale, neckY);
  assert.equal(Number(style['--head-left']) + 50 * RIG_LAYOUT.headScale, CARD_LAYOUT.feetX);
  assert.equal(Number(style['--atlas-width']), 200 * RIG_LAYOUT.headScale);
});

test('puppetStyle wears another face when the character has it, and its own face otherwise', () => {
  const own = ART_MANIFEST.personnages.tiberi;
  const shocked = { ...own, atlas: 'personnages/tiberi.choc.webp', ancres: { ...own.ancres, menton: [50, 170] as [number, number] } };
  const manifest: GameManifest = { ...ART_MANIFEST, personnages: { tiberi: { ...own, visages: { choc: shocked } } } };
  assert.equal(puppetStyle(manifest, 'tiberi', 'civile', 'choc')['--atlas-image'], 'url("/personnages/tiberi.choc.webp")');
  assert.equal(puppetStyle(manifest, 'tiberi', 'civile', 'rire')['--atlas-image'], puppetStyle(manifest, 'tiberi', 'civile')['--atlas-image']);
  assert.notEqual(puppetStyle(manifest, 'tiberi', 'civile', 'choc')['--head-top'], puppetStyle(manifest, 'tiberi', 'civile')['--head-top']);
});

test('puppetStyle without a photo gives a body and no head', () => {
  const style = puppetStyle(ART_MANIFEST, 'suppleant', 'civile');
  assert.equal(style['--atlas-image'], undefined);
  assert.equal(style['--body-image'], 'url("/corps/civile.webp")');
});

test('samplePose snaps to the frame rate and holds the last keyframe', () => {
  const animation = { duration: 1, keyframes: [{ at: 0, x: 0 }, { at: 1, x: 12 }] };
  assert.equal(samplePose(animation, 0.5, 12).x, 6);
  assert.equal(samplePose(animation, 0.51, 12).x, 6);
  assert.equal(samplePose(animation, 5, 12).x, 12);
  assert.equal(samplePose(animation, 0, 12).scaleX, 1);
});

test('combatLayout keeps every medallion on screen, enemies above', () => {
  for (const [width, height] of [[1920, 1080], [1366, 768], [1440, 900], [1280, 640]]) {
    const layout = combatLayout(width, height, 7, 3);
    const medallionWidth = MEDALLION_LAYOUT.width * layout.scale;
    const medallionHeight = MEDALLION_LAYOUT.height * layout.scale;
    assert.equal(layout.enemy.length, 7);
    assert.equal(layout.own.length, 3);
    for (const { x, y } of [...layout.enemy, ...layout.own]) {
      assert.ok(x >= 0 && x + medallionWidth <= width, `x=${x} at ${width}`);
      assert.ok(y >= 0 && y + medallionHeight <= height, `y=${y} at ${height}`);
    }
    assert.ok(layout.enemy[0].y + medallionHeight < layout.own[0].y);
    assert.ok(Math.abs(layout.own[1].x + medallionWidth / 2 - width / 2) < 1, 'a row is centered');
  }
});

test('orderWithCorpses leaves those being crushed where they fell', () => {
  assert.deepEqual(orderWithCorpses([1, 2, 3], [1, 3], new Set([2])), [1, 2, 3]);
  assert.deepEqual(orderWithCorpses([1, 2, 3], [1, 3], new Set()), [1, 3]);
  assert.deepEqual(orderWithCorpses([1, 2], [1, 2, 9], new Set()), [1, 2, 9]);
  assert.deepEqual(orderWithCorpses([1, 2, 3], [3], new Set([1, 2])), [1, 2, 3]);
});

test('tripleStars shows the progress toward a triple', () => {
  assert.equal(tripleStars(0), '☆☆☆');
  assert.equal(tripleStars(2), '★★☆');
  assert.equal(tripleStars(5), '★★★');
});

test('statsChangeLabel says what changed, or nothing', () => {
  assert.equal(statsChangeLabel(2, 3, 4, 3), '+2/+0');
  assert.equal(statsChangeLabel(2, 3, 1, 2), '-1/-1');
  assert.equal(statsChangeLabel(2, 3, 2, 3), null);
});

test('combatCharacterIds lists the units and those summoned later, once each', () => {
  const unit = (uid: number, cardId: string) => ({ uid, cardId, name: cardId, camp: 'rn', tier: 1, atk: 1, hp: 1, keywords: [], golden: false, token: false, noAttack: false, casseroles: [], effects: [], bonus: 0 }) as CombatUnit;
  const log: CombatEvent[] = [
    { e: 'debut', first: 0, sides: [[unit(1, 'a')], [unit(2, 'b'), unit(3, 'a')]] },
    { e: 'invocation', side: 0, index: 1, unit: unit(4, 'suppleant') },
  ];
  assert.deepEqual(combatCharacterIds(log), ['a', 'b', 'suppleant']);
});

test('sheetSpriteStyle keeps the cell proportions and plays once unless the effect loops', () => {
  const prison = { atlas: 'effets/prison.webp', cols: 6, rows: 4, cell: [384, 480] as [number, number], fps: 12 };
  const style = sheetSpriteStyle(prison, 512);
  assert.equal(Number(style['--sheet-height']), 640);
  assert.equal(style['--sheet-row-seconds'], '0.5s');
  assert.equal(style['--sheet-total-seconds'], '2s');
  assert.equal(style['--sheet-repeat'], '1');
  assert.equal(style['--sheet-row-repeat'], '4');
  assert.equal(sheetSpriteStyle({ ...prison, boucle: true }, 512)['--sheet-repeat'], 'infinite');
});

test('fittedRulesSize keeps short rules large, and shrinks long or many lines', () => {
  assert.equal(fittedRulesSize(['Vedette.']), 42);
  const long = 'Célébration : vos 2 prochaines actualisations sont gratuites.';
  assert.ok(fittedRulesSize([long, long]) < fittedRulesSize([long]));
  assert.ok(fittedRulesSize(['a', 'b', 'c', 'd', 'e']) < fittedRulesSize(['a']), 'many short lines shrink too');
});

test('studioElements draws what the set asks for, the same way every time', () => {
  const look = { beams: 4, colors: ['#fff', '#000'], crowd: 6, flashes: 2 };
  const elements = studioElements(look);
  assert.equal(elements.beams.length, 4);
  assert.equal(elements.crowd.length, 6);
  assert.equal(elements.flashes.length, 2);
  assert.equal(elements.beams[1]['--beam-color'], '#000');
  assert.deepEqual(studioElements(look), elements);
});

test('stepDangle hangs behind the movement, then settles', () => {
  let state = REST_DANGLE;
  for (let i = 0; i < 30; i++) state = stepDangle(state, 800, 0, 1 / 60);
  assert.ok(state.angle < -5, `moving right tilts left, got ${state.angle}`);
  for (let i = 0; i < 300; i++) state = stepDangle(state, 0, 0, 1 / 60);
  assert.ok(Math.abs(state.angle) < 2, `settles, got ${state.angle}`);
});

test('stepDangle knocks out a shaken puppet, not a carried one', () => {
  let carried = REST_DANGLE;
  for (let i = 0; i < 120; i++) carried = stepDangle(carried, 900, 100, 1 / 60);
  assert.equal(carried.isShaken, false);
  let shaken = REST_DANGLE;
  for (let i = 0; i < 60; i++) shaken = stepDangle(shaken, i % 10 < 5 ? 1200 : -1200, 0, 1 / 60);
  assert.equal(shaken.isShaken, true);
  for (let i = 0; i < 300; i++) shaken = stepDangle(shaken, 0, 0, 1 / 60);
  assert.equal(shaken.isShaken, false);
});

test('the sound mixer never machine-guns the same sound, and caps the voices', () => {
  const state = createMixerState();
  assert.equal(claimVoice(state, 'hit', 1000, 150, 80), true);
  assert.equal(claimVoice(state, 'hit', 1050, 150, 80), false, 'too soon after the last hit');
  assert.equal(claimVoice(state, 'hit', 1081, 150, 80), true);
  assert.equal(claimVoice(state, 'clang', 1081, 150), true, 'another sound may ring meanwhile');
  const crowded = createMixerState();
  for (let index = 0; index < MAX_VOICES; index++) assert.equal(claimVoice(crowded, `s${index}`, 0, 500), true);
  assert.equal(claimVoice(crowded, 'one-more', 10, 500), false);
  assert.equal(claimVoice(crowded, 'one-more', 600, 500), true, 'the others have stopped ringing');
});

test('each sound varies a little, never much', () => {
  for (const [a, b] of [[0, 0], [0.5, 0.5], [0.999, 0.999]]) {
    const { pitch, gain } = varySound(a, b);
    assert.ok(pitch >= 0.93 && pitch <= 1.07, `pitch ${pitch}`);
    assert.ok(gain >= 0.87 && gain <= 1.13, `gain ${gain}`);
  }
  assert.deepEqual(varySound(0.5, 0.5), { pitch: 1, gain: 1 });
});

test('hitStrength grows with the damage and the knockout, within bounds', () => {
  assert.ok(hitStrength(1, 10) < hitStrength(6, 10));
  assert.ok(hitStrength(3, 3) > hitStrength(3, 10), 'a lethal blow hits harder');
  assert.equal(hitStrength(40, 5), 2);
  assert.ok(hitStrength(0, 5) >= 0.6);
});

test('isInsideBox includes the edges only', () => {
  const box = { left: 0, right: 10, top: 0, bottom: 10 };
  assert.equal(isInsideBox(box, { x: 10, y: 5 }), true);
  assert.equal(isInsideBox(box, { x: 11, y: 5 }), false);
});

test('la revente compte le budget des effets Vente, depuis le plateau seulement', async () => {
  const { sellGain } = await import('../src/client/tools/sellGain.ts');
  const { makeMinion, makeToken } = await import('../src/engine/minion.ts');
  const { CARD_BY_ID } = await import('../src/data/cards.ts');
  const { PARAMS } = await import('../src/data/params.ts');
  const assistant = makeToken('assistant_fictif', 'civile', 1);
  assert.deepEqual(sellGain(PARAMS, {}, assistant, true), { now: 2, later: 0 });
  assert.deepEqual(sellGain(PARAMS, {}, assistant, false), { now: 1, later: 0 });
  assert.deepEqual(sellGain(PARAMS, { sellBonus: 1 }, { ...assistant, golden: true }, true), { now: 4, later: 0 });
  assert.deepEqual(sellGain(PARAMS, {}, makeMinion(CARD_BY_ID.cahuzac, 2), true), { now: 1, later: 2 });
});

test('les gros gags ne tombent que sur les coups critiques, deux au plus par combat', async () => {
  const { pickCriticalKills } = await import('../src/client/tools/pickCriticalKills.ts');
  const unit = (uid: number, hp: number) => ({ uid, cardId: 'x', name: 'x', camp: 'civile', tier: 1, atk: 1, hp, keywords: [], golden: false, casseroles: [], effects: [], bonus: 0 }) as never;
  const debut = { e: 'debut', first: 0, sides: [[unit(1, 2), unit(2, 3), unit(3, 1)], [unit(4, 1), unit(5, 20)]] } as const;
  const log = [
    debut,
    { e: 'degats', uid: 1, value: 3, hp: -1 },
    { e: 'degats', uid: 2, value: 12, hp: -9 },
    { e: 'degats', uid: 3, value: 9, hp: -8 },
    { e: 'degats', uid: 4, value: 30, hp: -29 },
    { e: 'degats', uid: 5, value: 25, hp: -5 },
  ] as never;
  // 1 : trop peu de dégâts. 2, 3, 4 : critiques ; seuls les deux plus gros restent. 5 : pas trois fois ses PV.
  assert.deepEqual([...pickCriticalKills(log)].sort(), [2, 4]);
});

test('sur le plateau, seul le premier Droit de réponse répond', async () => {
  const { boardResponder } = await import('../src/client/tools/boardResponder.ts');
  const { makeMinion } = await import('../src/engine/minion.ts');
  const { CARD_BY_ID } = await import('../src/data/cards.ts');
  const board = ['bay', 'zemmour', 'philippot', 'ndiaye'].map((id, i) => makeMinion(CARD_BY_ID[id], i + 1));
  assert.equal(boardResponder(board), 3);
  assert.equal(boardResponder([board[0]]), null);
});

test('la boutique pleine de l\'échelon 6 se resserre sur une ligne, la boutique ordinaire garde sa taille', async () => {
  const { shopFit } = await import('../src/client/tools/shopFit.ts');
  assert.equal(shopFit(3, 1), 1);
  assert.equal(shopFit(5, 1), 1);
  assert.ok(shopFit(5, 2) > 0.99);
  const full = shopFit(6, 2);
  assert.ok(full < 1 && full > 0.8, `facteur ${full}`);
  assert.ok((6 * 150 + 2 * 150 + 7 * 30) * full <= 1228 + 1e-9);
  assert.equal(shopFit(0, 0), 1);
});

test('la Fin de tour dit ce qu\'un effet a touché, ou qu\'il n\'avait rien à faire', async () => {
  const { endOfTurnNoteLabel } = await import('../src/client/tools/endOfTurnNoteLabel.ts');
  assert.equal(endOfTurnNoteLabel([], { idle: true, fromHero: false }), 'Rien à faire');
  assert.equal(endOfTurnNoteLabel([], { idle: false, fromHero: false }), null);
  assert.equal(endOfTurnNoteLabel(['boutique'], { idle: false, fromHero: false }), 'Boutique améliorée');
  assert.equal(endOfTurnNoteLabel([], { idle: false, fromHero: true }), 'Pouvoir du héros');
  assert.equal(endOfTurnNoteLabel(['main', 'tracts'], { idle: false, fromHero: false }), 'Main renforcée · Tracts améliorés');
});

test('la table se coupe en trois bandes : la boutique au-dessus de la ligne du comptoir, puis le plateau, puis la main', async () => {
  const { zoneForTableY } = await import('../src/client/tools/zoneForTableY.ts');
  const { DROP_ZONES } = await import('../src/client/const/dropZones.ts');
  assert.equal(zoneForTableY(0), 'shop', 'le pupitre de l\'animateur et les coins du haut vendent aussi');
  assert.equal(zoneForTableY(DROP_ZONES.counterY - 1), 'shop');
  assert.equal(zoneForTableY(DROP_ZONES.counterY), 'board');
  assert.equal(zoneForTableY(800), 'board', 'la bande sous le plateau pose encore');
  assert.equal(zoneForTableY(DROP_ZONES.handY), 'hand');
  assert.equal(zoneForTableY(1079), 'hand');
});

test('la ligne du comptoir dit ce que fait le lâcher : acheter, vendre, ou pourquoi ça ne passerait pas', async () => {
  const { dropGuideFor } = await import('../src/client/tools/dropGuideFor.ts');
  const { dropGuideLabel } = await import('../src/client/tools/dropGuideLabel.ts');
  const { makeMinion } = await import('../src/engine/minion.ts');
  const { CARD_BY_ID } = await import('../src/data/cards.ts');
  const { PARAMS } = await import('../src/data/params.ts');
  const minion = makeMinion(CARD_BY_ID.thevenoud, 7);
  const view = { buyCost: 3, budget: 5, hand: [], spells: [], handLimit: 10, params: PARAMS, mods: {}, shopSpellCosts: [], casseroleCost: null } as never;
  const fromShop = (zone: 'shop' | 'board' | 'hand') => ({ item: { from: 'shop', slot: 0, minion }, point: { x: 0, y: 0 }, aim: { zone, index: 0, uid: null } }) as never;
  assert.equal(dropGuideFor(null, view), null);
  assert.deepEqual(dropGuideFor(fromShop('shop'), view), { mode: 'buy', armed: false, amount: 3, blocked: null });
  assert.equal(dropGuideFor(fromShop('board'), view)?.armed, true);
  assert.equal(dropGuideFor(fromShop('hand'), view)?.armed, true);
  const poor = dropGuideFor(fromShop('board'), { ...(view as object), budget: 2 } as never);
  assert.equal(poor?.blocked, 'budget');
  assert.equal(dropGuideLabel(poor as never), 'Trop cher');
  const full = dropGuideFor(fromShop('board'), { ...(view as object), hand: Array(10).fill(minion) } as never);
  assert.equal(full?.blocked, 'hand');
  assert.equal(dropGuideLabel(full as never), 'Main pleine');
  const fromBoard = { item: { from: 'board', minion, index: 0 }, point: { x: 0, y: 0 }, aim: { zone: 'shop', index: 0, uid: null } } as never;
  const sell = dropGuideFor(fromBoard, view);
  assert.deepEqual(sell, { mode: 'sell', armed: true, amount: PARAMS.sellValue, blocked: null });
  assert.equal(dropGuideLabel(sell as never), 'Vendre');
});

test('a character wears only the other faces that have both their anchors and their images', () => {
  const face = { atlas: 'personnages/x.rire.webp', pieces: { tete: { x: 0, y: 0, w: 1, h: 1 }, machoire: { x: 0, y: 0, w: 1, h: 1, pose: [0, 0], pivot: [0, 0] } },
    ancres: { oeil_g: [0, 0, 1], oeil_d: [0, 0, 1], bouche: [0, 0], menton: [0, 0] } } as NonNullable<GameManifest['personnages'][string]['visages']>[string];
  const art = { ...face, atlas: 'personnages/x.webp', visages: { rire: face, aie: face } };
  const images = { head: 'head', jaw: 'jaw' } as unknown as FaceTextures;
  const faces = otherFaces(art, { rire: images, colere: images });
  assert.deepEqual(Object.keys(faces), ['rire']);
  assert.equal(faces.rire.art, face);
  assert.deepEqual(otherFaces(undefined, { rire: images }), {});
});

test('nextQuote draws another line, never the one just shown when there is a choice', () => {
  const lines = ['A', 'B', 'C'];
  for (const roll of [0, 0.4, 0.99]) assert.notEqual(nextQuote(lines, 'B', roll), 'B');
  assert.equal(nextQuote(['Seule'], 'Seule', 0.5), 'Seule');
  assert.equal(nextQuote([], null, 0.5), null);
  assert.deepEqual(new Set([0, 0.5, 0.99].map((roll) => nextQuote(lines, null, roll))), new Set(lines));
});

test('heroQuotes gives a hero several real lines to say, none too long for the selection screen', () => {
  const quotes = heroQuotes('melenchon');
  assert.ok(quotes.length > 1);
  assert.ok(quotes.every((line) => line.length <= 110));
  assert.equal(new Set(quotes).size, quotes.length);
});

test('healthTone: wounded below its highest health of the combat is red, even above the card\'s own value', () => {
  assert.equal(healthTone('up', 6, 8), 'down');
  assert.equal(healthTone('up', 8, 8), 'up');
  assert.equal(healthTone('base', 3, 3), 'base');
  assert.equal(healthTone('down', 1, 3), 'down');
});

test('sourceMatches finds every word of the search, in any order, without accents', () => {
  const line = 'Valérie Pécresse : « Les sondages, ça va et vient » (2022)';
  assert.ok(sourceMatches(line, 'pecresse sondages'));
  assert.ok(sourceMatches(line, 'SONDAGES   Pécresse'));
  assert.ok(sourceMatches(line, ''));
  assert.ok(!sourceMatches(line, 'pecresse homards'));
});

test('pickOne chooses by its roll, every item reachable, none from an empty list', () => {
  assert.equal(pickOne(['a', 'b', 'c'], 0), 'a');
  assert.equal(pickOne(['a', 'b', 'c'], 0.5), 'b');
  assert.equal(pickOne(['a', 'b', 'c'], 0.999), 'c');
  assert.equal(pickOne([], 0.5), null);
});

test('chaseStep runs toward the target, faster the further it is, faces its way, never overshoots, and stops when close', () => {
  const start = { x: 0, y: 0, facing: 1, running: false, speed: 0 };
  const near = chaseStep(start, { x: -200, y: 0 }, 0.1);
  const far = chaseStep(start, { x: -2000, y: 0 }, 0.1);
  assert.ok(near.running && near.x < 0, 'runs left');
  assert.equal(near.facing, -1, 'faces left');
  assert.ok(far.x < near.x && far.speed > near.speed, 'it sprints when far behind');
  assert.ok(chaseStep(start, { x: 300, y: 0 }, 10).x < 300, 'never past the target');
  const close = chaseStep({ ...start, x: 290 }, { x: 300, y: 0 }, 0.1);
  assert.equal(close.running, false);
  assert.equal(close.x, 290);
  // No stop-and-go with the mouse close by: standing, it waits for a real gap before setting off.
  assert.equal(chaseStep({ ...start, x: 240 }, { x: 300, y: 0 }, 0.1).running, false, 'standing, 60 px away: it waits');
  assert.equal(chaseStep({ ...start, x: 240, running: true }, { x: 300, y: 0 }, 0.1).running, true, 'running, 60 px away: it goes on');
  assert.equal(chaseStep({ ...start, facing: 1 }, { x: -10, y: 300 }, 0.1).facing, 1, 'a few pixels sideways: no turning round');
});

test('chaseMood: it sweats after a long run, flops down when it stops, and sits when bored', () => {
  let mood = RESTED;
  mood = chaseMood(mood, true, 0.5);
  assert.equal(mood.sweating, false);
  mood = chaseMood(mood, true, 0.7);
  assert.equal(mood.sweating, false, 'a second and a bit: not yet');
  mood = chaseMood(mood, true, 0.6);
  assert.equal(mood.sweating, true, 'a long run: sweat');
  mood = chaseMood(mood, false, 0.05);
  assert.equal(mood.sitting, true, 'pouf, it sits');
  assert.equal(chaseMood(mood, true, 0.05).sitting, false, 'up again to run');
  const short = chaseMood(chaseMood(RESTED, true, 0.5), false, 0.05);
  assert.equal(short.sitting, false, 'a short dash: it stays up');
  assert.equal(chaseMood(short, false, 5).sitting, true, 'bored: it sits');
});

test('mixColor mixes like CSS color-mix in srgb', async () => {
  const { mixColor } = await import('../src/client/tools/mixColor.ts');
  assert.equal(mixColor('#ffffff', '#000000', 0.5), '#808080');
  assert.equal(mixColor('#2f6fd0', '#ffffff', 1), '#2f6fd0');
  assert.equal(mixColor('#2f6fd0', '#000000', 0), '#000000');
});

test('nearestInsertion: a card dropped on a nailed politician lands at the nearest free place', async () => {
  const { nearestInsertion } = await import('../src/client/tools/nearestInsertion.ts');
  const { insertAroundLocked } = await import('../src/engine/reorderAroundLocked.ts');
  const board = [{ locked: false }, { locked: true }, { locked: false }];
  const locked = (m: { locked: boolean }) => m.locked;
  assert.equal(nearestInsertion(board, 0, locked), 0);
  assert.equal(nearestInsertion(board, 1, locked), 2, 'past the nailed one');
  assert.equal(nearestInsertion(board, 3, locked), 3, 'the end is always free');
  for (let index = 0; index <= board.length; index++) {
    assert.ok(insertAroundLocked(board, { locked: false }, nearestInsertion(board, index, locked), locked), `index ${index} accepted by the engine`);
  }
});

test('dropGuideLabel says when the board is full, and how many places it has', async () => {
  const { dropGuideLabel } = await import('../src/client/tools/dropGuideLabel.ts');
  assert.equal(dropGuideLabel({ mode: 'play', armed: true, amount: 0, blocked: 'board', places: 6 }), 'Plateau plein : 6 places');
  assert.equal(dropGuideLabel({ mode: 'sell', armed: true, amount: 1, blocked: 'bracelet' }), 'Sous bracelet');
});
