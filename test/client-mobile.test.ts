import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardMinionShown } from '../src/client/tools/boardMinionShown.ts';
import { buyAction } from '../src/client/tools/buyAction.ts';
import { cardSheetFor } from '../src/client/tools/cardSheetFor.ts';
import { discoverCards } from '../src/client/tools/discoverCards.ts';
import { handCardShown } from '../src/client/tools/handCardShown.ts';
import { portraitCombatLayout } from '../src/client/tools/portraitCombatLayout.ts';
import { prefersPhoneVersion } from '../src/client/tools/prefersPhoneVersion.ts';
import { refreshedItem } from '../src/client/tools/refreshedItem.ts';
import { sellAction } from '../src/client/tools/sellAction.ts';
import { wornCasseroles } from '../src/client/tools/wornCasseroles.ts';
import { zoneAroundBand } from '../src/client/tools/zoneAroundBand.ts';
import { MEDALLION_LAYOUT } from '../src/client/const/medallionLayout.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { SPELL_BY_ID } from '../src/data/sorts.ts';
import { createGame, viewFor } from '../src/engine/game.ts';
import type { PlayerView } from '../src/engine/game.ts';
import { makeMinion } from '../src/engine/minion.ts';

/** The phone version (/m/, 6 November 2026): what its screens compute, without a screen. */

function phoneView(): PlayerView {
  const game = createGame({ seed: 3, seats: 2, heroes: ['attal', 'attal'] });
  return viewFor(game, 0);
}

test('prefersPhoneVersion: a phone goes to /m/, a tablet, a computer or a phone that chose the computer stay', () => {
  assert.equal(prefersPhoneVersion({ coarsePointer: true, shortSide: 390, computerChosen: false }), true);
  assert.equal(prefersPhoneVersion({ coarsePointer: true, shortSide: 360, computerChosen: false }), true, 'held sideways too');
  assert.equal(prefersPhoneVersion({ coarsePointer: true, shortSide: 390, computerChosen: true }), false);
  assert.equal(prefersPhoneVersion({ coarsePointer: true, shortSide: 820, computerChosen: false }), false, 'a tablet keeps the table');
  assert.equal(prefersPhoneVersion({ coarsePointer: false, shortSide: 390, computerChosen: false }), false, 'a small window on a computer');
});

test('zoneAroundBand: the shop above the board\'s band, the board on it, the hand below', () => {
  const band = { top: 400, bottom: 500 };
  assert.equal(zoneAroundBand(10, band), 'shop');
  assert.equal(zoneAroundBand(399, band), 'shop');
  assert.equal(zoneAroundBand(400, band), 'board');
  assert.equal(zoneAroundBand(499, band), 'board');
  assert.equal(zoneAroundBand(500, band), 'hand');
  assert.equal(zoneAroundBand(840, band), 'hand');
});

test('portraitCombatLayout: seven medallions across a phone, the rival\'s row above yours, both centred', () => {
  for (const [width, height] of [[390, 844], [360, 740], [375, 667]]) {
    const layout = portraitCombatLayout(width, height, 7, 7);
    const size = MEDALLION_LAYOUT.width * layout.scale;
    for (const row of [layout.enemy, layout.own]) {
      assert.equal(row.length, 7);
      assert.ok(row[0].x >= 0 && row[6].x + size <= width, `${width} : la rangée tient dans l'écran`);
    }
    assert.ok(layout.enemy[0].y < layout.own[0].y, 'the rival above');
    const short = portraitCombatLayout(width, height, 2, 3);
    const middle = (row: { x: number }[]) => (row[0].x + row[row.length - 1].x + size) / 2;
    assert.ok(Math.abs(middle(short.enemy) - width / 2) < 0.01 && Math.abs(middle(short.own) - width / 2) < 0.01, 'centred');
  }
  assert.ok(MEDALLION_LAYOUT.width * portraitCombatLayout(1200, 1800, 3, 3).scale <= 96, 'never giant on a large screen');
});

test('buyAction and sellAction say why they cannot be done, as the engine would refuse', () => {
  const view = phoneView();
  assert.equal(buyAction({ ...view, budget: 10 }, 3).reason, null);
  assert.equal(buyAction({ ...view, budget: 2 }, 3).reason, 'Budget insuffisant');
  assert.equal(buyAction({ ...view, budget: 10, hand: Array(view.handLimit).fill(makeMinion(CARD_BY_ID.tiberi, 1)) }, 3).reason, 'Main pleine');
  const minion = makeMinion(CARD_BY_ID.tiberi, 5);
  assert.deepEqual(sellAction(view, minion, true), { id: 'sell', label: 'Renvoyer', gain: view.params.sellValue + (view.mods.sellBonus ?? 0), reason: null, primary: false });
  assert.match(sellAction(view, { ...minion, bracelet: true }, true).reason ?? '', /bracelet/);
});

