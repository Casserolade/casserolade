import type { Cinematique } from '../cinematique.ts';

/**
 * Les cinématiques de la carrière de Mélenchon (8 novembre 2026) : des situations politiques crédibles, les personnages
 * tels qu'on les connaît, et un dérapage. Le fil rouge : quinze ans de match contre Le Pen, un homme qui dit non, un
 * hologramme qui n'en fait qu'à sa tête, et une porte marquée « TIREZ ».
 * Faits (sources dans les `faits` de la carrière) :
 * - 2005, le PS fait campagne pour le oui ; Hollande et Sarkozy posent ensemble pour le oui en une de Paris Match ;
 *   29 mai 2005, le non l'emporte avec 54,67 % ; « Eh bien, qu'ils aillent se faire foutre ! Les Lituaniens ?… »
 *   (Envoyé spécial, 2 juin 2005) ;
 * - 2012, Le Pen refuse de débattre avec lui et lit son journal (France 2, 23 février) ; à Hénin-Beaumont, elle arrive
 *   en tête, il est éliminé au premier tour, elle perd le second contre un socialiste ;
 * - 5 février 2017, meeting de Lyon en hologramme à Aubervilliers ; 19,58 % au premier tour ;
 * - 16 octobre 2018, la perquisition : « La République, c'est moi ! » ; « Personne ne me touche ! Ma personne est
 *   sacrée ! » ; condamné le 9 décembre 2019 à trois mois avec sursis et 8 000 euros, sans faire appel ;
 * - 10 avril 2022 : Le Pen 23,15 %, Mélenchon 21,95 %, à 421 420 voix ; Roussel 2,28 % (802 422 voix), que LFI rend
 *   responsable ; « Faites mieux ! » ; Roussel, Europe 1, 30 août 2022 : « … le sexe des escalopes » ;
 * - 3 mai 2017, Le Pen confond ses dossiers au débat ;
 * - Macron, vœux du 31 décembre 2022 : « Qui aurait pu prédire… » ;
 * - 9 février 2023, il quitte Face à BFM : « Vous êtes des gens sans principe, sans foi ni loi. Allez, bonsoir. »
 * Le reste est inventé pour l'histoire.
 */
