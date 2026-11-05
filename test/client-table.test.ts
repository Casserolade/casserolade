import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speechForEvent } from '../src/client/tools/afterCombatSpeech.ts';
import { voixPourPhrase } from '../src/data/trouverVoix.ts';
import type { Moment } from '../src/data/phrases.ts';
import { quotesFor } from '../src/client/tools/quotesFor.ts';
import { voicedSpeaker } from '../src/client/tools/voicedSpeaker.ts';
import { speechStandIns } from '../src/client/tools/speechStandIns.ts';
import { hasRecordedLine } from '../src/client/tools/hasRecordedLine.ts';
import type { CombatEvent, CombatUnit } from '../src/engine/types.ts';
import { CHANTS } from '../src/data/chants.ts';
import { fanLayout } from '../src/client/tools/fanLayout.ts';
import { glossaryFor } from '../src/client/tools/glossaryFor.ts';
import { handCards } from '../src/client/tools/handCards.ts';
import { medallionMarks } from '../src/client/tools/medallionMarks.ts';
import { allyTargets, annonceNeedsTarget, spellNeedsTarget, spellTargets } from '../src/client/tools/playTargets.ts';
import { boldTerms, parseRichText } from '../src/client/tools/richText.ts';
import { casseroleCardLines, spellCardLines } from '../src/client/tools/spellCardLines.ts';
import { cardRuleLines } from '../src/client/tools/describeEffect.ts';
import { describeOwnerBonus } from '../src/client/tools/describeOwnerBonus.ts';
import { CARD_BY_ID, CARDS } from '../src/data/cards.ts';
import { CASSEROLE_BY_ID, CASSEROLES } from '../src/data/casseroles.ts';
import { PHRASES } from '../src/data/phrases.ts';
import { SPELL_BY_ID, SPELLS } from '../src/data/sorts.ts';
import { makeMinion } from '../src/engine/minion.ts';
import type { Minion } from '../src/engine/types.ts';

const FAN = { step: 120, maxSpan: 900, anglePerCard: 6, maxAngle: 18, dip: 6, hoverScale: 2, hoverLift: 80, hoverSpread: 60 };

function minion(cardId: string, uid: number, extra: Partial<Minion> = {}): Minion {
  return { ...makeMinion(CARD_BY_ID[cardId], uid), ...extra };
}

test('parseRichText splits card text into plain and bold runs', () => {
  assert.deepEqual(parseRichText('**Annonce** : donne **Immunité** à un allié.'), [
    { text: 'Annonce', bold: true },
    { text: ' : donne ', bold: false },
    { text: 'Immunité', bold: true },
    { text: ' à un allié.', bold: false },
  ]);
  assert.deepEqual(parseRichText('Rien en gras.'), [{ text: 'Rien en gras.', bold: false }]);
  assert.deepEqual(boldTerms(['**Tract**, **Tract** et **Vente**']), ['Tract', 'Vente']);
});

test('glossaryFor explains every bold word of every card, spell and casserole', () => {
  const texts = [
    ...CARDS.map((card) => cardRuleLines(card)),
    ...SPELLS.map((spell) => spellCardLines(spell, { tier: 3, tract: { atk: 1, hp: 1 } })),
    ...CASSEROLES.map((casserole) => casseroleCardLines(casserole)),
  ];
  for (const lines of texts) {
    const explained = glossaryFor(lines).length;
    assert.equal(explained, new Set(boldTerms(lines).map((term) => term.replace(/\s*\(.*\)$/, '').toLowerCase().replace(/s$/, ''))).size, lines.join(' / '));
  }
});

test('glossaryFor folds plurals and numbers back to one entry', () => {
  const entries = glossaryFor(['**Fin de tour** : joue un **Tract**.', 'Vos **Tracts** donnent +1/+1. **Immunité**.']);
  assert.deepEqual(entries.map((entry) => entry.term), ['Fin de tour', 'Tract', 'Immunité']);
  assert.ok(entries.every((entry) => entry.rule.length > 10));
});

