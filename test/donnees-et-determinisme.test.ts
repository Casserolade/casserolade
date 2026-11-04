import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CARDS, TOKENS } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import { HEROES } from '../src/data/heroes.ts';
import { SPELLS } from '../src/data/sorts.ts';
import type { Action, Camp, Counter, Effect, Keyword, Target, Trigger } from '../src/engine/types.ts';

/*
 * Le contenu s'écrit en lignes de données : une faute de frappe dans un identifiant ne doit jamais passer en
 * silence. Ces tables sont complètes par construction : le compilateur refuse le test si un déclencheur, une
 * cible, une action, un mot-clé ou un camp est ajouté au moteur sans y être ajouté ici.
 */
const TRIGGERS: Record<Trigger, true> = {
  annonce: true, fin_tour: true, debut_tour: true, joue: true, vente: true, vente_allie: true, sort: true, actualise: true, debauche: true,
  rallie: true, casserole_recue: true, depense: true, celebration: true, droit_de_reponse: true, debut_combat: true, heritage: true,
  riposte: true, meeting: true, tue: true, revanche: true, immunite_perdue: true, aura: true,
};
const TARGETS: Record<Target, true> = {
  soi: true, voisins: true, meme_camp: true, camp: true, allies: true, autres: true, autres_camp: true, premier_allie: true, dernier_allie: true,
  allie_suivant: true, dores: true, cible: true, aleatoire: true, joue: true, declencheur: true, main: true, toute_la_main: true,
  premier_ennemi: true, dernier_ennemi: true, tous_ennemis: true, ennemi_aleatoire: true, joueur: true,
};
const ACTIONS: Record<Action['do'], true> = {
  buff: true, buff_par_allie: true, buff_par_camp: true, buff_par_ralliement: true, degats: true, invoquer: true, budget: true, mot_cle: true,
  retirer: true, basculer: true, exiler: true, oublier: true, transmettre: true, carte: true, decouvrir: true, camp_buff: true, boutique_buff: true,
  tract_bonus: true, jouer_tract: true, debaucher: true, dorer: true, detruire: true, sacrifier: true, declencher: true, doubler: true,
  compteur: true, scandale_plus: true, actualiser: true, actualisations_gratuites: true, budget_max: true, pari_defaite: true, congres: true, butin: true,
};
const KEYWORDS: Record<Keyword, true> = {
  immunite: true, porte_parole: true, cumul: true, polemique: true, retour: true, ni_droite_ni_gauche: true, ralliement: true, vedette: true,
};
const CAMPS: Record<Camp, true> = { insoumis: true, socialistes: true, ecologistes: true, macronie: true, republicains: true, rn: true, reconquete: true, civile: true };
const COUNTERS: Record<Counter, true> = { tracts: true, ecologistes_joues: true, dores_joues: true, casseroles: true, debauchages: true };

const cardIds = new Set(CARDS.map((c) => c.id));
const tokenIds = new Set(Object.keys(TOKENS));
const spellIds = new Set(SPELLS.map((s) => s.id));

function effectProblems(owner: string, e: Effect): string[] {
  const out: string[] = [];
  const at = `${owner} (${e.when} → ${e.do})`;
  if (!(e.when in TRIGGERS)) out.push(`${at} : déclencheur inconnu`);
  if (!(e.to in TARGETS)) out.push(`${at} : cible inconnue ${e.to}`);
  if (!(e.do in ACTIONS)) out.push(`${at} : action inconnue`);
  if (e.camp && !(e.camp in CAMPS)) out.push(`${at} : camp inconnu ${e.camp}`);
  // Le même champ `card` sert de filtre (sort lancé, Revanche, gain de camp), sauf pour l'action « carte », où c'est la carte donnée.
  if (e.do !== 'carte' && e.card && !cardIds.has(e.card) && !tokenIds.has(e.card) && !spellIds.has(e.card)) out.push(`${at} : carte filtrée inconnue ${e.card}`);
  if (e.n !== undefined && !(Number.isInteger(e.n) && e.n >= 1)) out.push(`${at} : n = ${e.n}`);
  switch (e.do) {
    case 'invoquer':
      if (!tokenIds.has(e.token) && !cardIds.has(e.token)) out.push(`${at} : jeton inconnu ${e.token}`);
      if (!(Number.isInteger(e.count) && e.count >= 1)) out.push(`${at} : ${e.count} invocations`);
      break;
    case 'carte':
      if (!cardIds.has(e.card) && !spellIds.has(e.card) && !['sort_aleatoire', 'copie'].includes(e.card)) out.push(`${at} : carte donnée inconnue ${e.card}`);
      break;
    case 'mot_cle':
    case 'retirer':
    case 'basculer':
      if (!(e.keyword in KEYWORDS)) out.push(`${at} : mot-clé inconnu ${e.keyword}`);
      break;
    case 'decouvrir':
      if (!['serviteur', 'sort'].includes(e.quoi)) out.push(`${at} : découverte de ${e.quoi}`);
      if (e.declencheur && !(e.declencheur in TRIGGERS)) out.push(`${at} : déclencheur de découverte inconnu ${e.declencheur}`);
      break;
    case 'compteur':
      if (!(e.compteur in COUNTERS)) out.push(`${at} : compteur inconnu ${e.compteur}`);
      break;
    default:
      break;
  }
  return out;
}

