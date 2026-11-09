import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CARRIERES } from '../src/histoire/carrieres.ts';
import type { CinematiqueComposee } from '../src/data/histoire/cinematique.ts';

/**
 * The HyperFrames episodes of the careers (9 November 2026) are modules of the game, played on its page by the same
 * player as the puppets: nothing in them may need a frame, an inline script or a global style, which the site's
 * security policy or its other screens would not bear.
 */
const COMPOSED = join('src', 'client', 'cutscenes', 'composed');
const episodes = CARRIERES.flatMap((carriere) => carriere.cinematiques.filter((c): c is CinematiqueComposee => 'episode' in c));

async function loadEpisode(name: string): Promise<{ duration: number; styles: string; markup: string }> {
  const module = (await import(pathToFileURL(join(COMPOSED, `${name}.ts`)).href)) as { episode: { duration: number; styles: string; markup: string } };
  return module.episode;
}

test('each HyperFrames cutscene of a career has its module, its sound, and the duration of its data', async () => {
  assert.ok(episodes.length > 0);
  for (const scene of episodes) {
    const episode = await loadEpisode(scene.episode);
    assert.ok(Math.abs(episode.duration - scene.duree) <= 1, `${scene.id}: ${episode.duration} s for ${scene.duree} s`);
    assert.ok(existsSync(join('assets', 'game', scene.son)), `${scene.id}: no sound ${scene.son}`);
  }
});

test('an episode brings no script and no style that reaches beyond its own stage', async () => {
  for (const scene of episodes) {
    const { styles, markup } = await loadEpisode(scene.episode);
    assert.doesNotMatch(markup, /<script/i, scene.id);
    assert.doesNotMatch(markup, /<iframe/i, scene.id);
    for (const rule of styles.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
      const selectors = rule.split('{')[0].trim();
      if (!selectors || selectors.startsWith('@')) continue;
      for (const selector of selectors.split(',')) assert.match(selector.trim(), /^(\.composed-|#[\w-]+|\.composed-root)/, `${scene.id}: « ${selector.trim()} » reaches the game's page`);
    }
  }
});

test('every image an episode names is served by the game', () => {
  for (const file of readdirSync(join(COMPOSED, 'durif'))) {
    const text = readFileSync(join(COMPOSED, 'durif', file), 'utf8');
    for (const [, path] of text.matchAll(/"(\/[\w/.-]+\.(?:webp|png))"/g)) assert.ok(existsSync(join('assets', 'game', path)), `${file}: ${path}`);
    assert.doesNotMatch(text, /assets\/img|\.\.\/\.\.\//, file);
  }
});