export const CINEMATIQUES_MELENCHON: Cinematique[] = [
  {
    id: 'melenchon_intro',
    heros: 'melenchon',
    moment: 'intro',
    style: 'guignol',
    duree: 29,
    decor: 'bureau',
    musique: 'marseillaise_pourrie',
    distribution: [
      { role: 'jlm', personnage: 'melenchon' },
      { role: 'hollande', personnage: 'hollande' },
      { role: 'sarkozy', personnage: 'sarkozy' },
    ],
    plans: [
      { a: 0, actions: [{ titre: '2005', sous_titre: 'Au Parti socialiste, on vote oui' }, { place: 'hollande', x: 32 }, { place: 'jlm', x: 70, regarde: 'gauche' }] },
      { a: 2.4, actions: [{ dit: 'hollande', texte: 'Le Parti fait campagne pour le oui. Tout le monde est d\'accord ?', invente: true }] },
      { a: 7.1, actions: [{ dit: 'jlm', texte: 'Non.', invente: true }, { pose: 'jlm', quoi: 'bras_croises' }] },
      { a: 9, actions: [{ dit: 'hollande', texte: 'Bon. Un petit café, pour détendre ?', invente: true }] },
      { a: 11.7, actions: [{ dit: 'jlm', texte: 'Non.', invente: true }] },
      {
        a: 13.6,
        actions: [
          { entre: 'sarkozy', par: 'droite', x: 50, en: 1 },
          { dit: 'sarkozy', texte: 'François ! On fait la photo pour le oui ? Paris Match attend.', invente: true, delai: 1 },
          { pose: 'hollande', quoi: 'bras_leves', delai: 4.4 },
          { pose: 'sarkozy', quoi: 'bras_leves', delai: 4.4 },
          { eclair: true, delai: 4.6 },
        ],
      },
      { a: 18.4, actions: [{ dit: 'jlm', texte: 'NON !', invente: true }, { saute: 'jlm' }, { visage: 'hollande', expression: 'choc', delai: 0.2 }, { dit: 'sarkozy', texte: 'Quelle indignité !', source: 'Boîte à sons MyInstants', voix: 'sarkozy_boite_sarkozy_quelle_indignite', delai: 0.6 }] },
      {
        a: 20.4,
        decor: 'nuit_electorale',
        transition: 'volet',
        actions: [
          { titre: 'NON : 54,67 %', sous_titre: '29 mai 2005' },
          { place: 'jlm', x: 40 },
          { place: 'hollande', x: 72, regarde: 'gauche' },
          { visage: 'hollande', expression: 'base' },
          { pose: 'hollande', quoi: 'tete_basse' },
          { confettis: true },
        ],
      },
      { a: 22.9, actions: [{ dit: 'jlm', texte: 'François. Un petit café ?', invente: true }] },
      { a: 24.8, actions: [{ pose: 'hollande', quoi: 'debout' }, { dit: 'hollande', texte: '… Non.', invente: true }] },
      { a: 26.5, actions: [{ dit: 'jlm', texte: 'Tu vois. C\'est facile.', invente: true }] },
    ],
  },
  {
    id: 'melenchon_tour_scenarise',
    heros: 'melenchon',
    moment: 'tour_scenarise',
    chapitre: 'henin_beaumont',
    style: 'jt',
    duree: 26,
    decor: 'france3',
    musique: 'jingle_info',
    distribution: [
      { role: 'jlm', personnage: 'melenchon' },
      { role: 'marine', personnage: 'lepen' },
      { role: 'lepers', personnage: 'lepers' },
    ],
    accessoires: [{ id: 'journal', type: 'journal', texte: 'HOROSCOPE' }],
    plans: [
      {
        a: 0,
        actions: [
          { titre: 'Hénin-Beaumont, 2012', sous_titre: 'Mélenchon vient battre Le Pen chez elle' },
          { place: 'lepers', x: 50, profondeur: 40 },
          { place: 'jlm', x: 24 },
          { place: 'marine', x: 76, regarde: 'gauche' },
          { accessoire: 'journal', fait: 'tient', par: 'marine' },
        ],
      },
      { a: 2.4, actions: [{ dit: 'lepers', texte: 'Madame Le Pen, vous lisez le journal pendant le débat ?', invente: true }] },
      { a: 6.2, actions: [{ dit: 'marine', texte: 'Je ne débats pas avec monsieur. Je lis mon horoscope.', invente: true }] },
      { a: 10, actions: [{ dit: 'jlm', texte: 'Le système…', invente: true }] },
      { a: 11.2, actions: [{ dit: 'marine', texte: '… est pourri !', invente: true }] },
      { a: 12.6, actions: [{ dit: 'jlm', texte: 'Les élites…', invente: true }] },
      { a: 13.8, actions: [{ dit: 'marine', texte: '… mondialisées !', invente: true }] },
      {
        a: 15.4,
        actions: [
          { regarde: 'marine', vers: 'gauche' },
          { visage: 'jlm', expression: 'choc' },
          { visage: 'marine', expression: 'choc' },
          { bandeau: 'Théorie du fer à cheval : à force de crier, on ne les distingue plus.' },
          { dit: 'lepers', texte: 'Oui ! Oui ! Oui !', source: 'Questions pour un champion, France 3', voix: 'lepers_lepers_oui_oui_oui', delai: 0.6 },
        ],
      },
      { a: 18, actions: [{ visage: 'jlm', expression: 'base' }, { visage: 'marine', expression: 'base' }, { narrateur: 'Le Pen arrive en tête. Mélenchon est éliminé. Au second tour, un socialiste la bat.' }] },
      { a: 21.8, actions: [{ dit: 'jlm', texte: 'Vous avez perdu aussi !', invente: true }, { dit: 'marine', texte: 'Moi, au second tour.', invente: true, delai: 1.7 }] },
    ],
  },
  {
    id: 'melenchon_hologrammes',
    heros: 'melenchon',
    moment: 'avant_chapitre',
    chapitre: 'hologrammes',
    style: 'guignol',
    duree: 24,
    decor: 'meeting',
    musique: 'cosmique',
    distribution: [
      { role: 'jlm', personnage: 'melenchon' },
      { role: 'holo', personnage: 'melenchon' },
    ],
    plans: [
      {
        a: 0,
        actions: [
          { titre: '2017', sous_titre: 'Deux meetings à la fois' },
          { place: 'jlm', x: 30 },
          { place: 'holo', x: 70, profondeur: 15 },
          { aspect: 'holo', comme: 'hologramme' },
        ],
      },
      { a: 2.2, actions: [{ narrateur: 'À Lyon, le vrai Mélenchon. À Aubervilliers, son hologramme. Avec trois secondes de retard.' }] },
      { a: 6.6, actions: [{ pose: 'jlm', quoi: 'poing_leve' }, { dit: 'jlm', texte: 'Je suis le candidat du peuple !', invente: true }] },
      { a: 9.4, actions: [{ pose: 'holo', quoi: 'poing_leve' }, { dit: 'holo', texte: 'Je suis le candidat du peuple !', invente: true }, { foule: 'OUAIS !', delai: 1.4 }] },
      { a: 12.4, actions: [{ pose: 'jlm', quoi: 'debout' }, { dit: 'jlm', texte: 'Merci Lyon !', invente: true }] },
      { a: 14.6, actions: [{ pose: 'holo', quoi: 'salue', en: 1.6 }, { dit: 'holo', texte: 'Merci Lyon !', invente: true }, { foule: 'ON EST À AUBERVILLIERS !', delai: 1 }] },
      { a: 17, cadre: { sur: 'jlm' }, actions: [{ regarde: 'jlm', vers: 'droite' }, { dit: 'jlm', texte: 'Qu\'est-ce que ça veut dire ?', source: 'Assemblée nationale, 17 octobre 2018', voix: 'melenchon_reprise_accent_toulouse' }] },
      { a: 20.6, cadre: 'large', actions: [{ dit: 'holo', texte: 'Et je propose la VIIe République !', invente: true }, { visage: 'jlm', expression: 'choc', delai: 0.6 }, { visage: 'jlm', expression: 'base', delai: 2.8 }] },
    ],
  },
  {
    id: 'melenchon_perquisition',
    heros: 'melenchon',
    moment: 'avant_chapitre',
    chapitre: 'perquisition',
    style: 'guignol',
    duree: 24,
    decor: 'rue',
    musique: 'suspense',
    distribution: [
      { role: 'jlm', personnage: 'melenchon' },
      { role: 'flic', personnage: 'pancarte:Un policier' },
    ],
    accessoires: [{ id: 'porte', type: 'porte', texte: 'TIREZ' }],
    plans: [
      {
        a: 0,
        actions: [
          { titre: '16 octobre 2018', sous_titre: 'Perquisition à La France insoumise' },
          { accessoire: 'porte', fait: 'apparait', x: 62 },
          { place: 'flic', x: 80, regarde: 'gauche' },
          { entre: 'jlm', par: 'gauche', x: 40, en: 1.2, allure: 'court', delai: 1.8 },
        ],
      },
      { a: 3.4, cadre: { sur: 'jlm' }, actions: [{ pose: 'jlm', quoi: 'poing_leve' }, { dit: 'jlm', texte: 'La République, c\'est moi ! C\'est moi qui suis parlementaire !', source: 'Perquisition au siège de LFI, 16 octobre 2018', voix: 'melenchon_melenchon_republique_cest_moi' }] },
      { a: 6.6, cadre: 'large', actions: [{ va: 'jlm', x: 55, en: 0.6, allure: 'court' }, { pose: 'jlm', quoi: 'penche', delai: 0.6 }, { tremble: 'jlm', delai: 0.7 }, { tremble: 'jlm', delai: 1.3 }] },
      { a: 8.8, actions: [{ dit: 'flic', texte: 'Monsieur. C\'est marqué « Tirez ».', invente: true }] },
      { a: 11.6, cadre: { sur: 'jlm' }, actions: [{ dit: 'jlm', texte: 'Personne ne me touche ! Ma personne est sacrée ! Je suis parlementaire !', source: 'Perquisition au siège de LFI, 16 octobre 2018', voix: 'melenchon_melenchon_personne_sacree' }, { tremble: 'jlm', delai: 1 }, { tremble: 'jlm', delai: 2.6 }] },
      { a: 16.6, cadre: 'large', actions: [{ dit: 'flic', texte: 'Personne ne vous touche. Tirez, c\'est tout.', invente: true }] },
      { a: 19.8, actions: [{ pose: 'jlm', quoi: 'debout' }, { accessoire: 'porte', fait: 'disparait' }, { visage: 'jlm', expression: 'choc', delai: 0.3 }, { narrateur: 'Trois mois avec sursis et 8 000 euros d\'amende. Il n\'a pas fait appel. La porte non plus.', delai: 0.6 }, { visage: 'jlm', expression: 'base', delai: 2.4 }] },
    ],
  },
  {
    id: 'melenchon_faites_mieux',
    heros: 'melenchon',
    moment: 'avant_chapitre',
    chapitre: 'faites_mieux',
    style: 'jt',
    duree: 25,
    decor: 'nuit_electorale',
    musique: 'suspense',
    distribution: [
      { role: 'jlm', personnage: 'melenchon' },
      { role: 'roussel', personnage: 'roussel' },
    ],
    accessoires: [{ id: 'escalope', type: 'escalope' }],
    plans: [
      { a: 0, actions: [{ titre: '10 avril 2022', sous_titre: 'Soir du premier tour' }, { place: 'jlm', x: 34 }, { bandeau: 'Le Pen 23,15 %, Mélenchon 21,95 % : il lui manque 421 420 voix.', delai: 1.4 }] },
      { a: 3, actions: [{ pense: 'jlm', texte: '421 420 voix… Où sont-elles ?' }] },
      { a: 5.4, actions: [{ entre: 'roussel', par: 'droite', x: 70, en: 1.2 }, { accessoire: 'escalope', fait: 'tient', par: 'roussel', delai: 1.2 }] },
      { a: 7, actions: [{ regarde: 'jlm', vers: 'droite' }, { dit: 'jlm', texte: 'Fabien. Tu as fait combien ?', invente: true }] },
      { a: 9.2, actions: [{ dit: 'roussel', texte: '2,28 %.', invente: true }] },
      { a: 10.9, actions: [{ dit: 'jlm', texte: 'Et ça fait combien de voix, ça ?', invente: true }] },
      { a: 13.4, actions: [{ dit: 'roussel', texte: 'Environ… 800 000.', invente: true }] },
      { a: 15.2, cadre: { sur: 'jlm' }, actions: [{ visage: 'jlm', expression: 'choc' }, { tremble: 'jlm', delai: 0.4 }, { dit: 'jlm', texte: 'Et tu manges une escalope ?!', invente: true, delai: 0.6 }] },
      { a: 17.8, cadre: 'large', actions: [{ visage: 'jlm', expression: 'base' }, { dit: 'roussel', texte: 'Franchement, vous n\'allez pas me parler du sexe des escalopes quand même !', source: 'Europe 1, 30 août 2022', voix: 'roussel_roussel_sexe_escalopes' }] },
      { a: 21.4, actions: [{ pose: 'jlm', quoi: 'montre' }, { dit: 'jlm', texte: 'Faites mieux !', source: 'Discours du soir du premier tour, 10 avril 2022' }, { narrateur: 'LFI en veut encore à Fabien Roussel. Et à son escalope.', delai: 1.6 }] },
    ],
  },
  {
    id: 'melenchon_avant_boss',
    heros: 'melenchon',
    moment: 'avant_boss',
    style: 'jt',
    duree: 26,
    decor: 'tf1_second_tour',
    musique: 'suspense',
    distribution: [
      { role: 'marine', personnage: 'lepen' },
      { role: 'holo', personnage: 'melenchon' },
      { role: 'bouleau', personnage: 'bouleau' },
    ],
    accessoires: [
      { id: 'dossier', type: 'dossier' },
      { id: 'pupitre_marine', type: 'pupitre' },
      { id: 'pupitre_holo', type: 'pupitre' },
    ],
    plans: [
      {
        a: 0,
        actions: [
          { titre: '2027', sous_titre: 'Le débat du second tour' },
          { accessoire: 'pupitre_marine', fait: 'apparait', x: 26 },
          { accessoire: 'pupitre_holo', fait: 'apparait', x: 74 },
          { place: 'marine', x: 26 },
          { place: 'holo', x: 74 },
          { aspect: 'holo', comme: 'hologramme' },
          { place: 'bouleau', x: 50, profondeur: 45 },
        ],
      },
      { a: 2.4, actions: [{ narrateur: 'Pour le débat, Mélenchon est resté à Marseille. Il envoie son hologramme.' }] },
      { a: 6, actions: [{ dit: 'bouleau', texte: 'Madame Le Pen, en 2017, vos dossiers avaient fait sensation.', invente: true }] },
      { a: 10.4, actions: [{ accessoire: 'dossier', fait: 'tient', par: 'marine' }, { dit: 'marine', texte: 'Cette fois, je n\'en ai pris qu\'un.', invente: true }] },
      { a: 13, actions: [{ dit: 'marine', texte: '… Il est vide.', invente: true }, { visage: 'marine', expression: 'choc', delai: 0.3 }] },
      { a: 15, actions: [{ visage: 'marine', expression: 'base' }, { tremble: 'holo' }, { dit: 'holo', texte: 'Pathé… tique… bzzt.', invente: true }] },
      { a: 17, actions: [{ aspect: 'holo', comme: 'renverse' }, { dit: 'bouleau', texte: 'Monsieur Mélenchon ? Vous êtes à l\'envers.', invente: true, delai: 0.5 }] },
      { a: 20.3, actions: [{ dit: 'holo', texte: '!iom tse\'c ,euqilbupéR aL', invente: true }] },
      { a: 22.5, actions: [{ dit: 'marine', texte: 'Enfin un débat équilibré.', invente: true }, { bandeau: 'Abstention record : 98 %. Les 2 % restants regardaient Koh-Lanta.', delai: 1.2 }] },
    ],
  },
  {
    id: 'melenchon_victoire',
    heros: 'melenchon',
    moment: 'victoire',
    style: 'guignol',
    duree: 25,
    decor: 'elysee',
    musique: 'fanfare',
    distribution: [
      { role: 'jlm', personnage: 'melenchon' },
      { role: 'macron', personnage: 'macron' },
    ],
    accessoires: [{ id: 'codes', type: 'dossier', texte: 'CODES' }],
    plans: [
      { a: 0, actions: [{ titre: 'Élu !', sous_titre: 'La passation de pouvoir' }, { confettis: true, delai: 0.4 }, { place: 'macron', x: 64, regarde: 'gauche' }, { entre: 'jlm', par: 'gauche', x: 36, en: 1.4, delai: 0.8 }] },
      { a: 2.8, actions: [{ dit: 'macron', texte: 'Bienvenue à l\'Élysée, monsieur le Président.', invente: true }] },
      { a: 6, actions: [{ dit: 'jlm', texte: 'Merci. Je viens perquisitionner.', invente: true }] },
      { a: 8.6, cadre: { sur: 'macron' }, actions: [{ dit: 'macron', texte: 'Qui aurait pu prédire ?', source: 'Vœux du 31 décembre 2022 (boîte à sons MyInstants)', voix: 'macron_boite_macron_qui_aurait_pu_predire' }] },
      { a: 10.2, cadre: 'large', actions: [{ accessoire: 'codes', fait: 'tient', par: 'macron' }, { dit: 'macron', texte: 'Les codes nucléaires. Ne les perdez pas.', invente: true }] },
      { a: 13.2, actions: [{ accessoire: 'codes', fait: 'donne', par: 'macron', a: 'jlm' }, { dit: 'jlm', texte: 'Et la porte, elle se tire ou elle se pousse ?', invente: true, delai: 0.4 }] },
      { a: 16.6, actions: [{ dit: 'macron', texte: 'Dans les deux sens. On a fait des travaux.', invente: true }] },
      { a: 19.6, cadre: { sur: 'jlm' }, actions: [{ visage: 'jlm', expression: 'rire' }, { pose: 'jlm', quoi: 'bras_leves' }, { dit: 'jlm', texte: 'La République, c\'est moi ! C\'est moi qui suis parlementaire !', source: 'Perquisition au siège de LFI, 16 octobre 2018', voix: 'melenchon_melenchon_republique_cest_moi' }] },
      { a: 22.6, cadre: 'large', actions: [{ visage: 'jlm', expression: 'base' }, { sort: 'macron', par: 'droite', en: 1.6 }, { narrateur: 'Premier décret : en France, toutes les portes s\'ouvriront dans les deux sens.' }] },
    ],
  },
  {
    id: 'melenchon_defaite',
    heros: 'melenchon',
    moment: 'defaite',
    style: 'muet',
    duree: 10,
    decor: 'tf1_second_tour',
    musique: 'piano_muet',
    distribution: [{ role: 'jlm', personnage: 'melenchon' }],
    accessoires: [{ id: 'pupitre', type: 'pupitre' }, { id: 'porte', type: 'porte', texte: 'TIREZ' }],
    plans: [
      { a: 0, actions: [{ accessoire: 'pupitre', fait: 'apparait', x: 40 }, { place: 'jlm', x: 40 }, { titre: '2027' }] },
      { a: 2.3, actions: [{ dit: 'jlm', texte: 'Vous êtes des gens sans principe, sans foi ni loi. Allez, bonsoir tout le monde.', source: 'Face à BFM, 9 février 2023', voix: 'melenchon_melenchon_sans_foi_ni_loi' }] },
      { a: 6.7, actions: [{ accessoire: 'porte', fait: 'apparait', x: 80 }, { va: 'jlm', x: 74, en: 0.9 }, { pose: 'jlm', quoi: 'penche', delai: 0.9 }, { tremble: 'jlm', delai: 1 }, { titre: 'En retrait. Pas en retraite.', delai: 1.2 }] },
    ],
  },
];
