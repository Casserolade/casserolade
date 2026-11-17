import test from 'node:test';
import assert from 'node:assert/strict';
import { RAYONS, SUCCES } from '../src/data/succes.ts';
import type { Fait, Niveau } from '../src/data/succes.ts';
import { PARAMS } from '../src/data/params.ts';
import { HEROES, HERO_BY_ID } from '../src/data/heroes.ts';
import { CHAPITRES, OUTRE_TOMBE } from '../src/data/histoire/chapitres.ts';
import { CARRIERES } from '../src/histoire/carrieres.ts';
import { applyAction, createGame, viewFor } from '../src/engine/game.ts';
import { makeMinion } from '../src/engine/minion.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { bilanDePartie } from '../src/histoire/bilanDePartie.ts';
import type { Faits } from '../src/histoire/bilanDePartie.ts';
import { apresResultat, progresValide, progresVierge, titres } from '../src/histoire/succes.ts';
import type { Progres, Resultat } from '../src/histoire/succes.ts';
import { suivrePartie } from '../src/histoire/suiviDePartie.ts';

/** Une partie rapide ordinaire, perdue au milieu du tableau : aucun succès n'en sort. */
const BANALE: Faits = {
  place: 4, joueurs: 8, humains: 0, hote_public: 0,
  casseroles: 6, scandales: 1, oublis: 1, triples: 1, sorts: 20, actualisations: 12, renvois: 5, gels: 0, depenses: 110,
  plus_gros: 60, sondages_perdus: 38, sondages_au_plus_bas: -2, sondages: -2, manches: 14, echelon: 6,
  politiques: 7, dores: 2, camps: 3, meme_camp: 3, gauche_plurielle: 0, union_des_droites: 0, presidents: 0,
  porte_parole: 2, immunites: 1, vedettes: 2, casseroles_sur_un: 2, attaque_totale: 180,
};
/** Une victoire ordinaire : il lui reste des sondages, et elle en a perdu. */
const VICTOIRE: Faits = { ...BANALE, place: 1, sondages: 14, sondages_au_plus_bas: 14, sondages_perdus: 23, manches: 15 };

function partie(faits: Partial<Faits>, autres: Omit<Resultat, 'faits'> = {}): Resultat {
  return { faits: { ...BANALE, ...faits }, ...autres };
}

/** Une victoire, avec ce qui la distingue d'une victoire ordinaire. */
function victoire(faits: Partial<Faits>, autres: Omit<Resultat, 'faits'> = {}): Resultat {
  return { faits: { ...VICTOIRE, ...faits }, ...autres };
}

function ids(avant: Progres, r: Resultat): string[] {
  return apresResultat(avant, r).nouveaux.map((s) => s.id);
}

/** Joue des résultats à la suite, et rend la progression avec tout ce qui s'est débloqué en route. */
function suite(resultats: Resultat[], depart = progresVierge()): { progres: Progres; gagnes: string[] } {
  let progres = depart;
  const gagnes: string[] = [];
  for (const r of resultats) {
    const apres = apresResultat(progres, r);
    progres = apres.progres;
    gagnes.push(...apres.nouveaux.map((s) => s.id));
  }
  return { progres, gagnes };
}