test('fanLayout tilts the ends, keeps the hand narrow, and lifts the hovered card', () => {
  const rest = fanLayout(5, null, FAN);
  assert.equal(rest[2].x, 0);
  assert.ok(rest[0].angle < 0 && rest[4].angle > 0);
  assert.ok(rest[0].y > rest[2].y, 'the ends dip');
  const crowded = fanLayout(10, null, FAN);
  assert.ok(crowded[9].x - crowded[0].x <= FAN.maxSpan + 1e-9);
  const hovered = fanLayout(5, 1, FAN);
  assert.equal(hovered[1].angle, 0);
  assert.equal(hovered[1].scale, 2);
  assert.ok(hovered[1].y < 0);
  assert.ok(hovered[1].z > hovered[4].z);
  assert.ok(hovered[2].x > rest[2].x && hovered[0].x < rest[0].x, 'the neighbours step aside');
  assert.deepEqual(fanLayout(1, null, FAN)[0], { x: 0, y: 0, angle: 0, scale: 1, z: 0 });
});

test('handCards mixes minions, spells and casseroles in the order they came', () => {
  const cards = handCards([minion('boyard', 5)], [{ uid: 7, casseroleId: CASSEROLES[0].id }, { uid: 3, spellId: 'tract', count: 2 }, { uid: 9, spellId: 'nope' }]);
  assert.deepEqual(cards.map((card) => [card.kind, card.uid]), [['spell', 3], ['minion', 5], ['casserole', 7]]);
});

test('targets follow the rules the engine checks', () => {
  const board = [minion('boyard', 1), minion('thevenoud', 2, { golden: true }), { ...minion('boyard', 3), token: true }, minion('melenchon', 4)];
  assert.ok(annonceNeedsTarget(CARD_BY_ID.valls.effects ?? []));
  assert.ok(!annonceNeedsTarget(CARD_BY_ID.boyard.effects ?? []));
  assert.deepEqual(allyTargets(board, 1), [2, 3, 4]);
  assert.deepEqual(allyTargets(board, undefined, CARD_BY_ID.philippe.effects), [1], 'only plain minions of tier 3 or less turn golden');
  assert.ok(spellNeedsTarget({ uid: 1, spellId: 'tract' }));
  assert.ok(!spellNeedsTarget({ uid: 1, spellId: 'note_de_frais' }));
  assert.ok(spellNeedsTarget({ uid: 1, casseroleId: CASSEROLES[0].id }));
  assert.deepEqual(spellTargets({ uid: 1, spellId: 'tract' }, board), [1, 2, 3, 4]);
  assert.deepEqual(spellTargets({ uid: 1, spellId: 'remaniement' }, board), [1]);
  assert.deepEqual(spellTargets({ uid: 1, casseroleId: CASSEROLES[0].id }, board), [1, 2, 4]);
  assert.deepEqual(spellTargets({ uid: 1, spellId: 'note_de_frais' }, board), []);
});

test('medallionMarks shows what the card hides', () => {
  assert.deepEqual(medallionMarks(CARD_BY_ID.bouamrane.effects ?? []), { heritage: true, triggered: false, revanche: null, celebration: false, reponse: false });
  const vallaud = medallionMarks(CARD_BY_ID.vallaud.effects ?? []);
  assert.equal(vallaud.revanche, 4);
  assert.ok(medallionMarks(CARD_BY_ID.boyard.effects ?? []).celebration);
  assert.ok(medallionMarks(CARD_BY_ID.portes.effects ?? []).triggered);
  assert.ok(medallionMarks(CARD_BY_ID.ndiaye.effects ?? []).reponse);
  assert.ok(!medallionMarks(CARD_BY_ID.chikirou.effects ?? []).triggered, 'an Annonce is spent once played');
});

