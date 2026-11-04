import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { VOIX } from '../src/data/voix.ts';
import { voixPourCasserole, voixPourPhrase } from '../src/data/trouverVoix.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { HEROES } from '../src/data/heroes.ts';

const manifeste = JSON.parse(readFileSync('assets/game/manifest.json', 'utf8'));

test('chaque vraie voix a son fichier, sa personne, et sa casserole du même propriétaire', () => {
  for (const v of VOIX) {
    const chemin = manifeste.sons.citations[v.fichier];
    assert.ok(chemin, `${v.fichier} manque au manifeste`);
    assert.ok(existsSync(`assets/game/${chemin}`), `${chemin} manque`);
    assert.ok(CARD_BY_ID[v.personne] || HEROES.some((h) => h.id === v.personne), `${v.personne} inconnu`);
    if (v.casserole) {
      const c = CASSEROLES.find((x) => x.id === v.casserole);
      assert.ok(c, `casserole ${v.casserole} inconnue`);
      assert.equal(c.owner, v.personne, `${v.casserole} n'est pas à ${v.personne}`);
    }
  }
});

test('une voix ne se joue que si elle dit ce qu\'on lit', () => {
  assert.equal(voixPourCasserole('blancos'), 'blancos');
  assert.equal(voixPourCasserole('courbe'), null, 'la casserole cite le Bourget, l\'extrait dit autre chose');
  assert.equal(voixPourPhrase('macron', 'Je traverse la rue, je vous en trouve !'), 'traverse_la_rue');
  assert.equal(voixPourPhrase('royal', 'Qui va sur la Grande Muraille conquiert la bravitude.'), 'bravitude');
  assert.equal(voixPourPhrase('macron', 'Une phrase sans extrait.'), null);
  assert.equal(voixPourPhrase('hollande', 'Je traverse la rue'), null, 'jamais la voix d\'un autre');
});
