/**
 * Génère src/data/phrases.ts depuis la collecte (data/collecte/petites_phrases_*.json).
 * Seules les phrases vérifiées entrent dans le jeu ; les autres restent dans la collecte.
 *   node tools/phrases/genere.ts
 */
import fs from 'node:fs';

interface Phrase { texte: string; moments: string[]; fiabilite: string; audio?: string }
interface Entry { id: string; nom: string; phrases: Phrase[]; meilleure?: number }

const files = ['gauche', 'centre', 'droite', 'marges'].map((f) => `data/collecte/petites_phrases_${f}.json`);
const out: Record<string, Record<string, string[]>> = {};
for (const file of files) {
  for (const entry of JSON.parse(fs.readFileSync(file, 'utf8')) as Entry[]) {
    const verified = entry.phrases.filter((p) => p.fiabilite === 'verifie');
    if (verified.length === 0) continue;
    const moments: Record<string, string[]> = {};
    const best = typeof entry.meilleure === 'number' ? entry.phrases[entry.meilleure] : undefined;
    // La meilleure phrase de Célébration passe en tête, si elle est vérifiée.
    const ordered = best && best.fiabilite === 'verifie' ? [best, ...verified.filter((p) => p !== best)] : verified;
    for (const p of ordered) {
      for (const m of p.moments) (moments[m] ??= []).includes(p.texte) || moments[m].push(p.texte);
    }
    out[entry.id] = moments;
  }
}
const body = JSON.stringify(out, null, 2);
fs.writeFileSync('src/data/phrases.ts', `/**
 * Les petites phrases du jeu, par personne et par moment : seulement les citations vérifiées,
 * mot pour mot. Généré par tools/phrases/genere.ts depuis data/collecte/petites_phrases_*.json :
 * ne pas modifier à la main. Les sources sont dans la collecte, et dans docs/gameplay/petites-phrases.md.
 */
export type Moment = 'pose' | 'casserole' | 'prison' | 'mort' | 'celebration' | 'heros' | 'achat' | 'actualiser' | 'echelon' | 'triple' | 'victoire' | 'defaite' | 'elimination' | 'attente';

export const PHRASES: Record<string, Partial<Record<Moment, string[]>>> = ${body};

/** Une phrase de cette personne pour ce moment : la première pour la Célébration, sinon au tour suivant. */
export function phraseFor(id: string, moment: Moment, turn = 0): string | null {
  const list = PHRASES[id]?.[moment];
  if (!list || list.length === 0) return null;
  return list[turn % list.length];
}
`);
console.log(Object.keys(out).length, 'personnes avec des phrases vérifiées');