test('chaque succès a un identifiant unique, un rayon, des faits et des chapitres qui existent', () => {
  assert.equal(new Set(SUCCES.map((s) => s.id)).size, SUCCES.length);
  assert.equal(new Set(SUCCES.map((s) => s.nom)).size, SUCCES.length, 'deux succès ne portent pas le même nom');
  const titresDonnes = SUCCES.flatMap((s) => (s.recompense ? [s.recompense.titre] : []));
  assert.equal(new Set(titresDonnes).size, titresDonnes.length, 'deux succès ne donnent pas le même titre');
  const chapitres = new Set([...CHAPITRES, OUTRE_TOMBE].map((c) => c.id));
  const faits = new Set(Object.keys(BANALE));
  for (const s of SUCCES) {
    assert.ok(RAYONS[s.rayon], `${s.id} : rayon ${s.rayon}`);
    const c = s.condition;
    if (c.type === 'partie') {
      for (const fait of Object.keys(c.faits)) assert.ok(faits.has(fait), `${s.id} : fait ${fait}`);
      if (c.heros) assert.ok(HERO_BY_ID[c.heros], `${s.id} : héros ${c.heros}`);
    }
    if (c.type === 'chapitre' && !c.carriere) assert.ok(chapitres.has(c.id), s.id);
    if (c.type === 'chapitre' && c.carriere) {
      const carriere = CARRIERES.find((x) => x.heros === c.carriere);
      assert.ok(carriere?.chapitres.at(-1)?.id === c.id, `${s.id} : le dernier chapitre de la carrière de ${c.carriere}`);
    }
  }
  assert.ok(SUCCES.length >= 60, 'il en faut plein');
});

test('une partie ordinaire ne débloque rien : les succès sont durs', () => {
  for (const niveau of ['facile', 'moyen', 'difficile'] as Niveau[]) {
    assert.deepEqual(ids(progresVierge(), partie({}, { niveau, heros: 'hollande' })), [], `perdue en ${niveau}`);
  }
  assert.deepEqual(ids(progresVierge(), { faits: VICTOIRE, niveau: 'facile', heros: 'hollande' }), [], 'même gagnée contre des bots faciles');
  assert.deepEqual(ids(progresVierge(), { faits: VICTOIRE, niveau: 'moyen', heros: 'hollande' }), []);
  assert.deepEqual(ids(progresVierge(), { faits: VICTOIRE, niveau: 'difficile', heros: 'hollande' }), ['premier_mandat'], 'la première victoire en difficile est le premier succès');
});

test('les victoires se comptent par niveau : dix en difficile, vingt-cinq en moyen ou plus, cent en tout', () => {
  const gagne = (niveau: Niveau): Resultat => ({ faits: { ...VICTOIRE, place: 1 }, niveau, heros: 'hollande' });
  // Chaque victoire est suivie d'une défaite : pas de série.
  const alterner = (niveau: Niveau, n: number) => Array.from({ length: n }, () => [gagne(niveau), partie({}, { niveau })]).flat();
  const faciles = suite(alterner('facile', 30));
  assert.deepEqual(faciles.gagnes, [], 'trente victoires faciles ne font ni un baron ni un cumulard');
  const moyens = suite(alterner('moyen', 25));
  assert.deepEqual(moyens.gagnes, ['baron']);
  const difficiles = suite(alterner('difficile', 10));
  assert.deepEqual(difficiles.gagnes, ['premier_mandat', 'cumul']);
  assert.equal(difficiles.progres.victoiresParNiveau.difficile, 10);
  const cent = suite(alterner('facile', 100));
  assert.ok(cent.gagnes.includes('dinosaure') && cent.gagnes.includes('inusable'), 'cent victoires, deux cents parties');
  assert.ok(titres(cent.progres).includes('Le Dinosaure'));
});

test('ne pas perdre un seul sondage : un succès par niveau, et le plus dur donne le plus beau titre', () => {
  const sansPerte = { place: 1, sondages_perdus: 0, sondages: 30, sondages_au_plus_bas: 30 };
  assert.deepEqual(ids(progresVierge(), partie(sansPerte, { niveau: 'facile' })), ['sans_opposition']);
  assert.deepEqual(ids(progresVierge(), partie(sansPerte, { niveau: 'moyen' })), ['sans_opposition', 'etat_de_grace'], 'qui peut le plus peut le moins');
  const dur = apresResultat(progresVierge(), partie(sansPerte, { niveau: 'difficile' }));
  assert.deepEqual(dur.nouveaux.map((s) => s.id), ['premier_mandat', 'sans_opposition', 'etat_de_grace', 'score_sovietique']);
  assert.ok(titres(dur.progres).includes('Le Plébiscité'));
  assert.deepEqual(ids(progresVierge(), partie({ ...sansPerte, sondages_perdus: 1 }, { niveau: 'difficile' })), ['premier_mandat'], 'un seul sondage perdu, et c\'est raté');
  assert.deepEqual(ids(progresVierge(), partie({ ...sansPerte, place: 2 }, { niveau: 'facile' })), [], 'il faut gagner');
  assert.deepEqual(ids(progresVierge(), partie(sansPerte)), [], 'hors partie rapide, pas de niveau : la carrière ne compte pas pour ceux-là');
});

