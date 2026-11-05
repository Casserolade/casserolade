/**
 * Génère src/data/phrases.ts depuis la collecte : data/collecte/petites_phrases_*.json et les
 * saillies de data/collecte/saillies/*.json. Seules les phrases vérifiées entrent dans le jeu, ou
 * celles dont la vraie voix a été validée à l'écoute (l'enregistrement en est la source). Dans chaque
 * moment, les phrases qui ont leur son passent en tête : ce sont elles qu'on veut entendre.
 * À lancer après tools/collecte/voix_jeu.py :
 *   node tools/phrases/genere.ts
 */
import fs from 'node:fs';
import { voixPourPhrase } from '../../src/data/trouverVoix.ts';

import { shownText } from './shownText.ts';
import type { CollectedPhrase as Phrase } from './shownText.ts';

interface Entry { id: string; nom: string; phrases: Phrase[]; meilleure?: number }
interface SaillieEntry { id: string; nom: string; saillies: Phrase[] }

const files = ['gauche', 'centre', 'droite', 'marges'].map((f) => `data/collecte/petites_phrases_${f}.json`);
const saillieDir = 'data/collecte/saillies';
const saillieFiles = fs.existsSync(saillieDir) ? fs.readdirSync(saillieDir).filter((f) => f.endsWith('.json')).sort().map((f) => `${saillieDir}/${f}`) : [];
const out: Record<string, Record<string, string[]>> = {};

function addPhrases(id: string, phrases: Phrase[]): void {
  const moments = (out[id] ??= {});
  for (const p of phrases) {
    for (const m of p.moments) (moments[m] ??= []).includes(p.texte) || moments[m].push(p.texte);
  }
}

// Les saillies d'abord : trash, et souvent avec leur son.
for (const file of saillieFiles) {
  for (const entry of JSON.parse(fs.readFileSync(file, 'utf8')) as SaillieEntry[]) {
    const shown = entry.saillies.flatMap((p) => {
      const texte = shownText(p);
      return texte === null ? [] : [{ ...p, texte }];
    });
    addPhrases(entry.id, shown.filter((p) => p.fiabilite === 'verifie' || voixPourPhrase(entry.id, p.texte)));
  }
}
for (const file of files) {
  for (const entry of JSON.parse(fs.readFileSync(file, 'utf8')) as Entry[]) {
    const shown = entry.phrases.map((p) => {
      const texte = shownText(p);
      return texte === null ? null : { ...p, texte };
    });
    const verified = shown.filter((p): p is Phrase => p !== null && p.fiabilite === 'verifie');
    if (verified.length === 0) continue;
    const best = typeof entry.meilleure === 'number' ? shown[entry.meilleure] : null;
    // La meilleure phrase de Célébration passe en tête, si elle est vérifiée.
    addPhrases(entry.id, best && best.fiabilite === 'verifie' ? [best, ...verified.filter((p) => p !== best)] : verified);
  }
}
// Dans chaque moment, les phrases qui ont leur vraie voix passent devant (tri stable).
for (const [id, moments] of Object.entries(out)) {
  for (const list of Object.values(moments)) list.sort((a, b) => Number(!voixPourPhrase(id, a)) - Number(!voixPourPhrase(id, b)));
}
for (const id of Object.keys(out)) if (Object.keys(out[id]).length === 0) delete out[id];
const body = JSON.stringify(out, null, 2);
fs.writeFileSync('src/data/phrases.ts', `/**
 * Les petites phrases du jeu, par personne et par moment : seulement les citations vérifiées,
 * mot pour mot. Généré par tools/phrases/genere.ts depuis data/collecte/petites_phrases_*.json et saillies/*.json :
 * ne pas modifier à la main. Les sources sont dans la collecte.
 */
export type Moment = 'pose' | 'casserole' | 'prison' | 'mort' | 'celebration' | 'heros' | 'achat' | 'actualiser' | 'echelon' | 'triple' | 'victoire' | 'defaite' | 'elimination' | 'attente';

export const PHRASES: Record<string, Partial<Record<Moment, string[]>>> = ${body};

/** Une phrase de cette personne pour ce moment, une autre à chaque tour. Après le combat, la phrase se tire au hasard (src/client/tools/afterCombatSpeech.ts). */
export function phraseFor(id: string, moment: Moment, turn = 0): string | null {
  const list = PHRASES[id]?.[moment];
  if (!list || list.length === 0) return null;
  return list[turn % list.length];
}
`);
console.log(Object.keys(out).length, 'personnes avec des phrases vérifiées');
