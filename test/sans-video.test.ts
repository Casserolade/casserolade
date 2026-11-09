import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Jamais de vidéo dans le jeu (9 novembre 2026) : toute cinématique est dessinée en direct dans la page, en GSAP, ou par
 * une page HyperFrames que le lecteur cale sur son son. Aucun film ne se livre parmi les fichiers du jeu ni dans le dépôt.
 */
const VIDEO = /\.(mp4|webm|mov|mkv|avi|m4v)$/i;

function filesUnder(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true, recursive: true }).filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

test('aucune vidéo parmi les fichiers que le jeu charge', () => {
  assert.deepEqual(filesUnder('assets/game').filter((file) => VIDEO.test(file)), []);
});

test('aucune vidéo suivie par le dépôt', () => {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n');
  assert.deepEqual(tracked.filter((file) => VIDEO.test(file)), []);
});