test('les gros bras : 2000/2000, puis des chiffres qui n\'ont plus de sens', () => {
  assert.deepEqual(ids(progresVierge(), partie({ plus_gros: 1999 })), []);
  assert.deepEqual(ids(progresVierge(), partie({ plus_gros: 2000 })), ['bete_politique']);
  assert.deepEqual(ids(progresVierge(), partie({ plus_gros: 1_000_000_000 })), ['bete_politique', 'culte', 'dette_publique', 'plafond_de_la_dette']);
  assert.deepEqual(ids(progresVierge(), partie({ place: 8, plus_gros: 1000 })), ['geant_aux_pieds_d_argile'], 'dernier avec un monstre');
  assert.deepEqual(ids(progresVierge(), partie({ attaque_totale: 289 })), ['majorite_absolue']);
  assert.deepEqual(ids(progresVierge(), partie({ attaque_totale: 290 })), [], 'pile 289, pas plus');
});

test('des succès bêtes : ne toucher à rien, ou s\'acharner', () => {
  assert.deepEqual(ids(progresVierge(), victoire({ actualisations: 0 })), ['sobriete']);
  assert.deepEqual(ids(progresVierge(), partie({ actualisations: 0 })), [], 'il faut gagner');
  assert.deepEqual(ids(progresVierge(), partie({ actualisations: 100 })), ['girouette']);
  assert.deepEqual(ids(progresVierge(), victoire({ renvois: 0 })), ['immobilisme']);
  assert.deepEqual(ids(progresVierge(), partie({ renvois: 25, gels: 8, depenses: 250 })), ['remaniement', 'gel_du_point_d_indice', 'pognon_de_dingue']);
  assert.deepEqual(ids(progresVierge(), victoire({ sondages: 1, sondages_au_plus_bas: 1 })), ['inverser_la_courbe', 'a_une_voix_pres']);
  assert.deepEqual(ids(progresVierge(), partie({ place: 8, manches: 6 })), ['vingt_et_un_avril']);
  assert.deepEqual(ids(progresVierge(), victoire({ politiques: 3 })), ['homme_providentiel']);
  assert.deepEqual(ids(progresVierge(), victoire({ casseroles: 0 }, { niveau: 'difficile' })), ['premier_mandat', 'mains_propres']);
  assert.deepEqual(ids(progresVierge(), victoire({ casseroles: 0 }, { niveau: 'moyen' })), [], 'les mains propres se gagnent en difficile');
});

test('le plateau de la fin : parti unique, gauche plurielle, dîner d\'État', () => {
  assert.deepEqual(ids(progresVierge(), victoire({ meme_camp: 7, camps: 1 })), ['parti_unique']);
  assert.deepEqual(ids(progresVierge(), victoire({ gauche_plurielle: 2 })), ['gauche_plurielle']);
  assert.deepEqual(ids(progresVierge(), victoire({ union_des_droites: 2 })), ['union_des_droites']);
  assert.deepEqual(ids(progresVierge(), victoire({ camps: 6, presidents: 4 })), ['cohabitation', 'diner_d_etat']);
  assert.deepEqual(ids(progresVierge(), partie({ dores: 7 })), ['bling_bling', 'age_d_or']);
  assert.deepEqual(ids(progresVierge(), victoire({ porte_parole: 7, immunites: 7, vedettes: 6 })), ['langue_de_bois', 'immunite_parlementaire', 'peopolisation']);
  assert.deepEqual(ids(progresVierge(), partie({ place: 2, meme_camp: 7 })), [], 'tous demandent de gagner');
});

