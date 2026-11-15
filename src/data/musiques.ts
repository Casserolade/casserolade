/**
 * La musique de fond de la table : des morceaux libres d'OpenGameArt et un morceau du jeu. `fichier` est son nom dans
 * assets/game/sons/musique (sans l'extension). Chaque morceau est crédité sur la page À propos, comme ses licences le
 * demandent ; le bouton de la musique dit celui qui joue.
 */
export interface Musique {
  fichier: string;
  titre: string;
  auteur: string;
  /** Le nom de la licence, ou « © Casserolade » pour un morceau du jeu, tous droits réservés. */
  licence: string;
  source?: string;
  /** Un morceau rare : il ne joue que si le hasard tombe sur lui alors que le héros n'a plus qu'un sondage. */
  dernierSouffle?: boolean;
}

export const MUSIQUES: Musique[] = [
  { fichier: 'quijada', titre: 'Quijada', auteur: 'Casserolade', licence: '© Casserolade', dernierSouffle: true },
  { fichier: 'comedie_acoustique', titre: 'Comedy Funny Background Song', auteur: 'Almitory', licence: 'CC BY 4.0', source: 'https://opengameart.org/content/comedy-funny-background-song' },
  { fichier: 'biere_et_ragtime', titre: 'Ale \'n\' a Rag', auteur: 'JSKNYC', licence: 'CC BY 3.0', source: 'https://opengameart.org/content/ale-n-a-rag' },
  { fichier: 'dilemme_au_cirque', titre: 'Circus Dilemma', auteur: 'Matthew Pablo', licence: 'CC BY 3.0', source: 'https://opengameart.org/content/circus-dilemma' },
  { fichier: 'delicieusement_acide', titre: 'Deliciously Sour', auteur: 'Matthew Pablo', licence: 'CC BY 3.0', source: 'https://opengameart.org/content/deliciously-sour' },
  { fichier: 'armee_sur_la_pointe_des_pieds', titre: 'Tiptoe Army', auteur: 'Alexandr Zhelanov', licence: 'CC BY 4.0', source: 'https://opengameart.org/content/tiptoe-army' },
  { fichier: 'taverne_tapageuse', titre: 'The Rowdy Tavern', auteur: 'Snabisch', licence: 'CC BY 3.0', source: 'https://opengameart.org/content/the-rowdy-tavern' },
  { fichier: 'danse_du_menestrel', titre: 'Minstrel Dance', auteur: 'RandomMind', licence: 'CC0', source: 'https://opengameart.org/content/medieval-minstrel-dance' },
  { fichier: 'conte_du_barde', titre: 'The Bard\'s Tale', auteur: 'RandomMind', licence: 'CC0', source: 'https://opengameart.org/content/medieval-the-bards-tale' },
  { fichier: 'auberge_de_la_vieille_tour', titre: 'The Old Tower Inn', auteur: 'RandomMind', licence: 'CC0', source: 'https://opengameart.org/content/medieval-the-old-tower-inn' },
];

/** Les bruitages enregistrés qui ont un auteur à citer. */
export const BRUITAGES_CREDITES: Musique[] = [
  {
    fichier: 'wilhelm', titre: 'Le cri de Wilhelm', auteur: 'sans doute Sheb Wooley, 1951 (bibliothèque Sunset Editorial)', licence: 'CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Wilhelm_Scream.ogg',
  },
];
