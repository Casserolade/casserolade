import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { VOIX } from '../src/data/voix.ts';
import { voixPourCasserole, voixPourPhrase } from '../src/data/trouverVoix.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { HEROES } from '../src/data/heroes.ts';
import { ANIMATEURS } from '../src/data/animateurs.ts';
import { PHRASES } from '../src/data/phrases.ts';

const manifeste = JSON.parse(readFileSync('assets/game/manifest.json', 'utf8'));

test('chaque vraie voix a son fichier, sa personne, et sa casserole du même propriétaire', () => {
  for (const v of VOIX) {
    const chemin = manifeste.sons.citations[v.fichier];
    assert.ok(chemin, `${v.fichier} manque au manifeste`);
    assert.ok(existsSync(`assets/game/${chemin}`), `${chemin} manque`);
    // Une carte, un héros, ou un animateur : son pupitre joue aussi sa vraie voix.
    assert.ok(CARD_BY_ID[v.personne] || HEROES.some((h) => h.id === v.personne) || ANIMATEURS.some((a) => a.id === v.personne), `${v.personne} inconnu`);
    if (v.casserole) {
      const c = CASSEROLES.find((x) => x.id === v.casserole);
      assert.ok(c, `casserole ${v.casserole} inconnue`);
      assert.equal(c.owner, v.personne, `${v.casserole} n'est pas à ${v.personne}`);
    }
  }
});

test('une voix ne se joue que si elle dit ce qu\'on lit', () => {
  // Les voix gardées changent à chaque écoute de l'utilisateur : le test prend celles qui sont là.
  const surCasserole = VOIX.find((v) => v.casserole);
  if (surCasserole) assert.equal(voixPourCasserole(surCasserole.casserole as string), surCasserole.fichier);
  assert.equal(voixPourCasserole('courbe'), null, 'la casserole cite le Bourget, aucun extrait ne dit cela');
  const voix = VOIX[0];
  assert.equal(voixPourPhrase(voix.personne, `Bon. ${voix.phrase} !`), voix.fichier);
  assert.equal(voixPourPhrase(voix.personne, 'Une phrase sans extrait.'), null);
  const muet = Object.keys(CARD_BY_ID).find((id) => !VOIX.some((v) => v.personne === id)) as string;
  assert.equal(voixPourPhrase(muet, voix.phrase), null, 'jamais la voix d\'un autre');
});

/** What the speech recogniser makes up in silences and credits: never the words of a politician. */
const HALLUCINATIONS = /sous[- ]titr|radio[- ]canada|\bamara\b|merci d.avoir regard|abonnez[- ]vous|\bst' ?501\b|transcrit par|traduit par|merci de votre attention|merci à tous d.avoir|♪/i;

test('aucune phrase du jeu n\'est une invention de la transcription automatique', () => {
  const textes = [
    ...VOIX.map((v) => `${v.fichier} : ${v.phrase}`),
    ...Object.entries(PHRASES).flatMap(([id, moments]) => Object.values(moments).flat().map((t) => `${id} : ${t}`)),
    ...CASSEROLES.flatMap((c) => (c.citation ? [`${c.id} : ${c.citation}`] : [])),
  ];
  const suspectes = textes.filter((t) => HALLUCINATIONS.test(t));
  assert.deepEqual(suspectes, []);
  assert.ok(!HALLUCINATIONS.test('Le camarade, il dit : waouh'), 'un vrai mot qui contient « amara » passe');
  assert.ok(HALLUCINATIONS.test('Sous-titrage Société Radio-Canada'));
});