test('spell and casserole cards say what they do', () => {
  assert.deepEqual(spellCardLines(SPELL_BY_ID.tract, { tract: { atk: 2, hp: 1 } }), ['Donne +2/+1 à un politique.']);
  assert.match(spellCardLines(SPELL_BY_ID.investiture, { tier: 4 })[0], /échelon 4/);
  assert.match(spellCardLines(SPELL_BY_ID.matinale)[0], /2 prochaines actualisations sont gratuites/i);
  const casserole = CASSEROLE_BY_ID.ecoutes;
  assert.equal(casseroleCardLines(casserole).at(-1), 'Sur Nicolas Sarkozy, en plus\u00a0: +3/+3.');
});

test('after a combat, the celebrant says a real quote, another of its own, or its camp\'s chant', () => {
  const speaker = Object.keys(PHRASES).find((id) => PHRASES[id]?.celebration?.length);
  assert.ok(speaker);
  const said = speechForEvent({ e: 'celebration', side: 0, uid: 4, cardId: speaker });
  assert.equal(said?.kind, 'celebration');
  assert.equal(said?.line, PHRASES[speaker].celebration?.[0]);
  assert.equal(said?.chant, false);
  // A politician without any celebration line, but with real quotes of its own, says one of them.
  const quiet = Object.keys(PHRASES).find((id) => CARD_BY_ID[id] && !PHRASES[id]?.celebration?.length && Object.keys(PHRASES[id]).length);
  assert.ok(quiet, 'un politique sans phrase de célébration');
  const said2 = speechForEvent({ e: 'celebration', side: 0, uid: 5, cardId: quiet });
  assert.ok(said2?.line && Object.values(PHRASES[quiet]).flat().includes(said2.line));
  assert.equal(said2?.chant, false);
  // Without any real quote, the camp's real slogan, as a chant: nobody talks without a word.
  const silent = CARDS.find((c) => !c.token && !PHRASES[c.id]);
  assert.ok(silent, 'un politique sans aucune petite phrase');
  const chanted = speechForEvent({ e: 'celebration', side: 0, uid: 6, cardId: silent.id });
  assert.equal(chanted?.line, CHANTS[silent.camp]);
  assert.equal(chanted?.chant, true);
  for (const card of CARDS) assert.ok(speechForEvent({ e: 'celebration', side: 0, uid: 1, cardId: card.id })?.line, `${card.id} célèbre sans un mot`);
  assert.equal(speechForEvent({ e: 'celebration', side: 1, uid: 4, cardId: 'personne' })?.line, null);
  assert.equal(speechForEvent({ e: 'reponse', side: 1, uid: 2, cardId: 'personne' })?.kind, 'reponse');
  assert.equal(speechForEvent({ e: 'attaque', from: 1, to: 2 }), null);
});

test('the celebrant draws among its recorded quotes when it has some, among all its quotes otherwise', () => {
  const moments: Moment[] = ['celebration', 'heros', 'pose', 'casserole', 'mort'];
  const recorded = (id: string) => quotesFor(id, moments).filter((line) => voixPourPhrase(id, line));
  const voicedSpeaker = Object.keys(PHRASES).find((id) => recorded(id).length >= 2 && quotesFor(id, moments).length > recorded(id).length);
  assert.ok(voicedSpeaker);
  const voiced = recorded(voicedSpeaker);
  const drawn = [0, 0.5, 0.999].map((roll) => speechForEvent({ e: 'celebration', side: 0, uid: 4, cardId: voicedSpeaker }, roll)?.line);
  assert.ok(drawn.every((line) => line && voiced.includes(line)), 'a recorded line, to be heard');
  assert.equal(drawn[0], voiced[0]);
  assert.equal(drawn[2], voiced.at(-1));
  const silent = Object.keys(PHRASES).find((id) => quotesFor(id, moments).length >= 3 && recorded(id).length === 0);
  assert.ok(silent);
  const quotes = quotesFor(silent, moments);
  const said = [0, 0.999].map((roll) => speechForEvent({ e: 'celebration', side: 0, uid: 4, cardId: silent }, roll)?.line);
  assert.deepEqual(said, [quotes[0], quotes.at(-1)]);
});

