import type { Cinematique } from '../cinematique.ts';

/**
 * Les cinématiques de la carrière de Marine Le Pen (8 novembre 2026). Le fil rouge : une héritière qui veut faire
 * oublier son nom, un père qui surgit toujours au pire moment, des dossiers qui se mélangent, une Marine de 2013 qui
 * hante celle de 2025, puis le bracelet électronique : promis en 2025, confirmé en cassation (inventé), il la tient
 * à la maison jusqu'au bout. Élue, l'article 67 le lui enlève ; battue, elle le garde. Mélenchon au bout.
 * Faits (sources dans les `faits` de la carrière) :
 * - 2007, législatives d'Hénin-Beaumont : 41,65 % au second tour, battue ; la famille vit à Saint-Cloud (Montretout) ;
 * - 2012, Hénin-Beaumont : battue de 118 voix au second tour ; recours rejeté par le Conseil constitutionnel le
 *   7 décembre 2012 ;
 * - 2014, Jean-Marie Le Pen : « on fera une fournée la prochaine fois » ; 1er mai 2015 : « Jeanne, au secours ! » ;
 *   20 août 2015, il est exclu et demande qu'elle lui rende son nom ; 2018, le FN devient le Rassemblement national ;
 * - 3 mai 2017, débat : dossiers confondus ; « l'élève et le professeur » ; Macron : « poudre de perlimpinpin » ;
 * - 23 février 2012, « Des paroles et des actes » (France 2) : elle refuse de débattre avec Mélenchon et lit son journal ;
 *   lui : « Alors, que faites-vous là ? Allez-vous en ! » ;
 * - 2014, prêt d'une banque russe au FN ; 2022, Macron au débat : « Vous parlez à votre banquier quand vous parlez de la
 *   Russie » ; elle : « une femme absolument et totalement libre » ; 24 avril 2022 : « une éclatante victoire » ;
 * - 5 avril 2013, Public Sénat : « Pourquoi pas pour détournement de fonds publics ? » ; 31 mars 2025, condamnée pour
 *   détournement de fonds publics, inéligible tout de suite : « Je ne vais pas me laisser éliminer ainsi. » ;
 *   7 juillet 2026, en appel : trois ans dont un ferme sous bracelet électronique, et quinze mois d'inéligibilité ferme,
 *   déjà purgés ; elle est éligible et se pourvoit en cassation, qui veut statuer avant le premier tour ;
 * - article 67 de la Constitution : pendant son mandat, le président ne peut faire l'objet d'aucune action, d'aucun
 *   acte d'information, d'instruction ou de poursuite ; tout reprend un mois après la fin du mandat ;
 * - Marine Le Pen élève des chats ;
 * - Jean-Marie Le Pen est mort le 7 janvier 2025.
 * Le reste est inventé pour l'histoire.
 */