test('les séries : la même place plusieurs parties de suite, et une autre place les casse', () => {
  const second = partie({ place: 2 });
  assert.deepEqual(suite([second, second, second]).gagnes, ['eternel_second']);
  assert.deepEqual(suite([second, second, partie({ place: 3 }), second]).gagnes, [], 'une troisième place casse la série');
  const dernier = partie({ place: 8 });
  assert.deepEqual(suite(Array(5).fill(dernier)).gagnes, ['traversee_du_desert']);
  const gagne = (niveau: Niveau): Resultat => ({ faits: VICTOIRE, niveau, heros: 'hollande' });
  assert.deepEqual(suite([gagne('difficile'), gagne('difficile')]).gagnes, ['premier_mandat', 'reelu']);
  assert.deepEqual(suite([gagne('difficile'), gagne('facile')]).gagnes, ['premier_mandat'], 'une victoire facile dans la série, et elle n\'est plus « en difficile »');
  assert.deepEqual(suite(Array(5).fill(gagne('facile'))).gagnes, ['dynastie']);
});

test('gagner avec dix héros différents, puis avec tous ; Durif et Lalanne ont leur succès en difficile', () => {
  const gagneAvec = (heros: string): Resultat[] => [{ faits: VICTOIRE, niveau: 'facile', heros }, partie({})];
  const dix = suite(HEROES.slice(0, 10).flatMap((h) => gagneAvec(h.id)));
  assert.deepEqual(dix.gagnes, ['tous_les_memes']);
  assert.equal(suite([...gagneAvec('hollande'), ...gagneAvec('hollande')]).progres.herosVainqueurs.length, 1, 'le même héros ne compte qu\'une fois');
  const tous = suite(HEROES.flatMap((h) => gagneAvec(h.id)));
  assert.ok(tous.gagnes.includes('homme_orchestre'));
  assert.deepEqual(ids(progresVierge(), { faits: VICTOIRE, niveau: 'difficile', heros: 'durif' }), ['premier_mandat', 'miracle']);
  assert.deepEqual(ids(progresVierge(), { faits: VICTOIRE, niveau: 'moyen', heros: 'durif' }), []);
  assert.deepEqual(ids(progresVierge(), { faits: VICTOIRE, niveau: 'difficile', heros: 'lalanne' }), ['premier_mandat', 'on_se_retrouvera']);
});

test('en ligne : la première victoire contre un autre joueur, les duels, les tables de huit', () => {
  const enLigne = (faits: Partial<Faits>): Resultat => ({ faits: { ...VICTOIRE, ...faits }, heros: 'hollande' });
  assert.deepEqual(ids(progresVierge(), enLigne({ humains: 3 })), ['suffrage_universel']);
  assert.deepEqual(ids(progresVierge(), enLigne({ humains: 1 })), [], 'seul avec des bots dans un salon, ce n\'est pas du multijoueur');
  assert.deepEqual(ids(progresVierge(), enLigne({ humains: 2, joueurs: 2 })), ['suffrage_universel', 'entre_deux_tours']);
  assert.deepEqual(ids(progresVierge(), enLigne({ humains: 8 })), ['suffrage_universel', 'grand_debat']);
  assert.deepEqual(ids(progresVierge(), enLigne({ humains: 8, place: 8, sondages: -3 })), ['motion_de_censure']);
  assert.deepEqual(ids(progresVierge(), enLigne({ humains: 4, sondages_perdus: 0 })), ['suffrage_universel', 'referendum']);
  assert.deepEqual(ids(progresVierge(), enLigne({ humains: 4, place: 5, hote_public: 1 })), ['reunion_publique']);
  const dix = suite(Array.from({ length: 10 }, () => [enLigne({ humains: 3 }), enLigne({ humains: 3, place: 4 })]).flat());
  assert.deepEqual(dix.gagnes, ['suffrage_universel', 'majorite_presidentielle']);
  assert.equal(dix.progres.partiesEnLigne, 20);
  assert.equal(dix.progres.victoiresEnLigne, 10);
  assert.ok(titres(dix.progres).includes('L\'Élu du peuple'));
});

