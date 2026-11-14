import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { LICENCE_LINKS } from '../src/client/const/licenceLinks.ts';

interface PhotoCredit { id: string; auteur: string | null; licence: string | null; source: string | null }

const credits = JSON.parse(readFileSync('assets/game/credits.json', 'utf8')) as { photos: PhotoCredit[]; illustrations: PhotoCredit[]; cinematiques: PhotoCredit[] };
const manifest = JSON.parse(readFileSync('assets/game/manifest.json', 'utf8')) as { personnages: Record<string, { visages?: Record<string, unknown> }> };
/**
 * The photos kept without a free licence, by decisions of 14 November 2026: the Monaco Grand Prix picture of the
 * casserole « Des Deux-Siciles », and the three heads of Yann Bompard, of whom no free portrait exists (press photos,
 * each credited to its author and its article). Nothing else joins this list without such a decision.
 */
const KEPT_WITHOUT_LICENCE = ['des_deux_siciles', 'yann_bompard', 'yann_bompard.aie', 'yann_bompard.rire'];
const isFree = (photo: PhotoCredit) => photo.licence === 'Public domain' || (photo.licence ?? '') in LICENCE_LINKS;
const everyPhoto = [...credits.photos, ...credits.illustrations, ...credits.cinematiques];

test('chaque photo du jeu a un auteur, un lien vers sa source et une licence libre, sauf les exceptions décidées', () => {
  assert.deepEqual(everyPhoto.filter((photo) => !isFree(photo)).map((photo) => photo.id).sort(), [...KEPT_WITHOUT_LICENCE].sort());
  for (const photo of everyPhoto.filter(isFree)) {
    assert.ok(photo.auteur, `${photo.id} : auteur manquant`);
    assert.match(photo.source ?? '', /^https:\/\//, `${photo.id} : source manquante`);
  }
});

test('une photo gardée sans licence libre cite sa source, et son auteur quand c\'est une tête', () => {
  for (const photo of everyPhoto.filter((entry) => KEPT_WITHOUT_LICENCE.includes(entry.id))) assert.ok(photo.source, `${photo.id} : source manquante`);
  for (const photo of credits.photos.filter((entry) => KEPT_WITHOUT_LICENCE.includes(entry.id))) {
    assert.ok(photo.auteur, `${photo.id} : auteur manquant`);
    assert.match(photo.source ?? '', /^https:\/\//, `${photo.id} : lien manquant`);
  }
});

test('chaque tête que le jeu dessine a son crédit', () => {
  const credited = new Set(credits.photos.map((photo) => photo.id));
  for (const [id, character] of Object.entries(manifest.personnages)) {
    for (const head of [id, ...Object.keys(character.visages ?? {}).map((face) => `${id}.${face}`)]) assert.ok(credited.has(head), `${head} : tête sans crédit`);
  }
  for (const file of readdirSync('assets/game/personnages').filter((name) => name.endsWith('.webp'))) assert.ok(credited.has(file.slice(0, -5)), `${file} : image sans crédit`);
});

test('les têtes des cinématiques créditées existent, et aucune autre photo ne traîne dans leur dossier', () => {
  const listed = (JSON.parse(readFileSync('data/collecte/photos_cinematiques.json', 'utf8')) as { fichiers: string[] }[]).flatMap((entry) => entry.fichiers);
  for (const file of listed) assert.ok(existsSync(join('assets/game', file)), `${file} : fichier absent`);
  const careers = new Set(listed.map((file) => file.split('/')[1]));
  for (const career of careers) {
    for (const file of readdirSync(join('assets/game/cinematiques', career, 'img')).filter((name) => /\.(photo|vert)\.webp$/.test(name))) {
      assert.ok(listed.includes(`cinematiques/${career}/img/${file}`), `cinematiques/${career}/img/${file} : photo sans crédit`);
    }
  }
});

test('le texte de la licence GFDL, qui doit accompagner l\'œuvre, est servi par le site', () => {
  assert.match(readFileSync(join('assets/game', LICENCE_LINKS['GFDL 1.2']), 'utf8'), /GNU Free Documentation License\s+Version 1\.2/);
});