test('cardSheetFor: the card a touch opens, with its button, for the shop, the hand and the board', () => {
  const view = { ...phoneView(), budget: 10 };
  const shopMinion = makeMinion(CARD_BY_ID[view.shop[0]], -100);
  assert.deepEqual(cardSheetFor({ from: 'shop', slot: 0, minion: shopMinion }, view).actions.map((a) => [a.id, a.cost]), [['buy', view.buyCost]]);
  const tract = { uid: 70, spellId: 'tract' };
  const tractSheet = cardSheetFor({ from: 'hand-spell', held: tract, card: { kind: 'spell', spell: SPELL_BY_ID.tract } }, view);
  assert.deepEqual(tractSheet.actions.map((a) => [a.id, a.label]), [['cast', 'Lancer']]);
  const casserole = CASSEROLE_BY_ID.playboy;
  const held = { uid: 71, casseroleId: 'playboy' };
  const empty = cardSheetFor({ from: 'hand-spell', held, card: { kind: 'casserole', casserole } }, { ...view, board: [] });
  assert.equal(empty.actions[0].reason, 'Aucun politique sur le plateau', 'a casserole needs a politician to land on');
  const inHand = makeMinion(CARD_BY_ID.tiberi, 80);
  assert.deepEqual(cardSheetFor({ from: 'hand', minion: inHand }, { ...view, hand: [inHand] }).actions.map((a) => a.id), ['play', 'sell']);
  const full = Array.from({ length: view.boardLimit }, (_, i) => makeMinion(CARD_BY_ID.tiberi, 200 + i));
  assert.equal(cardSheetFor({ from: 'hand', minion: inHand }, { ...view, hand: [inHand], board: full }).actions[0].reason, 'Plateau plein');
  const carrier = { ...makeMinion(CARD_BY_ID.schiappa, 90), casseroles: ['playboy', 'bygmalion'], oublie: 1, ownerCasseroles: ['playboy'] };
  const boardSheet = cardSheetFor({ from: 'board', minion: carrier, index: 0 }, { ...view, board: [carrier] });
  assert.deepEqual(boardSheet.actions.map((a) => a.id), ['sell']);
  assert.deepEqual(boardSheet.casseroles.map((pan) => [pan.casserole.id, pan.worn.state, pan.worn.owned]), [['playboy', 'forgotten', true], ['bygmalion', 'dormant', false]]);
  assert.equal(boardSheet.card.kind === 'minion' && boardSheet.card.onBoard, undefined, 'no « pointez » hint: the phone lists its casseroles');
});

test('wornCasseroles and boardMinionShown: what a board politician shows on the phone', () => {
  const view = phoneView();
  const minion = { ...makeMinion(CARD_BY_ID.schiappa, 9), casseroles: ['playboy', 'inconnue'] };
  assert.deepEqual(wornCasseroles(minion, view.round).map((pan) => pan.key), ['playboy-0'], 'an unknown id is left out');
  const copies = [makeMinion(CARD_BY_ID.tiberi, 1), makeMinion(CARD_BY_ID.tiberi, 2)];
  const shown = boardMinionShown(copies[0], { ...view, board: copies, hand: [] });
  assert.equal(shown.kind === 'minion' && shown.face.copies, 2, 'two copies: one more for a triple');
});

test('refreshedItem: the card opened follows its thing, or closes when it is gone', () => {
  const view = phoneView();
  const minion = makeMinion(CARD_BY_ID[view.shop[0]], -100);
  const shopItem = { from: 'shop', slot: 0, minion } as const;
  assert.equal(refreshedItem(shopItem, view), shopItem);
  assert.equal(refreshedItem(shopItem, { ...view, shop: [] }), null, 'bought, or a new shop');
  const onBoard = makeMinion(CARD_BY_ID.tiberi, 42);
  const moved = { ...onBoard, atk: 9 };
  assert.deepEqual(refreshedItem({ from: 'board', minion: onBoard, index: 0 }, { ...view, board: [makeMinion(CARD_BY_ID.lecornu, 1), moved] }), { from: 'board', minion: moved, index: 1 });
  assert.equal(refreshedItem({ from: 'board', minion: onBoard, index: 0 }, { ...view, board: [] }), null, 'sold');
  assert.equal(refreshedItem({ from: 'hand', minion: onBoard }, { ...view, hand: [] }), null, 'laid down');
  const held = { uid: 5, spellId: 'tract', count: 2 };
  const kept = refreshedItem({ from: 'hand-spell', held, card: { kind: 'spell', spell: SPELL_BY_ID.tract } }, { ...view, spells: [{ ...held, count: 1 }] });
  assert.equal(kept?.from === 'hand-spell' && kept.held.count, 1, 'one Tract left: the card says so');
});

test('discoverCards and handCardShown: the faces the phone shows', () => {
  const cards = discoverCards(['tiberi', 'nobody'], 'serviteur');
  assert.equal(cards[0]?.kind, 'minion');
  assert.equal(cards[1], null);
  assert.equal(discoverCards(['tract'], 'sort')[0]?.kind, 'spell');
  const view = phoneView();
  const spell = handCardShown({ kind: 'spell', uid: 3, held: { uid: 3, spellId: 'investiture', tier: 4 }, spell: SPELL_BY_ID.investiture }, view);
  assert.equal(spell.kind === 'spell' && spell.tier, 4, 'an Investiture shows the tier it was fixed at');
});
