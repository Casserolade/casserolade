/**
 * Vérifie les carrières de `src/data/histoire/carrieres/` : que tout ce qu'elles nomment existe dans le jeu (plateaux,
 * marionnettes, expressions, vraies voix, animateurs, contextes, décors, accessoires), que les cinématiques tiennent
 * dans leur durée et que leurs visages reviennent à la base, que le module et le son d'une cinématique HyperFrames
 * existent (jamais une vidéo), qu'il y a un tour scénarisé et un boss.
 *   node tools/histoire/valider_carrieres.ts            toutes les carrières
 *   node tools/histoire/valider_carrieres.ts melenchon   une seule
 * Les erreurs empêchent l'intégration ; les conseils non.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { VOIX } from '../../src/data/voix.ts';
import { DUREES_VOIX } from '../../src/data/dureesVoix.ts';
import { PLATEAUX, SECOND_TOUR } from '../../src/data/plateaux.ts';
import { ANIMATEURS } from '../../src/data/animateurs.ts';
import { CONTEXTS, HEROES } from '../../src/data/heroes.ts';
import { ACCESSOIRES, BRUITAGES, DECORS, MUSIQUES, POSES } from '../../src/data/histoire/cinematique.ts';
import type { Action, Cinematique, CinematiqueComposee } from '../../src/data/histoire/cinematique.ts';
import type { Carriere, ChapitreCarriere } from '../../src/data/histoire/carriere.ts';

const RACINE = join(import.meta.dirname, '..', '..');
const DOSSIER = process.env.CARRIERES_DIR ?? join(RACINE, 'src', 'data', 'histoire', 'carrieres');
const manifest = JSON.parse(readFileSync(join(RACINE, 'assets', 'game', 'manifest.json'), 'utf8')) as { personnages: Record<string, { visages?: Record<string, unknown> }> };

/** Les valeurs d'une union de chaînes, lues dans le source (les types n'existent pas à l'exécution). */
function unionDe(fichier: string, type: string): Set<string> {
  const texte = readFileSync(join(RACINE, fichier), 'utf8');
  const debut = texte.indexOf(`export type ${type} =`);
  const suivant = texte.indexOf('\nexport ', debut + 1);
  const fin = suivant === -1 ? texte.length : suivant;
  return new Set([...texte.slice(debut, fin).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
}

const DECLENCHEURS = unionDe('src/data/histoire/chapitres.ts', 'Declencheur');
const OBJECTIFS = unionDe('src/data/histoire/chapitres.ts', 'Objectif');
const NIVEAUX = new Set(['debutant', 'facile', 'moyen', 'difficile']);
const MOMENTS = new Set(['intro', 'avant_chapitre', 'tour_scenarise', 'avant_boss', 'victoire', 'defaite']);
const STYLES = new Set(['guignol', 'benny_hill', 'jt', 'muet']);
const EXPRESSIONS = new Set(['base', 'rire', 'aie', 'choc']);
const BORDS = new Set(['gauche', 'droite', 'haut', 'bas']);
const ALLURES = new Set(['marche', 'court', 'sprint', 'glisse', 'recule']);
const ASPECTS = new Set(['normal', 'hologramme', 'fantome', 'geant', 'minuscule', 'renverse']);
const TRANSITIONS = new Set(['coupe', 'fondu', 'volet']);
const OBLIGATOIRES = ['intro', 'tour_scenarise', 'avant_boss', 'victoire'];
const PLATEAU_IDS = new Set([...PLATEAUX.map((p) => p.id), SECOND_TOUR.id]);
const DECOR_IDS = new Set<string>([...PLATEAU_IDS, ...DECORS]);
const HEROS_IDS = new Set(HEROES.map((h) => h.id));
const ANIMATEUR_IDS = new Set(ANIMATEURS.map((a) => a.id));
const CONTEXTE_IDS = new Set(CONTEXTS.map((c) => c.id));
const VOIX_PAR_FICHIER = new Map(VOIX.map((v) => [v.fichier, v]));
const BOSS_IMPOSES: Record<string, string> = { melenchon: 'lepen', lepen: 'melenchon' };
/** Les rôles que chaque forme d'action nomme. */
const CHAMPS_ROLE = ['entre', 'sort', 'va', 'place', 'regarde', 'pose', 'saute', 'tremble', 'tourne', 'tombe', 'trebuche', 'releve', 's_envole', 'retourne', 'tape', 'sur', 'bastonne', 'gratte', 'coup_de_pied', 'etourdi', 'derape', 'disparait', 'boum', 'aspect', 'visage', 'dit', 'pense', 'tenue_par', 'par', 'a'] as const;
const FORMES = ['entre', 'sort', 'va', 'place', 'regarde', 'pose', 'poursuite', 'saute', 'tremble', 'tourne', 'tombe', 'trebuche', 'releve', 's_envole', 'retourne', 'tape', 'bastonne', 'gratte', 'coup_de_pied', 'etourdi', 'derape', 'disparait', 'boum', 'aspect', 'visage', 'dit', 'pense', 'narrateur', 'animateur', 'foule', 'pancarte', 'titre', 'bandeau', 'accessoire', 'bruitage', 'secousse', 'eclair', 'confettis', 'accelere'];

let erreurs = 0;
let conseils = 0;

function erreur(ou: string, message: string): void {
  erreurs++;
  console.log(`ERREUR  ${ou} : ${message}`);
}

function conseil(ou: string, message: string): void {
  conseils++;
  console.log(`conseil ${ou} : ${message}`);
}

/** La durée d'une réplique : son extrait, ou le temps de la lire. */
function dureeDe(action: Action): number {
  if (!('dit' in action)) return 0;
  if ('voix' in action && action.voix) return DUREES_VOIX[action.voix] ?? 3;
  return Math.max(1.6, action.texte.length * 0.07);
}

function validerCinematique(c: Cinematique, carriere: Carriere): void {
  const ou = `${carriere.heros} › ${c.id}`;
  if (c.heros !== carriere.heros) erreur(ou, `heros vaut « ${c.heros} », pas « ${carriere.heros} »`);
  if (!MOMENTS.has(c.moment)) erreur(ou, `moment inconnu « ${c.moment} »`);
  if (!STYLES.has(c.style)) erreur(ou, `style inconnu « ${c.style} »`);
  if (!DECOR_IDS.has(c.decor)) erreur(ou, `décor inconnu « ${c.decor} » (plateaux du jeu ou DECORS)`);
  if (c.musique && !(MUSIQUES as readonly string[]).includes(c.musique)) erreur(ou, `musique inconnue « ${c.musique} »`);
  // Court : vingt à vingt-cinq secondes (« un peu longuet » à quarante), une défaite plus vite encore.
  const max = c.moment === 'defaite' ? 18 : 30;
  if (c.duree < 8 || c.duree > 45) erreur(ou, `durée ${c.duree} s hors de 8 à 45 s`);
  else if (c.duree > max) conseil(ou, `durée ${c.duree} s : ${max} s au plus pour ce moment`);
  if (c.chapitre && !carriere.chapitres.some((ch) => ch.id === c.chapitre)) erreur(ou, `chapitre inconnu « ${c.chapitre} »`);

  const roles = new Map<string, string>();
  for (const r of c.distribution) {
    if (roles.has(r.role)) erreur(ou, `rôle en double « ${r.role} »`);
    roles.set(r.role, r.personnage);
    if (r.personnage === 'ppda') erreur(ou, 'Patrick Poivre d\'Arvor ne doit pas figurer dans les cinématiques');
    if (!r.personnage.startsWith('pancarte:') && !manifest.personnages[r.personnage]) erreur(ou, `personnage sans marionnette « ${r.personnage} » (sinon « pancarte:Prénom Nom »)`);
  }
  const accessoires = new Set<string>();
  for (const a of c.accessoires ?? []) {
    if (accessoires.has(a.id)) erreur(ou, `accessoire en double « ${a.id} »`);
    accessoires.add(a.id);
    if (!(ACCESSOIRES as readonly string[]).includes(a.type)) erreur(ou, `accessoire de type inconnu « ${a.type} »`);
  }

  let avant = -1;
  const expressions = new Map<string, string>();
  let phraseDuHeros = false;
  for (const [i, plan] of c.plans.entries()) {
    const ouPlan = `${ou} › plan ${i + 1} (${plan.a} s)`;
    if (plan.a < avant) erreur(ouPlan, 'les plans doivent être rangés par `a` croissant');
    avant = plan.a;
    if (plan.a < 0 || plan.a >= c.duree) erreur(ouPlan, `départ hors de la cinématique (0 à ${c.duree} s)`);
    if (plan.cadre && typeof plan.cadre === 'object' && !roles.has(plan.cadre.sur)) erreur(ouPlan, `gros plan sur un rôle inconnu « ${plan.cadre.sur} »`);
    if (plan.decor && !DECOR_IDS.has(plan.decor)) erreur(ouPlan, `décor inconnu « ${plan.decor} »`);
    if (plan.transition && !TRANSITIONS.has(plan.transition)) erreur(ouPlan, `transition inconnue « ${plan.transition} »`);
    for (const action of plan.actions) {
      const forme = FORMES.find((f) => f in action);
      if (!forme) {
        erreur(ouPlan, `action inconnue ${JSON.stringify(action)}`);
        continue;
      }
      const record = action as Record<string, unknown>;
      for (const champ of CHAMPS_ROLE) {
        if (champ === 'par' && (forme === 'entre' || forme === 'sort')) continue;
        if (champ === 'par' && forme === 'accessoire' && (record.fait === 'traverse' || record.fait === 'sort')) continue;
        if (champ === 'boum' && forme === 'boum' && !roles.has(String(record.boum)) && typeof record.x === 'number') continue;
        if (champ === 'a' && forme !== 'accessoire') continue;
        if (champ === 'regarde' && forme === 'place') continue;
        if (champ === 'pose' && forme !== 'pose') continue;
        const valeur = record[champ];
        if (typeof valeur === 'string' && !roles.has(valeur)) erreur(ouPlan, `« ${forme} » nomme un rôle inconnu « ${valeur} »`);
      }
      if (forme === 'poursuite') for (const role of action.poursuite as string[]) if (!roles.has(role)) erreur(ouPlan, `poursuite d'un rôle inconnu « ${role} »`);
      if (typeof record.allure === 'string' && !ALLURES.has(record.allure)) erreur(ouPlan, `allure inconnue « ${record.allure} »`);
      if (forme === 'pose' && !(POSES as readonly string[]).includes(record.quoi as string)) erreur(ouPlan, `pose inconnue « ${String(record.quoi)} »`);
      if (forme === 'aspect' && !ASPECTS.has(record.comme as string)) erreur(ouPlan, `aspect inconnu « ${String(record.comme)} »`);
      if (forme === 'regarde' && !['gauche', 'droite', 'face'].includes(record.vers as string)) erreur(ouPlan, `regarde vers « ${String(record.vers)} » : gauche, droite ou face`);
      if (typeof record.profondeur === 'number' && (record.profondeur < 0 || record.profondeur > 100)) erreur(ouPlan, '`profondeur` va de 0 à 100');
      if ((forme === 'entre' || forme === 'sort') && !BORDS.has(record.par as string)) erreur(ouPlan, `bord inconnu « ${String(record.par)} »`);
      if (forme === 'accessoire' && (record.fait === 'traverse' || record.fait === 'sort') && record.par !== undefined && !['gauche', 'droite'].includes(record.par as string)) erreur(ouPlan, `un accessoire traverse ou sort par la gauche ou la droite, pas « ${String(record.par)} »`);
      if ('x' in action && (typeof action.x !== 'number' || action.x < 0 || action.x > 100)) erreur(ouPlan, '`x` va de 0 à 100');
      if (forme === 'animateur') {
        if (record.animateur === 'ppda') erreur(ouPlan, 'Patrick Poivre d\'Arvor ne doit pas figurer dans les cinématiques');
        else if (!ANIMATEUR_IDS.has(record.animateur as string)) erreur(ouPlan, `animateur inconnu « ${String(record.animateur)} »`);
      }
      if (forme === 'bruitage' && !(BRUITAGES as readonly string[]).includes(record.bruitage as string)) erreur(ouPlan, `bruitage inconnu « ${String(record.bruitage)} »`);
      if (forme === 'accessoire' && !accessoires.has(record.accessoire as string)) erreur(ouPlan, `accessoire non déclaré « ${String(record.accessoire)} »`);
      if (forme === 'visage') {
        const role = record.visage as string;
        const expression = record.expression as string;
        const personnage = roles.get(role) ?? '';
        if (!EXPRESSIONS.has(expression)) erreur(ouPlan, `expression inconnue « ${expression} »`);
        else if (expression !== 'base' && !manifest.personnages[personnage]?.visages?.[expression]) erreur(ouPlan, `${personnage} n'a pas l'expression « ${expression} »`);
        expressions.set(role, expression);
      }
      if (forme === 'dit') {
        const role = record.dit as string;
        const personnage = roles.get(role) ?? '';
        if (!String(record.texte ?? '').trim()) erreur(ouPlan, 'réplique vide');
        if ('invente' in action) {
          if (record.invente !== true) erreur(ouPlan, '`invente` vaut true');
        } else {
          if (!String(record.source ?? '').trim()) erreur(ouPlan, 'une vraie phrase a sa source (média et date) ; sinon `invente: true`');
          if (personnage === carriere.heros) phraseDuHeros = true;
        }
        if (typeof record.voix === 'string') {
          const voix = VOIX_PAR_FICHIER.get(record.voix);
          if (!voix) erreur(ouPlan, `voix inconnue « ${record.voix} »`);
          else if (voix.personne !== personnage) erreur(ouPlan, `la voix « ${record.voix} » est celle de ${voix.personne}, pas de ${personnage}`);
        }
        const fin = plan.a + Number(record.delai ?? 0) + dureeDe(action);
        if (fin > c.duree + 0.05) conseil(ouPlan, `la réplique finit à ${fin.toFixed(1)} s, après la fin (${c.duree} s)`);
      }
      if (forme === 'secousse' && ![1, 2, 3].includes(record.secousse as number)) erreur(ouPlan, 'secousse vaut 1, 2 ou 3');
      if (typeof record.delai === 'number' && plan.a + record.delai >= c.duree) erreur(ouPlan, 'l\'action part après la fin de la cinématique');
    }
  }
  for (const [role, expression] of expressions) if (expression !== 'base') erreur(ou, `le visage de « ${role} » ne revient pas à la base (« ${expression} » en dernier)`);
  if (!phraseDuHeros) conseil(ou, `aucune vraie petite phrase de ${carriere.heros} (avec \`source\`) dans cette cinématique`);
}

/** Une cinématique HyperFrames : son module exporté et son son, jamais une vidéo ; sa place, sa durée. */
function validerComposee(c: CinematiqueComposee, carriere: Carriere): void {
  const ou = `${carriere.heros} › ${c.id}`;
  if (c.heros !== carriere.heros) erreur(ou, `heros vaut « ${c.heros} », pas « ${carriere.heros} »`);
  if (!MOMENTS.has(c.moment)) erreur(ou, `moment inconnu « ${c.moment} »`);
  if (!c.titre?.trim()) erreur(ou, 'une cinématique HyperFrames a son titre');
  if (!existsSync(join(RACINE, 'src', 'client', 'cutscenes', 'composed', `${c.episode}.ts`))) erreur(ou, `module introuvable sous src/client/cutscenes/composed : « ${c.episode} »`);
  if (!/\.(mp3|ogg)$/.test(c.son) || !existsSync(join(RACINE, 'assets', 'game', c.son))) erreur(ou, `son introuvable sous assets/game : « ${c.son} »`);
  const max = c.moment === 'defaite' ? 18 : 30;
  if (c.duree < 8 || c.duree > max) erreur(ou, `durée ${c.duree} s hors de 8 à ${max} s`);
  if (c.chapitre && !carriere.chapitres.some((ch) => ch.id === c.chapitre)) erreur(ou, `chapitre inconnu « ${c.chapitre} »`);
}

function validerChapitre(ch: ChapitreCarriere, carriere: Carriere, dernier: boolean): void {
  const ou = `${carriere.heros} › chapitre ${ch.id}`;
  if (!ch.annee?.trim()) erreur(ou, '`annee` manque');
  if (!ch.election?.trim() || !ch.decouverte?.trim()) erreur(ou, '`election` et `decouverte` sont obligatoires');
  if (!ch.plateaux?.length) erreur(ou, 'aucun plateau');
  for (const p of ch.plateaux ?? []) if (!PLATEAU_IDS.has(p)) erreur(ou, `plateau inconnu « ${p} »`);
  if (!ch.adversaires?.length || ch.adversaires.length > 7) erreur(ou, 'de 1 à 7 adversaires');
  for (const n of ch.adversaires ?? []) if (!NIVEAUX.has(n)) erreur(ou, `niveau de bot inconnu « ${n} »`);
  for (const r of ch.rivaux ?? []) {
    if (!HEROS_IDS.has(r)) erreur(ou, `rival qui n'est pas un héros « ${r} »`);
    if (r === carriere.heros) erreur(ou, 'le héros ne peut pas être son propre rival');
  }
  if ((ch.rivaux?.length ?? 0) > (ch.adversaires?.length ?? 0)) erreur(ou, 'plus de rivaux que d\'adversaires');
  if (ch.placeRequise < 1 || ch.placeRequise > (ch.adversaires?.length ?? 0) + 1) erreur(ou, `placeRequise ${ch.placeRequise} impossible à cette table`);
  if (ch.contexteId && !CONTEXTE_IDS.has(ch.contexteId)) erreur(ou, `contexte inconnu « ${ch.contexteId} »`);
  for (const o of ch.objectifs ?? []) if (!OBJECTIFS.has(o.type)) erreur(ou, `objectif inconnu « ${o.type} »`);
  for (const l of ch.dialogues ?? []) {
    if (!DECLENCHEURS.has(l.quand)) erreur(ou, `déclencheur inconnu « ${l.quand} »`);
    if (l.qui !== 'narrateur' && !ANIMATEUR_IDS.has(l.qui)) erreur(ou, `« ${l.qui} » ne parle pas pendant la partie : le narrateur ou un animateur`);
    if (l.qui === 'ppda') erreur(ou, 'Patrick Poivre d\'Arvor ne doit pas figurer');
  }
  if (ch.scenarise) {
    if (!ch.scenarise.consigne?.trim() || !ch.scenarise.regle?.trim()) erreur(ou, 'le tour scénarisé a une consigne et une règle');
    if (ch.scenarise.mecanique === 'nouvelle' && !ch.scenarise.spec?.trim()) erreur(ou, 'une mécanique nouvelle a sa `spec`');
  }
  if (ch.scenario && !ch.scenarise && !ch.consigne?.trim()) erreur(ou, 'un chapitre qui a ses règles (`scenario`) les dit au joueur : `consigne`, ou le tour scénarisé');
  for (const [manche, evenement] of Object.entries(ch.scenario?.manches ?? {})) {
    if (evenement.enleve && evenement.enleve.retour <= Number(manche)) erreur(ou, `manche ${manche} : le retour doit venir après le départ`);
  }
  for (const id of [ch.avant, ch.apres]) if (id && !carriere.cinematiques.some((c) => c.id === id)) erreur(ou, `cinématique inconnue « ${id} »`);
  if (dernier) {
    if (!ch.boss) erreur(ou, 'le dernier chapitre est le duel contre le boss (`boss: true`)');
    const rival = ch.rivaux?.at(-1);
    if (rival && rival !== carriere.boss) conseil(ou, `le dernier rival (${rival}) n'est pas le boss (${carriere.boss})`);
  }
}

function valider(carriere: Carriere, fichier: string): void {
  const ou = carriere.heros ?? fichier;
  if (`${carriere.heros}.ts` !== fichier) erreur(ou, `le fichier ${fichier} doit porter le nom du héros`);
  if (!HEROS_IDS.has(carriere.heros)) erreur(ou, `héros inconnu « ${carriere.heros} »`);
  if (![1, 2, 3, 4, 5].includes(carriere.difficulte)) erreur(ou, 'difficulte de 1 à 5');
  if (!carriere.pourquoi?.trim() || !carriere.accroche?.trim()) erreur(ou, '`pourquoi` et `accroche` sont obligatoires');
  if (!HEROS_IDS.has(carriere.boss) || carriere.boss === carriere.heros) erreur(ou, `boss impossible « ${carriere.boss} »`);
  const impose = BOSS_IMPOSES[carriere.heros];
  if (impose && carriere.boss !== impose) erreur(ou, `le boss de ${carriere.heros} est ${impose}`);
  if ((carriere.faits ?? []).length < 3) erreur(ou, 'au moins 3 faits sourcés');
  for (const f of carriere.faits ?? []) if (!f.fait?.trim() || !f.source?.trim()) erreur(ou, `fait sans source : ${JSON.stringify(f).slice(0, 80)}`);
  const chapitres = carriere.chapitres ?? [];
  if (chapitres.length < 4 || chapitres.length > 6) erreur(ou, `${chapitres.length} chapitres : de 4 à 6`);
  const ids = new Set<string>();
  for (const ch of chapitres) {
    if (ids.has(ch.id)) erreur(ou, `chapitre en double « ${ch.id} »`);
    ids.add(ch.id);
  }
  const scenarises = chapitres.filter((ch) => ch.scenarise).length;
  if (scenarises !== 1) erreur(ou, `${scenarises} tours scénarisés : il en faut exactement un`);
  chapitres.forEach((ch, i) => validerChapitre(ch, carriere, i === chapitres.length - 1));
  const cines = new Set<string>();
  for (const c of carriere.cinematiques ?? []) {
    if (cines.has(c.id)) erreur(ou, `cinématique en double « ${c.id} »`);
    cines.add(c.id);
    if ('episode' in c) validerComposee(c, carriere);
    else validerCinematique(c, carriere);
  }
  for (const moment of OBLIGATOIRES) if (!(carriere.cinematiques ?? []).some((c) => c.moment === moment)) erreur(ou, `il manque la cinématique « ${moment} »`);
  if (!(carriere.cinematiques ?? []).some((c) => c.moment === 'victoire' && !c.chapitre)) erreur(ou, 'il manque la victoire de la carrière (une cinématique « victoire » sans chapitre)');
}

const demande = process.argv[2];
const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.ts') && (!demande || f === `${demande}.ts`));
if (demande && fichiers.length === 0) erreur(demande, `pas de fichier ${demande}.ts dans ${DOSSIER}`);
for (const fichier of fichiers) {
  try {
    const module = (await import(pathToFileURL(join(DOSSIER, fichier)).href)) as { carriere?: Carriere };
    if (!module.carriere) erreur(fichier, 'le fichier doit exporter `carriere`');
    else valider(module.carriere, fichier);
  } catch (e) {
    erreur(fichier, `import impossible : ${(e as Error).message}`);
  }
}
console.log(`${fichiers.length} carrière(s), ${erreurs} erreur(s), ${conseils} conseil(s)`);
process.exitCode = erreurs ? 1 : 0;
