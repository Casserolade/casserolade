import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LICENCE_LINKS } from '../src/client/const/licenceLinks.ts';
import { STUDIO_DETAILS } from '../src/client/const/studioDetails.ts';
import type { StudioCard } from '../src/client/const/studioDetails.ts';
import { STUDIO_VISITORS } from '../src/client/const/studioVisitors.ts';
import { TICKER_WORDS } from '../src/client/const/tickerWords.ts';
import { circlePath } from '../src/client/tools/circlePath.ts';
import { clockText } from '../src/client/tools/clockText.ts';
import { crashCurvePath } from '../src/client/tools/crashCurvePath.ts';
import { eliminationScreams } from '../src/client/tools/eliminationScreams.ts';
import { fillTickerLine } from '../src/client/tools/fillTickerLine.ts';
import { musicOrder } from '../src/client/tools/musicOrder.ts';
import { shuffled } from '../src/client/tools/shuffled.ts';
import { studioCardText } from '../src/client/tools/studioCardText.ts';
import { tickerVisit } from '../src/client/tools/tickerVisit.ts';
import { trackMayPlay } from '../src/client/tools/trackMayPlay.ts';
import { BRUITAGES_CREDITES, MUSIQUES } from '../src/data/musiques.ts';
import { PLATEAUX, SECOND_TOUR } from '../src/data/plateaux.ts';

const manifest = JSON.parse(readFileSync('assets/game/manifest.json', 'utf8')) as { sons: { musique: Record<string, string>; bruitages: Record<string, string> } };

test('musicOrder : tous les morceaux, mélangés, chacun une fois, et jamais deux fois le même d\'affilée', () => {
  const tracks = ['a', 'b', 'c', 'd', 'e'];
  const rolls = [0.9, 0.1, 0.7, 0.3, 0.5];
  const order = musicOrder(tracks, rolls);
  assert.deepEqual([...order].sort(), tracks);
  assert.deepEqual(musicOrder(tracks, rolls), order);
  assert.notDeepEqual(musicOrder(tracks, [0.1, 0.9, 0.2, 0.8, 0.4]), order);
  // Aucun morceau n'ouvre d'office : selon le tirage, chacun peut venir en premier.
  const openings = new Set(Array.from({ length: 40 }, (_, seed) => musicOrder(tracks, tracks.map((_, index) => ((seed * 7 + index * 13) % 40) / 40))[0]));
  assert.ok(openings.size >= 4, `${openings.size} ouvertures différentes seulement`);
  // Le dernier morceau d'un tour n'ouvre pas le suivant.
  assert.notEqual(musicOrder(tracks, rolls, order[0])[0], order[0]);
  assert.deepEqual([...musicOrder(tracks, rolls, order[0])].sort(), tracks);
  assert.deepEqual(musicOrder([], []), []);
  assert.deepEqual(musicOrder(['seul'], [0.5], 'seul'), ['seul']);
});

test('trackMayPlay : un morceau du dernier souffle ne joue qu\'à un seul sondage ; les autres, toujours', () => {
  assert.equal(trackMayPlay({}, null), true);
  assert.equal(trackMayPlay({}, 30), true);
  assert.equal(trackMayPlay({ dernierSouffle: true }, 1), true);
  assert.equal(trackMayPlay({ dernierSouffle: true }, 2), false);
  assert.equal(trackMayPlay({ dernierSouffle: true }, 0), false);
  assert.equal(trackMayPlay({ dernierSouffle: true }, null), false);
  assert.deepEqual(MUSIQUES.filter((track) => track.dernierSouffle).map((track) => track.fichier), ['quijada']);
});

