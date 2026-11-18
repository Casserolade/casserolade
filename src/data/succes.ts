/**
 * Le tableau des succès : une ligne de données par succès, comme une carte. Ils se gagnent en partie rapide, en
 * carrière et en ligne, et se gardent dans le navigateur, sans compte. Un succès ne donne qu'un titre : en ligne,
 * tout le monde joue à armes égales.
 *
 * Ils sont faits pour être durs, et bêtes (17 novembre 2026) : beaucoup de succès, difficiles à atteindre, tous plus
 * idiots les uns que les autres. Les seuils sont calés sur ce qu'un
 * bon joueur atteint : le bot difficile, sur 400 parties contre des bots moyens, ne touche la plupart qu'une fois sur
 * cent, ou jamais.
 */

/** Un fait d'une partie finie, toujours un nombre (src/histoire/bilanDePartie.ts). */
export type Fait =
  /** Sa place finale : 1, la victoire. */
  | 'place'
  /** La table : ses sièges, et les humains qui y étaient encore à la fin (zéro hors ligne, où l'on joue seul). */
  | 'joueurs' | 'humains'
  /** 1 pour l'hôte d'un salon public, 0 sinon. */
  | 'hote_public'
  // Ce que le moteur a compté de ses gestes.
  | 'casseroles' | 'scandales' | 'oublis' | 'triples' | 'sorts' | 'actualisations' | 'renvois' | 'gels' | 'depenses'
  // Ce que la partie a montré en route.
  | 'plus_gros' | 'sondages_perdus' | 'sondages_au_plus_bas' | 'sondages' | 'manches' | 'echelon'
  // Son plateau de la fin.
  | 'politiques' | 'dores' | 'camps' | 'meme_camp' | 'gauche_plurielle' | 'union_des_droites' | 'presidents'
  | 'porte_parole' | 'immunites' | 'celebrations' | 'casseroles_sur_un' | 'attaque_totale';

/** Le niveau des bots d'une partie rapide. Une carrière et le tutoriel n'en ont pas. */
export type Niveau = 'facile' | 'moyen' | 'difficile';

/** Ce qu'un fait doit valoir : au moins, au plus, ou les deux (pile ce nombre). */
export interface Borne {
  min?: number;
  max?: number;
}

export type Condition =
  /**
   * Parties gagnées, toutes comptées ; avec un niveau, celles gagnées contre des bots de ce niveau ou plus forts ;
   * `enLigne` : celles gagnées en ligne, à une table d'au moins deux humains.
   */
  | { type: 'victoires'; n: number; niveau?: Niveau; enLigne?: true }
  /** Parties finies, toutes comptées ; `enLigne` : celles jouées en ligne, à une table d'au moins deux humains. */
  | { type: 'parties'; n: number; enLigne?: true }
  /** Finir à cette place tant de parties de suite ; avec un niveau, chacune contre des bots de ce niveau ou plus forts. */
  | { type: 'serie'; place: number; n: number; niveau?: Niveau }
  /** Gagner avec tant de héros différents ; « tous » : chacun des héros du jeu. */
  | { type: 'heros'; n: number | 'tous' }
  /**
   * Une partie dont chaque fait cité tient entre ses bornes ; s'il y a lieu contre des bots de ce niveau ou plus
   * forts, et avec ce héros.
   */
  | { type: 'partie'; faits: Partial<Record<Fait, Borne>>; niveau?: Niveau; heros?: string }
  /** Réussir ce chapitre de la carrière ; avec `carriere`, dans la carrière de ce politique. */
  | { type: 'chapitre'; id: string; carriere?: string };

export type Recompense =
  /** Un titre, à côté du pseudo. */
  { type: 'titre'; titre: string };

/** Les rayons du tableau, dans l'ordre où il les montre. */
export type Rayon = 'en_ligne' | 'mandats' | 'sondages' | 'gros_bras' | 'casseroles' | 'plateau' | 'pupitre' | 'carriere';

