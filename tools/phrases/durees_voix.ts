/**
 * La durée de chaque vraie voix du jeu, en secondes, lue dans les fichiers par ffprobe : le client sait d'avance qu'un
 * extrait est trop long pour une Célébration. À relancer après tout ajout de voix :
 *   node tools/phrases/durees_voix.ts
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { VOIX } from '../../src/data/voix.ts';

const manifest = JSON.parse(readFileSync('assets/game/manifest.json', 'utf8')) as { sons?: { citations?: Record<string, string> } };
const citations = manifest.sons?.citations ?? {};
const lignes: string[] = [];
for (const { fichier } of VOIX) {
  const chemin = citations[fichier];
  if (!chemin) continue;
  const sortie = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `assets/game/${chemin}`], { encoding: 'utf8' });
  lignes.push(`  ${JSON.stringify(fichier)}: ${Number(sortie.trim()).toFixed(1)},`);
}
writeFileSync('src/data/dureesVoix.ts', `/**
 * La durée de chaque vraie voix, en secondes : une Célébration ne joue qu'un extrait court. Généré par
 * tools/phrases/durees_voix.ts depuis les fichiers du jeu : ne pas modifier à la main.
 */
export const DUREES_VOIX: Record<string, number> = {
${lignes.join('\n')}
};
`);
console.log(`${lignes.length} durées écrites dans src/data/dureesVoix.ts`);
