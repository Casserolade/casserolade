/**
 * Toutes les sources du jeu, en un fichier que la page « À propos » affiche à la demande : assets/game/sources.json.
 * - les phrases que le jeu affiche (src/data/phrases.ts), chacune avec sa source dans la collecte ;
 * - les vraies voix, les photos et les illustrations, d'après assets/game/credits.json ;
 * - les casseroles, avec leur fait et leur statut datés (src/data/casseroles.ts) ;
 * - les logos et les polices.
 * À lancer après tools/phrases/genere.ts et tools/graphisme/credits.py : node tools/sources/genere_sources.ts
 */
import fs from 'node:fs';
import { CARD_BY_ID } from '../../src/data/cards.ts';
import { CASSEROLES } from '../../src/data/casseroles.ts';
import { HERO_BY_ID } from '../../src/data/heroes.ts';
import { ANIMATEURS } from '../../src/data/animateurs.ts';
import { PHRASES } from '../../src/data/phrases.ts';
import { VOIX } from '../../src/data/voix.ts';
import { shownText } from '../phrases/shownText.ts';
import type { CollectedPhrase } from '../phrases/shownText.ts';

interface CollectedEntry { id: string; nom: string; saillies?: CollectedPhrase[]; phrases?: CollectedPhrase[] }

const OUTPUT = 'assets/game/sources.json';
const collected = [
  // The research files of the saillies stay with the internal tools: without them, only the published phrases count.
  ...(fs.existsSync('data/collecte/saillies') ? fs.readdirSync('data/collecte/saillies').filter((f) => f.endsWith('.json')).map((f) => `data/collecte/saillies/${f}`) : []),
  ...['gauche', 'centre', 'droite', 'marges'].map((f) => `data/collecte/petites_phrases_${f}.json`),
];

/** Who a game id is: a card, a hero or a host. */
function nameOf(id: string): string {
  return CARD_BY_ID[id]?.name ?? HERO_BY_ID[id]?.name ?? ANIMATEURS.find((a) => a.id === id)?.nom ?? id;
}

/** Where each shown line comes from, by person and words: the first record that shows these exact words. */
function originsOfLines(): Map<string, CollectedPhrase> {
  const origins = new Map<string, CollectedPhrase>();
  for (const file of collected) {
    if (!fs.existsSync(file)) continue;
    for (const entry of JSON.parse(fs.readFileSync(file, 'utf8')) as CollectedEntry[]) {
      for (const phrase of [...(entry.saillies ?? []), ...(entry.phrases ?? [])]) {
        const shown = shownText(phrase);
        if (shown && !origins.has(`${entry.id}|${shown}`)) origins.set(`${entry.id}|${shown}`, phrase);
      }
    }
  }
  return origins;
}

/** A photo's caption: whose face, and which one (« Louis Aliot, qui rit »), or the casserole it illustrates. */
const FACES: Record<string, string> = { rire: 'qui rit', aie: 'qui prend un coup', choc: 'sous le choc' };
function photoName(p: Record<string, string | null>): string {
  const [id, face] = String(p.id ?? '').split('.');
  if (!p.nom) return `Casserole « ${CASSEROLES.find((c) => c.id === id)?.name ?? id} »`;
  return face ? `${p.nom}, ${FACES[face] ?? face}` : p.nom;
}

function lines() {
  const origins = originsOfLines();
  return Object.entries(PHRASES).flatMap(([id, moments]) => {
    const said = [...new Set(Object.values(moments).flat())];
    return said.map((texte) => {
      const origin = origins.get(`${id}|${texte}`);
      const links = [origin?.source, ...(origin?.sources ?? [])].filter((url): url is string => Boolean(url && url.startsWith('http')));
      return { id, qui: nameOf(id), texte, date: origin?.date ?? '', contexte: origin?.contexte ?? '', sources: [...new Set(links)] };
    });
  }).sort((a, b) => a.qui.localeCompare(b.qui, 'fr') || a.texte.localeCompare(b.texte, 'fr'));
}

function casseroles() {
  return CASSEROLES.map((c) => ({ id: c.id, personne: c.owner, qui: nameOf(c.owner), nom: c.name, citation: c.citation ?? '', fait: c.fait, statut: c.statut }))
    .sort((a, b) => a.qui.localeCompare(b.qui, 'fr') || a.nom.localeCompare(b.nom, 'fr'));
}

const credits = JSON.parse(fs.readFileSync('assets/game/credits.json', 'utf8'));
const sources = {
  genere: new Date().toISOString().slice(0, 10),
  phrases: lines(),
  casseroles: casseroles(),
  // `personne` and `casserole` tie each credit to what it shows: the bestiary lists them under each card.
  voix: (credits.sons ?? []).map((s: Record<string, string>) => {
    const voice = VOIX.find((v) => v.fichier === s.id);
    return { nom: s.nom, phrase: voice?.phrase ?? '', personne: voice?.personne ?? '', casserole: voice?.casserole ?? '', auteur: s.auteur ?? '', source: s.source ?? '', date: s.date ?? '' };
  }),
  photos: [
    ...(credits.photos ?? []).map((p: Record<string, string | null>) => ({ ...p, personne: String(p.id ?? '').split('.')[0] })),
    ...(credits.illustrations ?? []).map((p: Record<string, string | null>) => ({ ...p, casserole: p.id })),
  ].map((p: Record<string, string | null>) => ({
    nom: photoName(p), personne: p.personne ?? '', casserole: p.casserole ?? '', auteur: p.auteur ?? '', licence: p.licence === 'inconnue' ? '' : p.licence ?? '', source: p.source ?? '',
  })),
  logos: credits.logos ?? [],
  polices: credits.polices ?? [],
};
fs.writeFileSync(OUTPUT, JSON.stringify(sources));
const sansSource = sources.phrases.filter((p) => p.sources.length === 0).length;
console.log(`${OUTPUT} : ${sources.phrases.length} phrases (${sansSource} sans lien), ${sources.casseroles.length} casseroles, ${sources.voix.length} voix, ${sources.photos.length} photos`);