export const CINEMATIQUES_LEPEN: Cinematique[] = [
  {
    id: 'lepen_intro',
    heros: 'lepen',
    moment: 'intro',
    style: 'guignol',
    duree: 22,
    decor: 'mairie',
    musique: 'marseillaise_pourrie',
    distribution: [
      { role: 'marine', personnage: 'lepen' },
      { role: 'papa', personnage: 'jmlp' },
    ],
    plans: [
      { a: 0, actions: [{ titre: '2007', sous_titre: 'Hénin-Beaumont, bassin minier' }, { entre: 'marine', par: 'gauche', x: 46, en: 1.8, delai: 0.6 }] },
      { a: 2.6, actions: [{ pose: 'marine', quoi: 'bras_leves' }, { dit: 'marine', texte: 'Bonjour Hénin-Beaumont ! Je suis une femme du peuple !', invente: true }] },
      { a: 6.6, actions: [{ pose: 'marine', quoi: 'debout' }, { pense: 'marine', texte: 'J\'habite à Saint-Cloud. Personne n\'a besoin de le savoir.' }] },
      {
        a: 10.6,
        actions: [
          { entre: 'papa', par: 'bas', x: 64, en: 0.5 },
          { pose: 'papa', quoi: 'bras_leves', delai: 0.4 },
          { dit: 'papa', texte: 'N\'ayez pas peur de rêver, vous les petits, les sans-grade, les exclus.', source: 'Jean-Marie Le Pen, soir du 21 avril 2002', voix: 'jmlp_ayez_pas_peur', delai: 0.4 },
          { visage: 'marine', expression: 'choc', delai: 0.8 },
        ],
      },
      { a: 17.2, actions: [{ visage: 'marine', expression: 'base' }, { tape: 'marine', sur: 'papa' }, { sort: 'papa', par: 'bas', en: 0.3, delai: 0.3 }, { dit: 'marine', texte: 'Papa ! Pas pendant la dédiabolisation !', invente: true, delai: 0.4 }] },
      { a: 20, actions: [{ narrateur: 'Au second tour : 41,65 %. Elle reviendra. Lui aussi.' }] },
    ],
  },
  {
    id: 'lepen_henin_2012',
    heros: 'lepen',
    moment: 'avant_chapitre',
    chapitre: 'henin_2012',
    style: 'jt',
    duree: 22,
    decor: 'nuit_electorale',
    musique: 'suspense',
    distribution: [{ role: 'marine', personnage: 'lepen' }],
    accessoires: [{ id: 'urne', type: 'urne' }],
    plans: [
      { a: 0, actions: [{ titre: 'Hénin-Beaumont, 2012', sous_titre: 'Second tour' }, { place: 'marine', x: 44 }, { bandeau: 'Le socialiste 50,11 %, Le Pen 49,89 % : 118 voix d\'écart.', delai: 1 }] },
      { a: 2.8, actions: [{ visage: 'marine', expression: 'choc' }, { dit: 'marine', texte: 'Je demande un recomptage.', invente: true, delai: 0.3 }] },
      { a: 5.2, actions: [{ visage: 'marine', expression: 'base' }, { accessoire: 'urne', fait: 'apparait', x: 62 }, { pose: 'marine', quoi: 'assis', delai: 0.4 }, { narrateur: 'Trois heures du matin.', delai: 0.4 }] },
      { a: 8, actions: [{ dit: 'marine', texte: '… 116… 117…', invente: true }] },
      { a: 10.4, actions: [{ dit: 'marine', texte: '118 !', invente: true }, { saute: 'marine', delai: 0.2 }] },
      { a: 12.6, actions: [{ dit: 'marine', texte: '119 ?', invente: true }, { pose: 'marine', quoi: 'penche', delai: 0.2 }] },
      { a: 14.6, actions: [{ dit: 'marine', texte: '… Non. C\'est un ticket de métro.', invente: true }, { pose: 'marine', quoi: 'tete_basse', delai: 1 }] },
      { a: 17.6, actions: [{ narrateur: 'Le Conseil constitutionnel a rejeté son recours en décembre. Elle recompte encore.' }] },
    ],
  },
  {
    id: 'lepen_region_2015',
    heros: 'lepen',
    moment: 'avant_chapitre',
    chapitre: 'region_2015',
    style: 'guignol',
    duree: 25,
    decor: 'bureau',
    musique: 'suspense',
    distribution: [
      { role: 'marine', personnage: 'lepen' },
      { role: 'papa', personnage: 'jmlp' },
    ],
    plans: [
      { a: 0, actions: [{ titre: '20 août 2015', sous_titre: 'Bureau exécutif du Front national' }, { place: 'marine', x: 38 }] },
      { a: 2.6, actions: [{ dit: 'marine', texte: 'Dernier point : nous allons tout faire pour qu\'on oublie mon père.', invente: true }] },
      { a: 6.6, actions: [{ entre: 'papa', par: 'bas', x: 66, en: 0.4 }, { dit: 'papa', texte: 'Ça ne m\'étonne pas. Écoutez, on fera une fournée la prochaine fois.', source: 'Jean-Marie Le Pen, juin 2014', voix: 'jmlp_fournee', delai: 0.4 }, { visage: 'marine', expression: 'choc', delai: 0.6 }] },
      { a: 11.2, actions: [{ visage: 'marine', expression: 'base' }, { tape: 'marine', sur: 'papa' }, { sort: 'papa', par: 'bas', en: 0.3, delai: 0.3 }] },
      { a: 12.4, actions: [{ entre: 'papa', par: 'bas', x: 14, en: 0.4 }, { dit: 'papa', texte: 'Jeanne, au secours !', source: 'Jean-Marie Le Pen, 1er mai 2015', voix: 'jmlp_jeanne_au_secours', delai: 0.4 }] },
      { a: 14.6, actions: [{ regarde: 'marine', vers: 'gauche' }, { dit: 'marine', texte: 'Papa. Tu es exclu.', invente: true }] },
      { a: 17, actions: [{ dit: 'papa', texte: 'Alors rends-moi mon nom !', invente: true }] },
      { a: 19.4, actions: [{ dit: 'marine', texte: 'D\'accord. On change celui du parti.', invente: true }, { sort: 'papa', par: 'bas', en: 0.4, delai: 2.4 }] },
      { a: 22.4, actions: [{ titre: '2018', sous_titre: 'Le Front national devient le Rassemblement national' }] },
    ],
  },
  {
    id: 'lepen_2022',
    heros: 'lepen',
    moment: 'avant_chapitre',
    chapitre: 'presidentielle_2022',
    style: 'jt',
    duree: 25,
    decor: 'tf1_second_tour',
    musique: 'suspense',
    distribution: [
      { role: 'marine', personnage: 'lepen' },
      { role: 'macron', personnage: 'macron' },
    ],
    accessoires: [
      { id: 'pupitre_marine', type: 'pupitre' },
      { id: 'pupitre_macron', type: 'pupitre' },
      { id: 'telephone', type: 'telephone', texte: 'BANQUE' },
    ],
    plans: [
      {
        a: 0,
        actions: [
          { titre: '2017', sous_titre: 'Le débat d\'entre-deux-tours' },
          { accessoire: 'pupitre_marine', fait: 'apparait', x: 28 },
          { accessoire: 'pupitre_macron', fait: 'apparait', x: 72 },
          { place: 'marine', x: 28 },
          { place: 'macron', x: 72 },
        ],
      },
      { a: 2.6, actions: [{ dit: 'marine', texte: 'Alors, SFR… pardon, Alstom… non, SFR.', invente: true }] },
      { a: 5.6, actions: [{ dit: 'macron', texte: 'Ce que vous proposez, comme d\'habitude, c\'est de la poudre de perlimpinpin.', source: 'Débat d\'entre-deux-tours, 3 mai 2017', voix: 'macron_perlimpinpin' }] },
      { a: 10, actions: [{ dit: 'marine', texte: 'Monsieur Macron, je vois que vous essayez de jouer avec moi à l\'élève et au professeur, ce n\'est pas particulièrement mon truc.', source: 'Débat d\'entre-deux-tours, 3 mai 2017', voix: 'lepen_eleve_professeur' }] },
      { a: 15.4, decor: 'tf1_second_tour', actions: [{ titre: '2022', sous_titre: 'Le match retour' }, { accessoire: 'pupitre_marine', fait: 'apparait', x: 28 }, { accessoire: 'pupitre_macron', fait: 'apparait', x: 72 }, { place: 'marine', x: 28 }, { place: 'macron', x: 72 }] },
      { a: 17.4, actions: [{ dit: 'marine', texte: 'Cette fois, pas de dossiers. Je suis une femme absolument et totalement libre.', source: 'Débat d\'entre-deux-tours, 20 avril 2022' }] },
      { a: 21.2, actions: [{ accessoire: 'telephone', fait: 'tient', par: 'marine' }, { bruitage: 'cloche' }, { pense: 'marine', texte: 'Pas maintenant…', delai: 0.6 }, { visage: 'marine', expression: 'choc', delai: 0.6 }, { visage: 'marine', expression: 'base', delai: 3.2 }] },
    ],
  },
  {
    id: 'lepen_tour_scenarise',
    heros: 'lepen',
    moment: 'tour_scenarise',
    chapitre: 'ineligible',
    style: 'jt',
    duree: 26,
    decor: 'tribunal',
    musique: 'suspense',
    distribution: [
      { role: 'marine', personnage: 'lepen' },
      { role: 'marine2013', personnage: 'lepen' },
      { role: 'jordan', personnage: 'bardella' },
    ],
    plans: [
      { a: 0, actions: [{ titre: '31 mars 2025', sous_titre: 'Tribunal correctionnel de Paris' }, { place: 'marine', x: 34 }] },
      { a: 2.4, actions: [{ narrateur: 'Détournement de fonds publics. Deux ans de bracelet, plus tard. Cinq ans d\'inéligibilité, tout de suite.' }] },
      { a: 6.4, cadre: { sur: 'marine' }, actions: [{ dit: 'marine', texte: 'Je ne vais pas me laisser éliminer ainsi.', source: '20 heures de TF1, 31 mars 2025', voix: 'lepen_pas_me_laisser_eliminer' }] },
      {
        a: 9.4,
        cadre: 'large',
        actions: [
          { place: 'marine2013', x: 70, profondeur: 20 },
          { aspect: 'marine2013', comme: 'fantome' },
          { bruitage: 'teleportation' },
          { dit: 'marine2013', texte: 'Ah bon, et pourquoi pas le reste ? Pourquoi pas pour favoritisme ? Pourquoi pas pour détournement de fonds publics ?', source: 'Public Sénat, 5 avril 2013', voix: 'lepen_pourquoi_pas_le_reste', delai: 0.4 },
          { visage: 'marine', expression: 'choc', delai: 2 },
        ],
      },
      { a: 17.2, actions: [{ visage: 'marine', expression: 'base' }, { dit: 'marine', texte: 'Tais-toi, toi ! Tu n\'aides pas !', invente: true }, { disparait: 'marine2013', delai: 1.6 }] },
      { a: 19.6, actions: [{ entre: 'jordan', par: 'droite', x: 68, en: 1 }, { dit: 'jordan', texte: 'Je peux garder la place au chaud ?', invente: true, delai: 1 }] },
      { a: 23, actions: [{ narrateur: 'Jusqu\'à l\'appel, vous jouez avec le pouvoir de Bardella.' }] },
    ],
  },
  {
    id: 'lepen_avant_boss',
    heros: 'lepen',
    moment: 'avant_boss',
    style: 'guignol',
    duree: 24,
    decor: 'salon',
    musique: 'suspense',
    distribution: [
      { role: 'marine', personnage: 'lepen' },
      { role: 'jlm', personnage: 'melenchon' },
    ],
    accessoires: [
      { id: 'canape', type: 'canape' },
      { id: 'bracelet', type: 'bracelet' },
      { id: 'journal', type: 'journal' },
    ],
    plans: [
      {
        a: 0,
        actions: [
          { titre: 'Avril 2027', sous_titre: 'Le débat du second tour' },
          { accessoire: 'canape', fait: 'apparait', x: 30 },
          { place: 'marine', x: 26 },
          { pose: 'marine', quoi: 'assis', en: 0.1 },
          { accessoire: 'bracelet', fait: 'cheville', par: 'marine' },
          { accessoire: 'journal', fait: 'tient', par: 'marine', delai: 0.8 },
        ],
      },
      { a: 2.6, actions: [{ narrateur: 'Cassation : un an sous bracelet, défense de sortir le soir. Le débat se fera chez elle.' }] },
      { a: 7, actions: [{ bruitage: 'cloche' }, { entre: 'jlm', par: 'droite', x: 66, en: 1.6, delai: 0.3 }] },
      { a: 9, actions: [{ dit: 'jlm', texte: 'Alors, que faites-vous là ? Allez-vous en !', source: '« Des paroles et des actes », France 2, 23 février 2012' }] },
      { a: 12.2, actions: [{ dit: 'marine', texte: 'J\'habite ici.', invente: true }] },
      {
        a: 14.2,
        actions: [
          { accessoire: 'journal', fait: 'disparait' },
          { pose: 'marine', quoi: 'debout', en: 0.2 },
          { va: 'marine', x: 48, en: 0.8, delai: 0.3 },
          { pose: 'marine', quoi: 'montre', delai: 1.1 },
          { dit: 'marine', texte: 'Dehors !', invente: true, delai: 1.1 },
          { accessoire: 'bracelet', fait: 'bipe', delai: 2.1 },
          { visage: 'marine', expression: 'choc', delai: 2.2 },
          { va: 'marine', x: 26, allure: 'recule', en: 0.6, delai: 2.8 },
          { pose: 'marine', quoi: 'assis', en: 0.2, delai: 3.4 },
        ],
      },
      { a: 18.2, actions: [{ visage: 'marine', expression: 'base' }, { dit: 'jlm', texte: 'Bon. Alors je reste.', invente: true }, { va: 'jlm', x: 43, en: 1, delai: 1.4 }, { pose: 'jlm', quoi: 'assis', en: 0.2, delai: 2.4 }] },
      { a: 20.8, actions: [{ narrateur: 'Elle ne peut pas sortir. Lui ne partira plus.' }] },
    ],
  },
  {
    id: 'lepen_victoire',
    heros: 'lepen',
    moment: 'victoire',
    style: 'guignol',
    duree: 24,
    decor: 'elysee',
    musique: 'fanfare',
    distribution: [
      { role: 'marine', personnage: 'lepen' },
      { role: 'jordan', personnage: 'bardella' },
    ],
    accessoires: [
      { id: 'bracelet', type: 'bracelet' },
      { id: 'constitution', type: 'constitution' },
    ],
    plans: [
      { a: 0, actions: [{ titre: 'Élue !', sous_titre: 'Le 2 mai 2027' }, { confettis: true, delai: 0.4 }, { accessoire: 'bracelet', fait: 'cheville', par: 'marine' }, { entre: 'marine', par: 'gauche', x: 30, en: 1.6, delai: 0.6 }] },
      { a: 2.8, actions: [{ dit: 'marine', texte: 'Enfin. Chez moi.', invente: true }, { va: 'marine', x: 58, en: 1.2, delai: 1.3 }] },
      { a: 5.4, actions: [{ accessoire: 'bracelet', fait: 'bipe' }, { visage: 'marine', expression: 'choc', delai: 0.1 }, { va: 'marine', x: 28, allure: 'recule', en: 0.6, delai: 0.7 }] },
      { a: 7.2, actions: [{ dit: 'marine', texte: 'Le périmètre ! Il s\'arrête à la grille !', invente: true }] },
      { a: 10, actions: [{ visage: 'marine', expression: 'base' }, { entre: 'jordan', par: 'droite', x: 68, en: 1, allure: 'court' }, { accessoire: 'constitution', fait: 'tient', par: 'jordan', delai: 1 }] },
      { a: 11.6, actions: [{ dit: 'jordan', texte: 'Article 67 ! La présidente est inviolable !', invente: true }] },
      { a: 14.6, actions: [{ accessoire: 'constitution', fait: 'disparait' }, { bruitage: 'boing' }, { accessoire: 'bracelet', fait: 'tient', par: 'marine' }, { visage: 'marine', expression: 'rire', delai: 0.2 }] },
      { a: 15.8, actions: [{ dit: 'marine', texte: 'Tiens, Jordan. Garde-le au chaud.', invente: true }, { accessoire: 'bracelet', fait: 'donne', par: 'marine', a: 'jordan', delai: 1.6 }, { visage: 'marine', expression: 'base', delai: 2.4 }] },
      { a: 19.2, actions: [{ narrateur: 'Pas de bracelet tant qu\'elle est présidente. Elle ne partira jamais.' }] },
    ],
  },
  {
    id: 'lepen_defaite',
    heros: 'lepen',
    moment: 'defaite',
    style: 'guignol',
    duree: 18,
    decor: 'salon',
    musique: 'piano_muet',
    distribution: [{ role: 'marine', personnage: 'lepen' }],
    accessoires: [
      { id: 'canape', type: 'canape' },
      { id: 'bracelet', type: 'bracelet' },
      { id: 'chat', type: 'chat' },
    ],
    plans: [
      {
        a: 0,
        actions: [
          { titre: '2 mai 2027', sous_titre: 'Battue' },
          { accessoire: 'canape', fait: 'apparait', x: 30 },
          { accessoire: 'chat', fait: 'apparait', x: 60 },
          { place: 'marine', x: 26 },
          { pose: 'marine', quoi: 'assis', en: 0.1 },
          { accessoire: 'bracelet', fait: 'cheville', par: 'marine' },
        ],
      },
      { a: 2.6, actions: [{ pose: 'marine', quoi: 'debout', en: 0.2 }, { dit: 'marine', texte: 'Je vais saluer mes électeurs.', invente: true, delai: 0.2 }, { va: 'marine', x: 76, en: 1.2, delai: 1.8 }] },
      { a: 5.8, actions: [{ accessoire: 'bracelet', fait: 'bipe' }, { visage: 'marine', expression: 'choc', delai: 0.1 }, { va: 'marine', x: 26, allure: 'recule', en: 0.6, delai: 0.7 }, { pose: 'marine', quoi: 'assis', en: 0.2, delai: 1.3 }] },
      { a: 8.2, actions: [{ visage: 'marine', expression: 'base' }, { dit: 'marine', texte: 'Mes chers compatriotes…', invente: true }] },
      { a: 10.2, actions: [{ accessoire: 'chat', fait: 'sort', par: 'droite' }] },
      { a: 11.2, actions: [{ pose: 'marine', quoi: 'tete_basse' }, { pense: 'marine', texte: 'Même lui.', delai: 0.6 }] },
      { a: 14, actions: [{ titre: 'Présidente de son salon.', sous_titre: 'Le chat a voté avec ses pattes.' }] },
    ],
  },
];
