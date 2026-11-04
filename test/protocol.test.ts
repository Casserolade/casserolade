import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_MESSAGE_BYTES, parseClientMessage } from '../src/protocol/parseClientMessage.ts';

test('valid messages pass', () => {
  const valid = [
    { type: 'action', seq: 1, action: { t: 'buy', slot: 0 } },
    { type: 'action', seq: 2, action: { t: 'move', uid: 3, to: 1 } },
    { type: 'action', seq: 3, action: { t: 'roll' } },
    { type: 'action', seq: 4, action: { t: 'hero', i: 1 } },
    { type: 'pret' },
    { type: 'vu' },
    { type: 'lancer' },
    { type: 'creer_salon', pseudo: 'Jojo', options: { bots: 6, niveauBots: 'moyen', minuteur: true } },
    { type: 'rejoindre', code: 'ABCD', pseudo: 'Jojo' },
    { type: 'reprendre', jeton: 'abc' },
  ];
  for (const message of valid) assert.deepEqual(parseClientMessage(JSON.stringify(message)), message);
});

test('anything malformed is rejected', () => {
  const invalid = [
    'not json',
    'null',
    '[]',
    '42',
    '{}',
    '{"type":"inconnu"}',
    '{"type":"action","seq":1}',
    '{"type":"action","seq":-1,"action":{"t":"roll"}}',
    '{"type":"action","seq":1.5,"action":{"t":"roll"}}',
    '{"type":"action","seq":"1","action":{"t":"roll"}}',
    '{"type":"action","seq":1,"action":{"t":"tricher"}}',
    '{"type":"action","seq":1,"action":{"t":"buy"}}',
    '{"type":"action","seq":1,"action":{"t":"buy","slot":"0"}}',
    '{"type":"action","seq":1,"action":{"t":"buy","slot":1e300}}',
    '{"type":"action","seq":1,"action":{"t":"move","uid":1}}',
    '{"type":"creer_salon","pseudo":"","options":{"bots":1,"niveauBots":"moyen","minuteur":true}}',
    '{"type":"creer_salon","pseudo":"x","options":{"bots":99,"niveauBots":"moyen","minuteur":true}}',
    '{"type":"creer_salon","pseudo":"x","options":{"bots":1,"niveauBots":"dieu","minuteur":true}}',
    '{"type":"rejoindre","code":1,"pseudo":"x"}',
  ];
  for (const text of invalid) assert.equal(parseClientMessage(text), null, text);
});

test('oversized messages are rejected before parsing', () => {
  const big = JSON.stringify({ type: 'rejoindre', code: 'A', pseudo: 'x'.repeat(MAX_MESSAGE_BYTES) });
  assert.equal(parseClientMessage(big), null);
});

test('unexpected fields do not get through', () => {
  const parsed = parseClientMessage('{"type":"action","seq":1,"seat":3,"action":{"t":"buy","slot":0,"cost":0},"__proto__":{"x":1}}');
  assert.deepEqual(parsed, { type: 'action', seq: 1, action: { t: 'buy', slot: 0 } });
});