test('la carrière : son second tour, Giscard, et les carrières de Mélenchon, Le Pen et Durif', () => {
  const elu = apresResultat(progresVierge(), { chapitre: 'second_tour' });
  assert.deepEqual(elu.nouveaux.map((s) => s.id), ['elu']);
  assert.equal(elu.progres.parties, 0, 'un chapitre n\'est pas une partie de plus');
  assert.deepEqual(ids(progresVierge(), { chapitre: 'second_tour', carriere: 'melenchon' }), ['elu', 'la_republique_c_est_moi']);
  assert.deepEqual(ids(progresVierge(), { chapitre: 'second_tour_2027', carriere: 'lepen' }), ['plafond_perce']);
  assert.deepEqual(ids(progresVierge(), { chapitre: 'second_tour', carriere: 'durif' }), ['elu', 'vaisseau_de_lumiere']);
  assert.deepEqual(ids(progresVierge(), { chapitre: 'outre_tombe' }), ['outre_tombe']);
});

test('un succès se gagne une fois, et le tutoriel n\'en donne plus', () => {
  const gros = partie({ plus_gros: 2500 });
  const { progres, gagnes } = suite([gros, gros]);
  assert.deepEqual(gagnes, ['bete_politique']);
  assert.equal(progres.parties, 2);
  const appris = apresResultat(progresVierge(), { tutoriel: true });
  assert.deepEqual(appris.nouveaux, []);
  assert.equal(appris.progres.tutoriel, true, 'mais il a été ouvert : l\'accueil ne le met plus en avant');
  assert.equal(appris.progres.parties, 0);
});

test('une progression vieille ou abîmée dans le navigateur ne casse rien, et ce qui reste vrai est gardé', () => {
  assert.deepEqual(progresValide(null), progresVierge());
  const ancienne = progresValide({ parties: 12, victoires: 3, obtenus: ['bizuth', 'premier_meeting', 'elu', 'elu', 'inconnu', 4] });
  assert.equal(ancienne.parties, 12);
  assert.equal(ancienne.victoires, 3);
  assert.deepEqual(ancienne.obtenus, ['elu'], 'les succès retirés tombent, ceux qui existent toujours restent');
  assert.equal(ancienne.tutoriel, true, 'l\'ancien succès du tutoriel dit qu\'il a été suivi');
  assert.deepEqual(ancienne.victoiresParNiveau, { facile: 0, moyen: 0, difficile: 0 });
  const abimee = progresValide({ parties: -3, victoires: 'x', victoiresParNiveau: { difficile: 2, moyen: 'non' }, herosVainqueurs: ['hollande', 'personne', 'hollande'], serie: { place: 0, n: 2 } });
  assert.deepEqual(abimee, { ...progresVierge(), victoiresParNiveau: { facile: 0, moyen: 0, difficile: 2 }, herosVainqueurs: ['hollande'] });
});