test('chaque musique du jeu a son fichier, son auteur et sa licence, et chaque fichier son crédit', () => {
  assert.deepEqual(MUSIQUES.map((track) => track.fichier).sort(), Object.keys(manifest.sons.musique).sort());
  for (const track of MUSIQUES) {
    assert.ok(track.titre && track.auteur, `${track.fichier} : titre ou auteur manquant`);
    assert.ok(track.licence.startsWith('©') || track.licence in LICENCE_LINKS, `${track.fichier} : licence « ${track.licence} » inconnue`);
    if (!track.licence.startsWith('©')) assert.match(track.source ?? '', /^https:\/\//, `${track.fichier} : source manquante`);
  }
  for (const sound of BRUITAGES_CREDITES) assert.ok(manifest.sons.bruitages[sound.fichier], `${sound.fichier} : bruitage absent`);
});

test('clockText : une horloge, avec les heures quand il y en a, jamais négative', () => {
  assert.equal(clockText(240), '04:00');
  assert.equal(clockText(59.9), '00:59');
  assert.equal(clockText(4 * 3600 + 12 * 60 + 7), '4:12:07');
  assert.equal(clockText(-3), '00:00');
});

test('studioCardText : le panneau tourne, le compteur change, l\'horloge compte et repart', () => {
  const sign: StudioCard = { kind: 'sign', texts: ['un', 'deux'], seconds: 2 };
  assert.deepEqual([0, 1.9, 2, 4].map((t) => studioCardText(sign, t).values[0]), ['un', 'un', 'deux', 'un']);
  const counter: StudioCard = { kind: 'counter', label: 'Téléspectateurs', values: ['11', '10'], seconds: 3, note: 'environ' };
  assert.deepEqual(studioCardText(counter, 3), { label: 'Téléspectateurs', values: ['10'], note: 'environ', live: 0 });
  const down: StudioCard = { kind: 'clock', label: 'Temps restant', from: 240, direction: 'down' };
  assert.deepEqual([0, 1, 240, 241].map((t) => studioCardText(down, t).values[0]), ['04:00', '03:59', '00:00', '04:00']);
  const up: StudioCard = { kind: 'clock', label: 'Séance', from: 3600, direction: 'up' };
  assert.equal(studioCardText(up, 61).values[0], '1:01:01');
});

test('studioCardText : en duel, une seule horloge tourne à la fois, et aucune seconde ne se perd', () => {
  const duel: StudioCard = { kind: 'duel', label: 'Temps de parole', from: [100, 200], swapSeconds: 7 };
  assert.deepEqual(studioCardText(duel, 0), { label: 'Temps de parole', values: ['01:40', '03:20'], note: '', live: 0 });
  assert.deepEqual(studioCardText(duel, 5).values, ['01:45', '03:20']);
  assert.deepEqual(studioCardText(duel, 10), { label: 'Temps de parole', values: ['01:47', '03:23'], note: '', live: 1 });
  assert.deepEqual(studioCardText(duel, 16).values, ['01:49', '03:27']);
});

/** A random of its own for a test: the same seed gives the same numbers. */
function seededRoll(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

test('shuffled : les mêmes éléments, dans un ordre qui suit le tirage', () => {
  const items = ['a', 'b', 'c', 'd'];
  assert.deepEqual([...shuffled(items, [0.2, 0.9, 0.4, 0.1])].sort(), items);
  assert.deepEqual(shuffled(items, [0.2, 0.9, 0.4, 0.1]), shuffled(items, [0.2, 0.9, 0.4, 0.1]));
  assert.notDeepEqual(shuffled(items, [0.2, 0.9, 0.4, 0.1]), shuffled(items, [0.9, 0.1, 0.8, 0.6]));
  assert.deepEqual(items, ['a', 'b', 'c', 'd'], 'la liste d\'origine ne bouge pas');
  assert.deepEqual(shuffled([], []), []);
});

test('fillTickerLine : chaque case prend un mot de sa liste, et la ligne commence par une majuscule', () => {
  const words = { ville: ['Gien', 'Vesoul'], sujet: ['le quinoa'] };
  assert.equal(fillTickerLine('{ville} : rien à signaler', words, () => 0), 'Gien : rien à signaler');
  assert.equal(fillTickerLine('{ville} : rien à signaler', words, () => 0.99), 'Vesoul : rien à signaler');
  assert.equal(fillTickerLine('{sujet} : la France a peur', words, () => 0.5), 'Le quinoa : la France a peur');
  const rolls = [0, 0.99];
  assert.equal(fillTickerLine('de {ville} à {ville}', words, () => rolls.shift() ?? 0), 'De Gien à Vesoul');
  assert.equal(fillTickerLine('une ligne sans case', words, () => 0), 'Une ligne sans case');
  assert.equal(fillTickerLine('« {inconnu} »', words, () => 0), '« {inconnu} »');
});

test('tickerVisit : quelques lignes de la chaîne, sans doublon, et un autre tirage en donne d\'autres', () => {
  const lines = Array.from({ length: 20 }, (_, index) => `ligne ${index} à {ville}`);
  const visit = tickerVisit(lines, TICKER_WORDS, 8, seededRoll(1));
  assert.equal(visit.length, 8);
  assert.equal(new Set(visit.map((line) => line.split(' à ')[0])).size, 8);
  assert.ok(visit.every((line) => !line.includes('{')), visit.join(' | '));
  assert.deepEqual(tickerVisit(lines, TICKER_WORDS, 8, seededRoll(1)), visit);
  assert.notDeepEqual(tickerVisit(lines, TICKER_WORDS, 8, seededRoll(2)), visit);
  assert.equal(tickerVisit(['seule'], TICKER_WORDS, 8, seededRoll(1)).length, 1);
  // Sur dix visites, la première ligne à l'écran change presque à chaque fois.
  const openings = new Set(Array.from({ length: 10 }, (_, seed) => tickerVisit(lines, TICKER_WORDS, 8, seededRoll(seed + 3))[0]));
  assert.ok(openings.size >= 7, `${openings.size} ouvertures différentes sur 10 visites`);
});

test('crashCurvePath : la courbe tient, puis tombe d\'autant plus bas que la perte est lourde', () => {
  const small = crashCurvePath(1);
  const middle = crashCurvePath(5);
  const big = crashCurvePath(10);
  assert.ok(small.end.y < middle.end.y && middle.end.y < big.end.y, 'plus on perd, plus elle tombe');
  assert.deepEqual(crashCurvePath(40).end, big.end, 'au-delà de dix sondages, elle touche le fond et y reste');
  assert.ok(big.end.y <= 300 && small.end.y >= 82 + 40, 'toujours dans son cadre, toujours une vraie chute');
  for (const curve of [small, middle, big]) {
    assert.ok(curve.path.startsWith('M40 92 '), 'le même palier avant la chute');
    assert.ok(curve.path.endsWith(`L${curve.end.x} ${curve.end.y}`));
    assert.ok(curve.angle > 0 && curve.angle < 90, 'la flèche pointe vers le bas, à droite');
  }
  assert.ok(big.angle > small.angle, 'une chute plus raide pour une grosse perte');
});

/** The longest a line can get once its slots are filled. */
function longestFilled(line: string): number {
  return line.replace(/\{(\w+)\}/g, (_, name: string) => 'x'.repeat(Math.max(...(TICKER_WORDS[name] ?? ['']).map((word) => word.length)))).length;
}

test('chaque plateau a son habillage : un bandeau ou un carton, des lignes courtes', () => {
  for (const plateau of [...PLATEAUX, SECOND_TOUR]) {
    const detail = STUDIO_DETAILS[plateau.id];
    assert.ok(detail, `${plateau.id} : pas d'habillage`);
    assert.ok(detail.ticker || detail.card, `${plateau.id} : ni bandeau ni carton`);
    for (const line of detail.ticker?.lines ?? []) assert.ok(line.length > 0 && longestFilled(line) <= 76, `${plateau.id} : ligne trop longue (« ${line} »)`);
    if (detail.card?.kind === 'sign') for (const text of detail.card.texts) assert.ok(text.length <= 44, `${plateau.id} : panneau trop long (« ${text} »)`);
  }
});

test('le bandeau de chaque chaîne a de quoi surprendre : au moins vingt lignes, toutes différentes, aux cases connues', () => {
  for (const [id, detail] of Object.entries(STUDIO_DETAILS)) {
    const lines = detail.ticker?.lines ?? [];
    if (!detail.ticker) continue;
    assert.ok(lines.length >= 20, `${id} : ${lines.length} lignes seulement`);
    assert.equal(new Set(lines).size, lines.length, `${id} : une ligne en double`);
    for (const line of lines) {
      for (const [, slot] of line.matchAll(/\{(\w+)\}/g)) assert.ok(TICKER_WORDS[slot]?.length, `${id} : case inconnue {${slot}} (« ${line} »)`);
      assert.ok(!/[.!]$/.test(line), `${id} : pas de point final sur un bandeau (« ${line} »)`);
    }
  }
  for (const [slot, words] of Object.entries(TICKER_WORDS)) assert.equal(new Set(words).size, words.length, `${slot} : un mot en double`);
});

test('circlePath : un cercle en deux arcs, de bord à bord', () => {
  assert.equal(circlePath(30, 40, 10), 'M20 40a10 10 0 1 0 20 0a10 10 0 1 0 -20 0Z');
  assert.equal(circlePath(0, 0, 2.5), 'M-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0Z');
});

test('ce qui passe sur un bandeau : sur un plateau qui a un bandeau, dessiné dans sa grille, à un rythme qui ne lasse pas', () => {
  for (const [id, visitor] of Object.entries(STUDIO_VISITORS)) {
    assert.ok(STUDIO_DETAILS[id]?.ticker, `${id} : un visiteur sans bandeau où passer`);
    assert.ok(visitor.shapes.length >= 2, `${id} : un dessin d'une seule forme`);
    assert.equal(new Set(visitor.shapes.map((shape) => shape.d)).size, visitor.shapes.length, `${id} : deux formes identiques`);
    assert.ok(visitor.seconds >= 30, `${id} : il repasse trop souvent (${visitor.seconds} s)`);
    assert.ok(visitor.width > 0 && visitor.width <= 220, `${id} : trop large pour le bandeau`);
    // Un visiteur tient au-dessus du bandeau sans monter sur la main du joueur : pas plus haut que 90 pixels de table.
    assert.ok((visitor.width * visitor.grid[1]) / visitor.grid[0] <= 90, `${id} : trop haut`);
    for (const shape of visitor.shapes) assert.match(shape.fill, /^#[0-9a-f]{6}$/, `${id} : couleur ${shape.fill}`);
  }
});

test('eliminationScreams : le cri de Wilhelm, pour un humain seulement, sur un coup critique, et pas à chaque fois', () => {
  assert.equal(eliminationScreams({ human: true, after: -8 }, 0.1), true);
  assert.equal(eliminationScreams({ human: true, after: -20 }, 0.49), true);
  assert.equal(eliminationScreams({ human: false, after: -20 }, 0.1), false, 'jamais pour un bot');
  assert.equal(eliminationScreams({ human: true, after: -7 }, 0.1), false, 'le coup doit être critique');
  assert.equal(eliminationScreams({ human: true, after: 0 }, 0.1), false);
  assert.equal(eliminationScreams({ human: true, after: -20 }, 0.5), false, 'une fois de temps en temps');
  assert.equal(eliminationScreams({ human: true, after: -20 }, 0.99), false);
});
