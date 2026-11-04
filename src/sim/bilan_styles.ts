/**
 * Deux façons de jouer, face à face : quatre bots du style A contre quatre du style B, sièges alternés,
 * même niveau. La place moyenne de chacun, avec son erreur type : si A fait mieux que B, l'écart vient
 * du style, pas du bot ni du siège. Sert à vérifier qu'un chiffre mesure le jeu et pas une manie du bot.
 *
 *   node src/sim/bilan_styles.ts --games 600 --a '{"casseroleLast":true}' --b '{}' [--mode difficile] [--set rollCost=0]
 */
import { parseArgs } from 'node:util';
import type { BotLevel, BotStyle } from '../bots/bots.ts';
import type { Params } from '../engine/types.ts';
import { playGame } from './simulate.ts';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '600' },
    seed: { type: 'string', default: '1' },
    mode: { type: 'string', default: 'difficile' },
    a: { type: 'string', default: '{}' },
    b: { type: 'string', default: '{}' },
    set: { type: 'string', multiple: true, default: [] },
  },
});
const styleA = JSON.parse(values.a) as BotStyle;
const styleB = JSON.parse(values.b) as BotStyle;
const params: Partial<Params> = {};
for (const entry of values.set) {
  // Un nombre, ou une valeur JSON pour les règles en tableau : --set 'damageCaps=[[1,5],[4,8],[8,15]]'.
  const [key, value] = [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)];
  (params as Record<string, unknown>)[key] = /^[[{]/.test(value) ? JSON.parse(value) : Number(value);
}
const levels: BotLevel[] = Array(8).fill(values.mode);
const placesA: number[] = [];
const placesB: number[] = [];
const actionsA: Record<string, number> = {};
const actionsB: Record<string, number> = {};
const games = Number(values.games);
for (let i = 0; i < games; i++) {
  // Un siège sur deux, et la moitié des parties dans l'autre sens : le siège ne compte pas.
  const aFirst = i % 2 === 0;
  const styles = levels.map((_, seat) => ((seat % 2 === 0) === aFirst ? styleA : styleB));
  const result = playGame({ seed: Number(values.seed) + i * 7919, levels, styles, params });
  result.seats.forEach((s, seat) => {
    const isA = styles[seat] === styleA;
    (isA ? placesA : placesB).push(s.place);
    const into = isA ? actionsA : actionsB;
    for (const [t, n] of Object.entries(s.actions)) into[t] = (into[t] ?? 0) + n;
  });
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const se = (xs: number[]) => Math.sqrt(xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1) / xs.length);
const perPlayer = (actions: Record<string, number>, n: number) =>
  Object.entries(actions).sort((x, y) => y[1] - x[1]).map(([t, k]) => `${t} ${(k / n).toFixed(1)}`).join(', ');
console.log(`${games} parties, bots ${values.mode}${values.set.length ? `, ${values.set.join(' ')}` : ''}`);
console.log(`A ${values.a} : place ${mean(placesA).toFixed(2)} ± ${se(placesA).toFixed(2)}, victoires ${((placesA.filter((p) => p === 1).length / placesA.length) * 100).toFixed(1)} %`);
console.log(`   actions par joueur et par partie : ${perPlayer(actionsA, placesA.length)}`);
console.log(`B ${values.b} : place ${mean(placesB).toFixed(2)} ± ${se(placesB).toFixed(2)}, victoires ${((placesB.filter((p) => p === 1).length / placesB.length) * 100).toFixed(1)} %`);
console.log(`   actions par joueur et par partie : ${perPlayer(actionsB, placesB.length)}`);
