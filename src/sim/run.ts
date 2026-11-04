import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import type { BotLevel } from '../bots/bots.ts';
import type { Params } from '../engine/types.ts';
import { CONTEXTS } from '../data/heroes.ts';
import { buildReport, formatReport, playGame } from './simulate.ts';
import type { GameResult } from './simulate.ts';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '500' },
    seed: { type: 'string', default: '1' },
    mode: { type: 'string', default: 'moyen' },
    contexts: { type: 'boolean', default: false },
    /** Compare 4 bots mono-camp à 4 bots opportunistes. */
    styles: { type: 'boolean', default: false },
    out: { type: 'string' },
    /** Modifie une règle sans toucher aux données : --set startHp=25 --set allianceBonus=2 */
    set: { type: 'string', multiple: true, default: [] },
  },
});

const overrides: Partial<Params> = {};
for (const entry of values.set) {
  const [key, value] = entry.split('=');
  (overrides as Record<string, number>)[key] = Number(value);
}

const LOBBIES: Record<string, BotLevel[]> = {
  facile: Array(8).fill('facile'),
  moyen: Array(8).fill('moyen'),
  difficile: Array(8).fill('difficile'),
  mixte: ['facile', 'facile', 'facile', 'moyen', 'moyen', 'moyen', 'difficile', 'difficile'],
};

const levels = LOBBIES[values.mode];
if (!levels) throw new Error(`Mode inconnu : ${values.mode}`);

const STYLE_MIX = [{ pure: true }, { opportunist: true }, { pure: true }, { opportunist: true }, { pure: true }, { opportunist: true }, { pure: true }, { opportunist: true }];

const games = Number(values.games);
const seed = Number(values.seed);
const results: GameResult[] = [];
const start = Date.now();
for (let i = 0; i < games; i++) {
  const contextId = values.contexts ? CONTEXTS[i % CONTEXTS.length].id : undefined;
  results.push(playGame({ seed: seed + i * 7919, levels, contextId, params: overrides, styles: values.styles ? STYLE_MIX : undefined }));
}
const report = buildReport(results);
console.log(`Mode ${values.mode}, ${((Date.now() - start) / 1000).toFixed(1)} s`);
console.log(formatReport(report));
if (values.out) writeFileSync(values.out, JSON.stringify(report, null, 2));