test('le suivi d\'une partie : sondages perdus baisse après baisse, point le plus bas, plus gros politique', () => {
  const game = createGame({ seed: 5, seats: 8 });
  const vue = viewFor(game, 0);
  const debut = suivrePartie(null, vue);
  assert.deepEqual(debut, { complet: true, sondages: vue.hp, perdus: 0, auPlusBas: vue.hp, plusGros: 0 });
  const blesse = suivrePartie(debut, { ...vue, hp: vue.hp - 7 });
  const soigne = suivrePartie(blesse, { ...vue, hp: vue.hp - 2 });
  const fin = suivrePartie(soigne, { ...vue, hp: vue.hp - 6, board: [{ ...makeMinion(CARD_BY_ID.hollande, 1), atk: 2400, hp: 2100 }] });
  assert.deepEqual(fin, { complet: true, sondages: vue.hp - 6, perdus: 11, auPlusBas: vue.hp - 7, plusGros: 2100 }, 'regagner des sondages n\'efface pas ceux qu\'on a perdus');
  assert.equal(suivrePartie(fin, { ...vue, phase: 'choix_heros' }), null, 'au choix du héros, une nouvelle partie commence');
  // Une page rechargée à la manche 9 : ce qui a précédé n'est pas su, et la partie ne passe pas pour sans faute.
  const repris = suivrePartie(null, { ...vue, round: 9 });
  assert.equal(repris?.complet, false);
  const table = { place: 1, joueurs: 8, humains: 0, hotePublic: false };
  assert.ok(bilanDePartie(vue, repris, table).sondages_perdus > 0);
  assert.ok(bilanDePartie(vue, null, table).sondages_perdus > 0, 'sans suivi du tout, pareil');
  assert.equal(bilanDePartie(vue, debut, table).sondages_perdus, 0);
});

test('les faits d\'une partie se lisent sur la vue du joueur : gestes comptés par le moteur, plateau de la fin', () => {
  const game = createGame({ seed: 5, seats: 8 });
  const p = game.players[0];
  p.budget = 50;
  assert.ok(applyAction(game, 0, { t: 'roll' }).ok);
  assert.ok(applyAction(game, 0, { t: 'roll' }).ok);
  assert.ok(applyAction(game, 0, { t: 'freeze' }).ok);
  assert.ok(applyAction(game, 0, { t: 'freeze' }).ok, 'dégeler ne compte pas pour un gel');
  assert.ok(applyAction(game, 0, { t: 'buy', slot: 0 }).ok);
  assert.ok(applyAction(game, 0, { t: 'sell', uid: p.board[0].uid }).ok);
  const dore = { ...makeMinion(CARD_BY_ID.hollande, 900), golden: true, atk: 200, hp: 150, casseroles: ['a', 'b', 'c'] };
  p.board = [dore, makeMinion(CARD_BY_ID.chirac, 901), makeMinion(CARD_BY_ID.macron, 902)];
  const vue = viewFor(game, 0);
  assert.deepEqual(Object.keys(vue.stats).sort(), ['casseroles', 'forgotten', 'frozen', 'rolls', 'scandals', 'sold', 'spells', 'spent', 'triples']);
  const faits = bilanDePartie(vue, null, { place: 1, joueurs: 8, humains: 0, hotePublic: false });
  assert.equal(faits.actualisations, 2);
  assert.equal(faits.gels, 1);
  assert.equal(faits.renvois, 1);
  assert.ok(faits.depenses > 0);
  assert.deepEqual(
    [faits.place, faits.politiques, faits.dores, faits.presidents, faits.camps, faits.meme_camp, faits.casseroles_sur_un, faits.plus_gros],
    [1, 3, 1, 3, 3, 1, 3, 150],
  );
  assert.equal(faits.attaque_totale, vue.board.reduce((somme, m) => somme + m.atk, 0));
  assert.deepEqual(Object.keys(faits).sort(), Object.keys(BANALE).sort(), 'tous les faits, et rien d\'autre');
  assert.ok((Object.keys(faits) as Fait[]).every((fait) => Number.isFinite(faits[fait])));
});

test('le moteur propose plus de héros au siège qui y a droit, sans doublon entre joueurs', () => {
  const game = createGame({ seed: 5, seats: 8, heroSelection: true, heroChoices: { 0: 4 } });
  const offres = game.players.map((p) => p.heroOffers ?? []);
  assert.equal(offres[0].length, 4);
  assert.equal(offres[1].length, PARAMS.heroChoices);
  const tous = offres.flat();
  // 4 + 7 × 2 = 18 propositions : tant qu'il reste des héros, aucun doublon.
  const distincts = Math.min(tous.length, HEROES.length);
  assert.equal(new Set(tous.slice(0, distincts)).size, distincts);
});