test('chaque ligne de données ne parle que de ce qui existe : identifiants, déclencheurs, cibles, actions, mots-clés', () => {
  const problems: string[] = [];
  const unique = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${kind} en double : ${id}`);
      seen.add(id);
    }
  };
  unique('carte', [...CARDS.map((c) => c.id), ...Object.keys(TOKENS)]);
  unique('sort', SPELLS.map((s) => s.id));
  unique('casserole', CASSEROLES.map((c) => c.id));
  unique('héros', HEROES.map((h) => h.id));
  for (const card of [...CARDS, ...Object.values(TOKENS)]) {
    if (!(card.camp in CAMPS)) problems.push(`${card.id} : camp inconnu ${card.camp}`);
    if (!(Number.isInteger(card.tier) && card.tier >= 1 && card.tier <= 6)) problems.push(`${card.id} : échelon ${card.tier}`);
    if (!(Number.isInteger(card.atk) && card.atk >= 0 && Number.isInteger(card.hp) && card.hp >= 1)) problems.push(`${card.id} : ${card.atk}/${card.hp}`);
    for (const k of card.keywords ?? []) if (!(k in KEYWORDS)) problems.push(`${card.id} : mot-clé inconnu ${k}`);
    for (const e of card.effects ?? []) problems.push(...effectProblems(card.id, e));
  }
  for (const spell of SPELLS) {
    if (!(Number.isInteger(spell.cost) && spell.cost >= 0)) problems.push(`sort ${spell.id} : coût ${spell.cost}`);
    for (const e of spell.effects) problems.push(...effectProblems(`sort ${spell.id}`, e));
  }
  for (const c of CASSEROLES) {
    if (!cardIds.has(c.owner)) problems.push(`casserole ${c.id} : propriétaire inconnu ${c.owner}`);
    if (c.summon && !tokenIds.has(c.summon)) problems.push(`casserole ${c.id} : jeton inconnu ${c.summon}`);
    for (const k of c.keywords ?? []) if (!(k in KEYWORDS)) problems.push(`casserole ${c.id} : mot-clé inconnu ${k}`);
    if (!(Number.isInteger(c.cost) && c.cost >= 0)) problems.push(`casserole ${c.id} : coût ${c.cost}`);
    if (c.charges !== undefined && !(Number.isInteger(c.charges) && c.charges >= 0)) problems.push(`casserole ${c.id} : ${c.charges} charges`);
    for (const e of c.effects ?? []) problems.push(...effectProblems(`casserole ${c.id}`, e));
  }
  assert.deepEqual(problems, []);
});

/** Ni horloge, ni hasard caché, ni minuteur : le moteur, les bots et les données ne dépendent que de la graine. */
const FORBIDDEN = /\bMath\.random\b|\bDate\.now\b|\bnew Date\b|\bperformance\.now\b|\bsetTimeout\b|\bsetInterval\b|\bcrypto\./;

function sourcesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourcesUnder(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

test('le moteur, les bots et les données sont déterministes : rien que la graine', () => {
  const offenders: string[] = [];
  for (const file of ['src/engine', 'src/bots', 'src/data'].flatMap(sourcesUnder)) {
    // Les commentaires peuvent en parler ; le code, jamais.
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    code.split('\n').forEach((line, index) => {
      if (FORBIDDEN.test(line)) offenders.push(`${file}:${index + 1} ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});