export const RAYONS: Record<Rayon, string> = {
  en_ligne: 'En ligne',
  mandats: 'Les mandats',
  sondages: 'Les sondages',
  gros_bras: 'Les gros bras',
  casseroles: 'Les casseroles',
  plateau: 'Le plateau',
  pupitre: 'Le pupitre',
  carriere: 'La carrière',
};

export interface Succes {
  id: string;
  rayon: Rayon;
  nom: string;
  description: string;
  condition: Condition;
  recompense?: Recompense;
}

const GAGNER: Borne = { max: 1 };
const DERNIER: Borne = { min: 8 };
const titre = (texte: string): Recompense => ({ type: 'titre', titre: texte });

export const SUCCES: Succes[] = [
  // En ligne : contre de vrais gens, à une table d'au moins deux humains.
  { id: 'suffrage_universel', rayon: 'en_ligne', nom: 'Suffrage universel', description: 'Gagner une partie en ligne, contre au moins un autre joueur.', condition: { type: 'victoires', n: 1, enLigne: true }, recompense: titre('L\'Élu du peuple') },
  { id: 'majorite_presidentielle', rayon: 'en_ligne', nom: 'Majorité présidentielle', description: 'Gagner dix parties en ligne.', condition: { type: 'victoires', n: 10, enLigne: true }, recompense: titre('Le Chef de la majorité') },
  { id: 'raz_de_maree', rayon: 'en_ligne', nom: 'Raz-de-marée', description: 'Gagner cinquante parties en ligne.', condition: { type: 'victoires', n: 50, enLigne: true }, recompense: titre('Le Raz-de-marée') },
  { id: 'bain_de_foule', rayon: 'en_ligne', nom: 'Bain de foule', description: 'Finir vingt-cinq parties en ligne.', condition: { type: 'parties', n: 25, enLigne: true } },
  { id: 'grand_debat', rayon: 'en_ligne', nom: 'Grand débat', description: 'Gagner une partie à huit joueurs, sans un seul bot.', condition: { type: 'partie', faits: { place: GAGNER, humains: { min: 8 } } }, recompense: titre('Le Vainqueur du grand débat') },
  { id: 'entre_deux_tours', rayon: 'en_ligne', nom: 'Débat d\'entre-deux-tours', description: 'Gagner un duel : deux joueurs, pas de bot.', condition: { type: 'partie', faits: { place: GAGNER, humains: { min: 2 }, joueurs: { max: 2 } } } },
  { id: 'referendum', rayon: 'en_ligne', nom: 'Référendum', description: 'Gagner une partie en ligne à quatre joueurs ou plus sans perdre un seul sondage.', condition: { type: 'partie', faits: { place: GAGNER, humains: { min: 4 }, sondages_perdus: { max: 0 } } }, recompense: titre('Le Référendum') },
  { id: 'reunion_publique', rayon: 'en_ligne', nom: 'Réunion publique', description: 'Ouvrir un salon public et y finir une partie avec au moins quatre joueurs.', condition: { type: 'partie', faits: { hote_public: { min: 1 }, humains: { min: 4 } } } },
  { id: 'motion_de_censure', rayon: 'en_ligne', nom: 'Motion de censure', description: 'Finir dernier d\'une partie à huit joueurs, sans un seul bot.', condition: { type: 'partie', faits: { place: DERNIER, humains: { min: 8 } } } },

  // Les mandats : gagner, encore, et de toutes les façons.
  { id: 'premier_mandat', rayon: 'mandats', nom: 'Premier mandat', description: 'Gagner une partie contre des bots difficiles.', condition: { type: 'victoires', n: 1, niveau: 'difficile' }, recompense: titre('L\'Élu') },
  { id: 'cumul', rayon: 'mandats', nom: 'Cumul des mandats', description: 'Gagner dix parties contre des bots difficiles.', condition: { type: 'victoires', n: 10, niveau: 'difficile' }, recompense: titre('Le Cumulard') },
  { id: 'baron', rayon: 'mandats', nom: 'Baron local', description: 'Gagner vingt-cinq parties contre des bots moyens ou difficiles.', condition: { type: 'victoires', n: 25, niveau: 'moyen' }, recompense: titre('Le Baron') },
  { id: 'dinosaure', rayon: 'mandats', nom: 'Dinosaure', description: 'Gagner cent parties.', condition: { type: 'victoires', n: 100 }, recompense: titre('Le Dinosaure') },
  { id: 'inusable', rayon: 'mandats', nom: 'Quarante ans de vie politique', description: 'Finir deux cents parties.', condition: { type: 'parties', n: 200 }, recompense: titre('L\'Inusable') },
  { id: 'reelu', rayon: 'mandats', nom: 'Réélu', description: 'Gagner deux parties de suite contre des bots difficiles.', condition: { type: 'serie', place: 1, n: 2, niveau: 'difficile' } },
  { id: 'dynastie', rayon: 'mandats', nom: 'Dynastie', description: 'Gagner cinq parties de suite.', condition: { type: 'serie', place: 1, n: 5 }, recompense: titre('Le Monarque républicain') },
  { id: 'eternel_second', rayon: 'mandats', nom: 'L\'éternel second', description: 'Finir deuxième trois parties de suite.', condition: { type: 'serie', place: 2, n: 3 }, recompense: titre('L\'Éternel second') },
  { id: 'traversee_du_desert', rayon: 'mandats', nom: 'Traversée du désert', description: 'Finir dernier cinq parties de suite.', condition: { type: 'serie', place: 8, n: 5 }, recompense: titre('Le Candidat de témoignage') },
  { id: 'tous_les_memes', rayon: 'mandats', nom: 'Tous les mêmes', description: 'Gagner avec dix héros différents.', condition: { type: 'heros', n: 10 }, recompense: titre('Le Caméléon') },
  { id: 'homme_orchestre', rayon: 'mandats', nom: 'Candidat à tout', description: 'Gagner avec chacun des héros du jeu.', condition: { type: 'heros', n: 'tous' }, recompense: titre('L\'Homme-orchestre') },
  { id: 'miracle', rayon: 'mandats', nom: 'Miracle à Bugarach', description: 'Gagner avec Sylvain Durif contre des bots difficiles.', condition: { type: 'partie', faits: { place: GAGNER }, niveau: 'difficile', heros: 'durif' }, recompense: titre('Le Christ cosmique') },
  { id: 'on_se_retrouvera', rayon: 'mandats', nom: 'On se retrouvera', description: 'Gagner avec Francis Lalanne contre des bots difficiles.', condition: { type: 'partie', faits: { place: GAGNER }, niveau: 'difficile', heros: 'lalanne' } },
  { id: 'premier_tour', rayon: 'mandats', nom: 'Élu au premier tour', description: 'Gagner une partie en douze manches ou moins.', condition: { type: 'partie', faits: { place: GAGNER, manches: { max: 12 } } } },
  { id: 'obstruction', rayon: 'mandats', nom: 'Obstruction parlementaire', description: 'Faire durer une partie vingt manches.', condition: { type: 'partie', faits: { manches: { min: 20 } } } },
  { id: 'vingt_et_un_avril', rayon: 'mandats', nom: '21 avril', description: 'Être éliminé le premier, avant la manche 7.', condition: { type: 'partie', faits: { place: DERNIER, manches: { max: 6 } } } },

  // Les sondages : ne rien perdre, ou presque tout.
  { id: 'sans_opposition', rayon: 'sondages', nom: 'Sans opposition', description: 'Gagner contre des bots faciles sans perdre un seul sondage.', condition: { type: 'partie', faits: { place: GAGNER, sondages_perdus: { max: 0 } }, niveau: 'facile' } },
  { id: 'etat_de_grace', rayon: 'sondages', nom: 'État de grâce', description: 'Gagner contre des bots moyens sans perdre un seul sondage.', condition: { type: 'partie', faits: { place: GAGNER, sondages_perdus: { max: 0 } }, niveau: 'moyen' }, recompense: titre('L\'État de grâce') },
  { id: 'score_sovietique', rayon: 'sondages', nom: 'Score soviétique', description: 'Gagner contre des bots difficiles sans perdre un seul sondage.', condition: { type: 'partie', faits: { place: GAGNER, sondages_perdus: { max: 0 } }, niveau: 'difficile' }, recompense: titre('Le Plébiscité') },
  { id: 'inverser_la_courbe', rayon: 'sondages', nom: 'Inverser la courbe', description: 'Gagner une partie après être tombé à trois sondages ou moins.', condition: { type: 'partie', faits: { place: GAGNER, sondages_au_plus_bas: { max: 3 } } }, recompense: titre('Le Revenant') },
  { id: 'a_une_voix_pres', rayon: 'sondages', nom: 'À une voix près', description: 'Gagner une partie avec un seul sondage.', condition: { type: 'partie', faits: { place: GAGNER, sondages: { min: 1, max: 1 } } } },

  // Les gros bras : des chiffres qui n'ont plus de sens.
  { id: 'bete_politique', rayon: 'gros_bras', nom: 'Bête politique', description: 'Monter un politique à 2000/2000.', condition: { type: 'partie', faits: { plus_gros: { min: 2000 } } }, recompense: titre('La Bête politique') },
  { id: 'culte', rayon: 'gros_bras', nom: 'Culte de la personnalité', description: 'Monter un politique à 20 000/20 000.', condition: { type: 'partie', faits: { plus_gros: { min: 20_000 } } }, recompense: titre('Le Guide suprême') },
  { id: 'dette_publique', rayon: 'gros_bras', nom: 'Dette publique', description: 'Monter un politique à un million / un million.', condition: { type: 'partie', faits: { plus_gros: { min: 1_000_000 } } }, recompense: titre('Le Trois mille milliards') },
  { id: 'plafond_de_la_dette', rayon: 'gros_bras', nom: 'Plafond de la dette', description: 'Monter un politique au plafond : un milliard / un milliard.', condition: { type: 'partie', faits: { plus_gros: { min: 1_000_000_000 } } } },
  { id: 'majorite_absolue', rayon: 'gros_bras', nom: 'Majorité absolue', description: 'Finir une partie avec 289 d\'attaque sur le plateau. Pile 289.', condition: { type: 'partie', faits: { attaque_totale: { min: 289, max: 289 } } } },
  { id: 'geant_aux_pieds_d_argile', rayon: 'gros_bras', nom: 'Géant aux pieds d\'argile', description: 'Finir dernier avec un politique à 1000/1000.', condition: { type: 'partie', faits: { place: DERNIER, plus_gros: { min: 1000 } } } },
  { id: 'homme_providentiel', rayon: 'gros_bras', nom: 'L\'homme providentiel', description: 'Gagner une partie avec trois politiques ou moins sur le plateau.', condition: { type: 'partie', faits: { place: GAGNER, politiques: { max: 3 } } }, recompense: titre('L\'Homme providentiel') },

  // Les casseroles : en poser trop, ou pas du tout.
  { id: 'casserolade', rayon: 'casseroles', nom: 'Casserolade', description: 'Poser trente casseroles dans une partie.', condition: { type: 'partie', faits: { casseroles: { min: 30 } } }, recompense: titre('Le Batteur de casseroles') },
  { id: 'mains_propres', rayon: 'casseroles', nom: 'Mains propres', description: 'Gagner contre des bots difficiles sans poser une seule casserole.', condition: { type: 'partie', faits: { place: GAGNER, casseroles: { max: 0 } }, niveau: 'difficile' }, recompense: titre('Monsieur Propre') },
  { id: 'affaire_d_etat', rayon: 'casseroles', nom: 'Affaire d\'État', description: 'Huit scandales dans une partie.', condition: { type: 'partie', faits: { scandales: { min: 8 } } } },
  { id: 'le_peuple_oublie', rayon: 'casseroles', nom: 'Le peuple oublie toujours', description: 'Gagner une partie après sept oublis du peuple.', condition: { type: 'partie', faits: { place: GAGNER, oublis: { min: 7 } } }, recompense: titre('Le Blanchi') },
  { id: 'multirecidiviste', rayon: 'casseroles', nom: 'Multirécidiviste', description: 'Finir une partie avec quinze casseroles sur le même politique.', condition: { type: 'partie', faits: { casseroles_sur_un: { min: 15 } } }, recompense: titre('Le Multirécidiviste') },

  // Le plateau : des majorités qu'on ne voit qu'ici.
  { id: 'parti_unique', rayon: 'plateau', nom: 'Parti unique', description: 'Gagner avec sept politiques du même camp.', condition: { type: 'partie', faits: { place: GAGNER, meme_camp: { min: 7 } } }, recompense: titre('Le Secrétaire général') },
  { id: 'gauche_plurielle', rayon: 'plateau', nom: 'Gauche plurielle', description: 'Gagner avec deux Insoumis, deux Socialistes et deux Écologistes.', condition: { type: 'partie', faits: { place: GAGNER, gauche_plurielle: { min: 2 } } } },
  { id: 'union_des_droites', rayon: 'plateau', nom: 'Union des droites', description: 'Gagner avec deux Républicains, deux RN et deux Reconquête.', condition: { type: 'partie', faits: { place: GAGNER, union_des_droites: { min: 2 } } } },
  { id: 'cohabitation', rayon: 'plateau', nom: 'Cohabitation', description: 'Gagner avec six camps différents sur le plateau.', condition: { type: 'partie', faits: { place: GAGNER, camps: { min: 6 } } } },
  { id: 'diner_d_etat', rayon: 'plateau', nom: 'Dîner d\'État', description: 'Gagner avec quatre présidents de la République sur le plateau.', condition: { type: 'partie', faits: { place: GAGNER, presidents: { min: 4 } } } },
  { id: 'bling_bling', rayon: 'plateau', nom: 'Bling-bling', description: 'Finir une partie avec six politiques dorés.', condition: { type: 'partie', faits: { dores: { min: 6 } } }, recompense: titre('Le Bling-bling') },
  { id: 'age_d_or', rayon: 'plateau', nom: 'Les Trente Glorieuses', description: 'Finir une partie avec sept politiques dorés.', condition: { type: 'partie', faits: { dores: { min: 7 } } } },
  { id: 'langue_de_bois', rayon: 'plateau', nom: 'Langue de bois', description: 'Gagner avec sept Porte-parole.', condition: { type: 'partie', faits: { place: GAGNER, porte_parole: { min: 7 } } } },
  { id: 'immunite_parlementaire', rayon: 'plateau', nom: 'Immunité parlementaire', description: 'Gagner avec sept politiques sous Immunité.', condition: { type: 'partie', faits: { place: GAGNER, immunites: { min: 7 } } }, recompense: titre('L\'Intouchable') },
  { id: 'peopolisation', rayon: 'plateau', nom: 'Peopolisation', description: 'Gagner avec six politiques qui ont une Célébration.', condition: { type: 'partie', faits: { place: GAGNER, celebrations: { min: 6 } } } },
  { id: 'plafond_de_verre', rayon: 'plateau', nom: 'Plafond de verre', description: 'Gagner une partie sans dépasser l\'échelon 4.', condition: { type: 'partie', faits: { place: GAGNER, echelon: { max: 4 } } } },

  // Le pupitre : s'acharner sur les boutons, ou ne jamais y toucher.
  { id: 'girouette', rayon: 'pupitre', nom: 'Girouette', description: 'Actualiser la boutique cent fois dans une partie.', condition: { type: 'partie', faits: { actualisations: { min: 100 } } }, recompense: titre('La Girouette') },
  { id: 'sobriete', rayon: 'pupitre', nom: 'Fin de l\'abondance', description: 'Gagner une partie sans actualiser la boutique une seule fois.', condition: { type: 'partie', faits: { place: GAGNER, actualisations: { max: 0 } } }, recompense: titre('Le Père la Rigueur') },
  { id: 'remaniement', rayon: 'pupitre', nom: 'Remaniement permanent', description: 'Renvoyer vingt-cinq politiques dans une partie.', condition: { type: 'partie', faits: { renvois: { min: 25 } } } },
  { id: 'immobilisme', rayon: 'pupitre', nom: 'Immobilisme', description: 'Gagner une partie sans renvoyer un seul politique.', condition: { type: 'partie', faits: { place: GAGNER, renvois: { max: 0 } } } },
  { id: 'gel_du_point_d_indice', rayon: 'pupitre', nom: 'Gel du point d\'indice', description: 'Geler la boutique huit fois dans une partie.', condition: { type: 'partie', faits: { gels: { min: 8 } } } },
  { id: 'pognon_de_dingue', rayon: 'pupitre', nom: 'Pognon de dingue', description: 'Dépenser 250 de budget dans une partie.', condition: { type: 'partie', faits: { depenses: { min: 250 } } }, recompense: titre('Le Panier percé') },
  { id: 'elements_de_langage', rayon: 'pupitre', nom: 'Éléments de langage', description: 'Lancer soixante-quinze sorts dans une partie.', condition: { type: 'partie', faits: { sorts: { min: 75 } } } },
  { id: 'logorrhee', rayon: 'pupitre', nom: 'Logorrhée', description: 'Lancer cent vingt sorts dans une partie.', condition: { type: 'partie', faits: { sorts: { min: 120 } } }, recompense: titre('Le Moulin à paroles') },
  { id: 'trois_fois_rien', rayon: 'pupitre', nom: 'Trois fois rien', description: 'Six triples dans une partie.', condition: { type: 'partie', faits: { triples: { min: 6 } } } },

  // La carrière : aller au bout.
  { id: 'elu', rayon: 'carriere', nom: 'Élu', description: 'Gagner le second tour de la carrière.', condition: { type: 'chapitre', id: 'second_tour' }, recompense: titre('Président de la République') },
  { id: 'outre_tombe', rayon: 'carriere', nom: 'Au revoir', description: 'Battre Valéry Giscard d\'Estaing, d\'outre-tombe.', condition: { type: 'chapitre', id: 'outre_tombe' }, recompense: titre('Celui qui a vu Giscard') },
  { id: 'la_republique_c_est_moi', rayon: 'carriere', nom: 'La République, c\'est moi', description: 'Aller au bout de la carrière de Jean-Luc Mélenchon.', condition: { type: 'chapitre', id: 'second_tour', carriere: 'melenchon' } },
  { id: 'plafond_perce', rayon: 'carriere', nom: 'À la troisième, c\'est la bonne', description: 'Aller au bout de la carrière de Marine Le Pen.', condition: { type: 'chapitre', id: 'second_tour_2027', carriere: 'lepen' } },
  { id: 'vaisseau_de_lumiere', rayon: 'carriere', nom: 'Le grand monarque', description: 'Aller au bout de la carrière de Sylvain Durif.', condition: { type: 'chapitre', id: 'second_tour', carriere: 'durif' } },
];

export const SUCCES_BY_ID: Record<string, Succes> = Object.fromEntries(SUCCES.map((s) => [s.id, s]));