function combatUnit(uid: number, cardId: string, extra: Partial<CombatUnit> = {}): CombatUnit {
  return { uid, cardId, name: cardId, camp: 'civile', tier: 1, atk: 1, hp: 1, keywords: [], golden: false, token: false, noAttack: false, casseroles: [], effects: [], bonus: 0, ...extra };
}

test('speechStandIns: the winner\'s survivors, Vedettes first; the loser\'s Droits de réponse', () => {
  const answer = { when: 'droit_de_reponse', to: 'soi', do: 'buff', atk: 1, hp: 1 } as unknown as CombatUnit['effects'][number];
  const log: CombatEvent[] = [
    { e: 'debut', first: 0, sides: [[combatUnit(1, 'a'), combatUnit(2, 'b', { effects: [answer] })], [combatUnit(3, 'c')]] },
    { e: 'fin', winner: 1, sides: [[], [combatUnit(3, 'c'), combatUnit(4, 'd', { keywords: ['vedette'] }), combatUnit(5, 'e', { hp: 0 })]] },
  ];
  assert.deepEqual(speechStandIns({ e: 'celebration', side: 1, uid: 3, cardId: 'c' }, log).map((u) => u.uid), [4, 3]);
  assert.deepEqual(speechStandIns({ e: 'reponse', side: 0, uid: 2, cardId: 'b' }, log).map((u) => u.uid), [2]);
});

test('voicedSpeaker gives the floor to a survivor with a recorded line, and keeps the chosen one when it has one', () => {
  const log: CombatEvent[] = [{ e: 'fin', winner: 0, sides: [[combatUnit(1, 'muet'), combatUnit(2, 'bavard')], []] }];
  const celebration = { e: 'celebration' as const, side: 0 as const, uid: 1, cardId: 'muet' };
  assert.deepEqual(voicedSpeaker(celebration, log, (id) => id === 'bavard'), { ...celebration, uid: 2, cardId: 'bavard' });
  assert.equal(voicedSpeaker(celebration, log, () => true), celebration);
  assert.equal(voicedSpeaker(celebration, log, () => false), celebration);
});

test('hasRecordedLine: true for someone whose line was recorded, false for a card without any quote', () => {
  const recorded = Object.keys(PHRASES).find((id) => quotesFor(id, ['celebration', 'pose']).some((line) => voixPourPhrase(id, line)));
  assert.ok(recorded);
  assert.equal(hasRecordedLine(recorded, ['celebration', 'pose']), true);
  assert.equal(hasRecordedLine('personne_inconnue', ['celebration']), false);
});

test('on a winning streak, the same politician does not say the same line twice: another recorded one, else a bubble', () => {
  const moments: Moment[] = ['celebration', 'heros', 'pose', 'casserole', 'mort'];
  const recorded = (id: string) => quotesFor(id, moments).filter((line) => voixPourPhrase(id, line));
  const once = Object.keys(PHRASES).find((id) => recorded(id).length === 1 && quotesFor(id, moments).length >= 2);
  assert.ok(once);
  const event = { e: 'celebration' as const, side: 0 as const, uid: 4, cardId: once };
  const first = speechForEvent(event, 0.3)?.line;
  assert.equal(first, recorded(once)[0], 'first time: its recorded line');
  const again = speechForEvent(event, 0.3, first ?? null)?.line;
  assert.ok(again && again !== first, 'next time: another line');
  assert.equal(voixPourPhrase(once, again), null, 'in a bubble: it has no other recording');
  const twice = Object.keys(PHRASES).find((id) => recorded(id).length >= 2);
  assert.ok(twice);
  const voicedEvent = { ...event, cardId: twice };
  const said = speechForEvent(voicedEvent, 0)?.line ?? null;
  const next = speechForEvent(voicedEvent, 0, said)?.line ?? null;
  assert.ok(next && next !== said && voixPourPhrase(twice, next), 'another recorded line when there is one');
});

