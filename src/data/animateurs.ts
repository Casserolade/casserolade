/**
 * Les animateurs qui tiennent la boutique : un vrai animateur par plateau (décision du
 * 3 novembre 2026). Ceux qui n'ont pas de plateau ne parlent que dans le mode histoire.
 * Les « répliques » sont des inventions de parodie, jamais présentées comme des citations.
 * Les « faits » sont vérifiés et datés. Dernière vérification : 3 novembre 2026.
 */
export interface Animateur {
  id: string;
  nom: string;
  /** Absent : il ne tient aucun plateau, et ne parle que dans le mode histoire. */
  plateau?: string;
  /** Vrai pour une personne réelle. */
  reel: boolean;
  faits: string[];
  repliques: { achat: string; actualiser: string; coup: string };
}

export const ANIMATEURS: Animateur[] = [
  {
    id: 'lepers', nom: 'Julien Lepers', plateau: 'france3', reel: true,
    faits: [
      'Présente Questions pour un champion sur France 3 de 1988 à 2016. Écarté par la chaîne, il anime sa dernière émission le 20 février 2016.',
      'Décembre 2025 : accuse son successeur Samuel Étienne d\'être responsable de la déprogrammation de l\'émission.',
    ],
    repliques: { achat: 'Top ! Je suis un politique, on vient de m\'acheter, je suis… ?', actualiser: 'On change de thème : la foire aux bestiaux !', coup: 'Quatre à la suite ! Ah non, il est tombé.' },
  },
  {
    id: 'hanouna', nom: 'Cyril Hanouna', plateau: 'hanouna', reel: true,
    faits: [
      'C8 est la chaîne la plus sanctionnée de l\'audiovisuel français, avec plus de 7,5 millions d\'euros d\'amendes.',
      'Amende record de 3,5 millions d\'euros après ses insultes à Louis Boyard, validée par le Conseil d\'État.',
      'Condamné en appel à verser 2 000 € à Boyard, mars 2026.',
    ],
    repliques: { achat: 'C\'est CHAUD, ça, les amis !', actualiser: 'On change tout, ça dure pas, c\'est la télé !', coup: 'Là, je vais prendre une amende.' },
  },
  {
    id: 'praud', nom: 'Pascal Praud', plateau: 'cnews', reel: true,
    faits: [
      'Septembre 2023 : parallèle entre punaises de lit et immigration dans L\'Heure des pros. L\'Arcom rappelle CNews à l\'ordre en mars 2024.',
      'Juillet 2024 : CNews sanctionnée de 20 000 € pour propos climatosceptiques sans contradiction.',
    ],
    repliques: { achat: 'Moi, je ne fais que poser la question.', actualiser: 'On a le droit de regarder, quand même ?', coup: 'Je vous laisse conclure.' },
  },
  {
    id: 'braun_pivet', nom: 'Yaël Braun-Pivet', plateau: 'lcp', reel: true,
    faits: [
      'Juin 2022 : première femme élue présidente de l\'Assemblée nationale.',
      '18 juillet 2024 : réélue au troisième tour, avec 220 voix contre 207 à André Chassaigne.',
    ],
    repliques: { achat: 'Mes chers collègues, un peu de silence : il achète.', actualiser: 'La séance est suspendue. Elle reprend tout de suite.', coup: 'Je vais devoir sortir la cloche.' },
  },
  {
    id: 'larcher', nom: 'Gérard Larcher', plateau: 'public_senat', reel: true,
    faits: [
      'Président du Sénat de 2008 à 2011, puis sans interruption depuis 2014.',
      '2 octobre 2023 : réélu président du Sénat pour la cinquième fois, avec 218 voix sur 321.',
    ],
    repliques: { achat: 'Au Sénat, on prend le temps. Voilà : c\'est acheté.', actualiser: 'Nous examinerons cela en deuxième lecture.', coup: 'C\'est d\'une grande violence, pour une chambre de réflexion.' },
  },
  {
    id: 'pujadas', nom: 'David Pujadas', plateau: 'lci', reel: true,
    faits: [
      '3 février 2004 : ouvre le 20 heures de France 2 sur le retrait de la vie politique d\'Alain Juppé, qui annonce le contraire au même moment sur TF1. Il est écarté de l\'antenne deux semaines.',
      'Présente le 20 heures de France 2 de 2001 à 2017, puis 24 h Pujadas sur LCI.',
    ],
    repliques: { achat: 'Une information exclusive : il a acheté. Sous réserve de confirmation.', actualiser: 'Nous apprenons à l\'instant que tout change.', coup: 'Le général va nous montrer ça sur la carte.' },
  },
  {
    id: 'fogiel', nom: 'Marc-Olivier Fogiel', plateau: 'bfm', reel: true,
    faits: ['Directeur général de BFMTV de juillet 2019 à juillet 2024.'],
    repliques: { achat: 'ALERTE INFO : il a acheté. On en parle jusqu\'à demain.', actualiser: 'On reste en édition spéciale.', coup: 'Les images sont dures. On les repasse en boucle.' },
  },
  {
    id: 'lescure', nom: 'Pierre Lescure', plateau: 'c_a_vous', reel: true,
    faits: [
      'Cofonde Canal+ en 1984 avec André Rousselet. Écarté en 2002 par Jean-Marie Messier.',
      'À la table de C à vous depuis la rentrée 2014.',
    ],
    repliques: { achat: 'Un achat qu\'on aurait fait à Canal, en 84.', actualiser: 'On débarrasse et on ressert.', coup: 'À Cannes, j\'ai vu pire. Pas souvent.' },
  },
  {
    id: 'barbier', nom: 'Christophe Barbier', plateau: 'grand_oral', reel: true,
    faits: [
      'Éditorialiste de BFMTV de 2016 à juillet 2025, puis de LCI, toujours avec son écharpe rouge.',
      '2020 : s\'excuse sur BFMTV après ses propos sur « deux dames en surpoids ».',
    ],
    repliques: { achat: 'Mon édito : un achat audacieux, et je l\'avais prévu.', actualiser: 'Je change d\'avis, pas d\'écharpe.', coup: 'Le peuple a parlé. Je vais lui expliquer ce qu\'il a voulu dire.' },
  },
  {
    id: 'salame', nom: 'Léa Salamé', plateau: 'france2_prime', reel: true,
    faits: [
      'Présente le 20 heures de France 2 à partir de septembre 2025, à la place d\'Anne-Sophie Lapix.',
      'Août 2026 : se retire du 20 heures le temps de la candidature de son compagnon, Raphaël Glucksmann, à la présidentielle.',
      '2019 : déjà en retrait de France Inter et de L\'Émission politique pendant la campagne européenne de Raphaël Glucksmann.',
    ],
    repliques: { achat: 'Je vous arrête tout de suite : c\'est acheté.', actualiser: 'Je dois me mettre en retrait de cette boutique.', coup: 'Je ne peux pas commenter : je connais un candidat.' },
  },
  {
    id: 'lapix', nom: 'Anne-Sophie Lapix', plateau: 'france2_dimanche', reel: true,
    faits: [
      'Présente le 20 heures de France 2 de 2017 à juin 2025.',
      'Juillet 2025, sur son éviction : « Le choix de quitter le 20 heures n\'a pas été le mien. »',
    ],
    repliques: { achat: 'Vous êtes candidat ? Oui ou non ?', actualiser: 'On passe au sujet suivant. Je ne l\'ai pas choisi.', coup: 'Le choix de perdre n\'a pas été le vôtre.' },
  },
  {
    id: 'local', nom: 'Le présentateur du soir', reel: false, faits: [],
    repliques: { achat: 'Belle prise pour le canton.', actualiser: 'On va voir ce qu\'il reste au marché.', coup: 'Une image forte, ici, à deux pas de la salle des fêtes.' },
  },
  {
    id: 'generique_info', nom: 'Le bandeau', reel: false, faits: [],
    repliques: { achat: 'ALERTE INFO : il a acheté.', actualiser: 'De nouvelles images nous parviennent.', coup: 'On retrouve notre envoyé spécial devant le trottoir.' },
  },
  {
    id: 'barthes', nom: 'Yann Barthès', plateau: 'quotidien', reel: true,
    faits: ['Juin 2026 : sa blague sur la canicule et les habitants sous les toits fait polémique. Il persiste et défend « le droit aux vannes, même ratées ».'],
    repliques: { achat: 'On a retrouvé une vidéo de lui en 2014.', actualiser: 'Regardez bien derrière lui.', coup: 'On va repasser la séquence au ralenti.' },
  },
  {
    id: 'duhamel', nom: 'Benjamin Duhamel', reel: true,
    faits: ['Présente depuis la rentrée 2026 le rendez-vous politique du dimanche sur France 2 et France Inter.'],
    repliques: { achat: 'Oui ou non ? Répondez : oui ou non ?', actualiser: 'Vous ne répondez pas à ma question.', coup: 'Une dernière question, en dix secondes.' },
  },
  {
    id: 'ppda', nom: 'Patrick Poivre d\'Arvor', plateau: 'tf1_20h', reel: true,
    faits: [
      '16 décembre 1991 : la fausse interview de Fidel Castro au 20 heures de TF1, montée à partir d\'une conférence de presse.',
      'Accusé en 2011 de plagiat pour sa biographie d\'Hemingway.',
    ],
    repliques: { achat: 'Une exclusivité : il m\'a tout dit, depuis une conférence de presse.', actualiser: 'Nos équipes ont tout filmé hier, à Cuba.', coup: 'Le montage a été fait un peu vite.' },
  },
  {
    id: 'bouleau', nom: 'Gilles Bouleau', plateau: 'tf1_second_tour', reel: true,
    faits: ['A animé le débat d\'entre-deux-tours de 2022, avec Léa Salamé.'],
    repliques: { achat: 'Le temps de parole est parfaitement équilibré.', actualiser: 'Nous allons passer au thème suivant.', coup: 'Madame, Monsieur, un peu de tenue.' },
  },
];

/** Chaque plateau a son animateur ; un plateau inconnu est tenu par le bandeau d'info. */
export function animateurFor(plateauId: string): Animateur {
  return ANIMATEURS.find((a) => a.plateau === plateauId) ?? ANIMATEURS.find((a) => a.id === 'generique_info') as Animateur;
}
