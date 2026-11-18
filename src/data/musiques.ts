/**
 * La musique de fond de la table : des morceaux de Kevin MacLeod (incompetech.com), sous licence Creative Commons
 * Attribution 4.0, et un morceau du jeu. `fichier` est son nom dans assets/game/sons/musique (sans l'extension). Chaque
 * morceau est crédité sur la page À propos, comme sa licence le demande ; le bouton de la musique dit celui qui joue.
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

/** L'auteur tel qu'il demande à être cité, et la page de chacun de ses morceaux, par son numéro ISRC. */
const KEVIN_MACLEOD = 'Kevin MacLeod (incompetech.com)';
const INCOMPETECH = 'https://incompetech.com/music/royalty-free/index.html?isrc=';

export const MUSIQUES: Musique[] = [
  { fichier: 'quijada', titre: 'Quijada', auteur: 'Casserolade', licence: '© Casserolade', dernierSouffle: true },
  { fichier: 'petit_mouchard', titre: 'Sneaky Snitch', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1100772` },
  { fichier: 'fouine_intrigante', titre: 'Scheming Weasel (faster version)', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1100085` },
  { fichier: 'agenda_cache', titre: 'Hidden Agenda', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1200102` },
  { fichier: 'enquetes', titre: 'Investigations', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1100646` },
  { fichier: 'marty_a_un_plan', titre: 'Marty Gots a Plan', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1500015` },
  { fichier: 'singes_qui_tournent', titre: 'Monkeys Spinning Monkeys', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1400011` },
  { fichier: 'canard_ebouriffe', titre: 'Fluffing a Duck', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1100768` },
  { fichier: 'le_batisseur', titre: 'The Builder', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1400016` },
  { fichier: 'jeu_televise', titre: 'Happy Happy Game Show', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1600006` },
  { fichier: 'meteo_locale', titre: 'Local Forecast - Elevator', auteur: KEVIN_MACLEOD, licence: 'CC BY 4.0', source: `${INCOMPETECH}USUAN1300012` },
];

/** Les bruitages enregistrés qui ont un auteur à citer. */
export const BRUITAGES_CREDITES: Musique[] = [
  {
    fichier: 'wilhelm', titre: 'Le cri de Wilhelm', auteur: 'sans doute Sheb Wooley, 1951 (bibliothèque Sunset Editorial)', licence: 'CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Wilhelm_Scream.ogg',
  },
];