test('describeOwnerBonus says what each casserole gives its owner on top, as the engine applies it', () => {
  for (const casserole of CASSEROLES) assert.match(describeOwnerBonus(casserole) ?? '', /^Sur .+, en plus\u00a0: .+\.$/, casserole.id);
  assert.equal(describeOwnerBonus(CASSEROLE_BY_ID.ecoutes), 'Sur Nicolas Sarkozy, en plus\u00a0: +3/+3.');
  assert.equal(describeOwnerBonus(CASSEROLE_BY_ID.hologramme), 'Sur Jean-Luc Mélenchon, en plus\u00a0: +1/+0 et un deuxième Hologramme.');
  assert.equal(describeOwnerBonus(CASSEROLE_BY_ID.accent), 'Sur Jean-Luc Mélenchon, en plus\u00a0: +2/+0 et son effet joue deux fois.');
  assert.equal(describeOwnerBonus(CASSEROLE_BY_ID.traverser_la_rue), 'Sur Emmanuel Macron, en plus\u00a0: un deuxième politique gratuit de votre échelon.');
  assert.equal(describeOwnerBonus(CASSEROLE_BY_ID.compte_suisse), 'Sur Jérôme Cahuzac, en plus\u00a0: +2 budget par manche.');
});

test('a card says how many times an effect repeats, and a golden card always says more than a plain one', () => {
  assert.match(cardRuleLines(CARD_BY_ID.chikirou).join(' '), /au hasard, trois fois\.$/);
  for (const card of CARDS) {
    if (card.effects?.length) assert.notDeepEqual(cardRuleLines(card, { isGolden: true }), cardRuleLines(card), card.id);
  }
  assert.deepEqual(cardRuleLines(CARD_BY_ID.bertrand, { isGolden: true }), ['**Annonce** : donne **Immunité** à un autre allié, et à un deuxième au hasard.']);
  assert.deepEqual(cardRuleLines(CARD_BY_ID.morano, { isGolden: true }).at(-1), '**Célébration** : donne **Immunité** à deux autres alliés au hasard.');
  assert.deepEqual(cardRuleLines(CARD_BY_ID.philippe, { isGolden: true }), ['**Annonce** : rend doré un autre allié d\'échelon 4 ou moins, et un deuxième au hasard.']);
  assert.deepEqual(cardRuleLines(CARD_BY_ID.hidalgo, { isGolden: true }), ['**Annonce** : détruisez un autre allié et **découvrez** deux fois un politique de son camp.']);
  assert.deepEqual(cardRuleLines(CARD_BY_ID.jadot, { isGolden: true }), ['**Fin de tour** : déclenche deux fois la **Fin de tour** de ses voisins.']);
});

test('an effect that tells its power keeps it: a golden Ralliement on a plain host, a casserole on a golden one', () => {
  const income = CARD_BY_ID.lemaire.effects?.[0];
  assert.ok(income);
  assert.deepEqual(cardRuleLines({ effects: [{ ...income, power: 2 }] }), ['Au début de votre tour, gagnez 4 budget.']);
  assert.deepEqual(cardRuleLines({ effects: [{ ...income, power: 1 }] }, { isGolden: true }), ['Au début de votre tour, gagnez 2 budget.']);
});

test('a relaunch spell only lands on a minion that has something to relaunch', () => {
  const board = [makeMinion(CARD_BY_ID.hidalgo, 1), makeMinion(CARD_BY_ID.bertrand, 2), makeMinion(CARD_BY_ID.gueant, 3)];
  assert.deepEqual(spellTargets({ uid: 9, spellId: 'seconde_deliberation' }, board), [2]);
  assert.deepEqual(spellTargets({ uid: 9, spellId: 'tribune_libre' }, board), []);
});
