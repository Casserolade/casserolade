/**
 * Ce que disent les bots. Tout ici est inventé, c'est de la parodie. L'écran ne porte aucune mention :
 * c'est une décision du jeu. Les vraies citations sont dans casseroles.ts, avec leur source.
 * Chaque réplique s'appuie sur un fait de casseroles.ts ou sur un trait public, sans accusation nouvelle
 * et en respectant les statuts judiciaires. Dernière relecture : 2 novembre 2026.
 */
export type EvenementReplique = 'debut' | 'victoire' | 'defaite' | 'elimine';

export const REPLIQUES: Record<string, Record<EvenementReplique, string>> = {
  lepen: {
    debut: 'Une seconde, je cherche la bonne fiche.',
    victoire: 'Je l\'avais dit. C\'est écrit là, quelque part dans mes fiches.',
    defaite: 'Alstom ? Non, attendez, SFR.',
    elimine: 'Je me pourvois en cassation.',
  },
  philippe: {
    debut: 'Je vous demande deux heures de plus.',
    victoire: 'Sans excès, mais c\'est fait.',
    defaite: 'Nous verrons cela au Havre.',
    elimine: 'Je suis patient. Vraiment très patient.',
  },
  attal: {
    debut: 'Je suis le plus jeune à m\'asseoir à cette table.',
    victoire: 'Le plus jeune vainqueur de l\'histoire de ce plateau.',
    defaite: 'Un choc. Des savoirs.',
    elimine: 'Le plus jeune éliminé de l\'histoire de ce plateau.',
  },
  zemmour: {
    debut: 'Poussez-vous, j\'arrive.',
    victoire: 'Ça rigole plus, hein ?',
    defaite: 'Vous me parlez d\'une France qui n\'existe plus.',
    elimine: 'Reculez ! Ah non, c\'est moi qui recule.',
  },
  tondelier: {
    debut: 'Première République écologique, deuxième essai.',
    victoire: 'Ça pousse !',
    defaite: 'Une veste. Verte, mais une veste.',
    elimine: 'Je rentre à Hénin-Beaumont. C\'est compostable.',
  },
  melenchon: {
    debut: 'Il est venu le temps des politiques.',
    victoire: 'Le plateau, c\'est moi ! Mon plateau est sacré !',
    defaite: 'Qu\'esseuh-que ça veut direuh ?',
    elimine: 'Je vous laisse mon hologramme.',
  },
  sarkozy: {
    debut: 'Je vais vous dire une chose, moi.',
    victoire: 'Casse-toi, pauv\' plateau.',
    defaite: 'Je ferai appel.',
    elimine: 'Ça fera un livre.',
  },
  macron: {
    debut: 'Je traverse le plateau et je vous en trouve un.',
    victoire: 'En même temps, c\'était prévu.',
    defaite: 'J\'ai bien entendu le message. Je dissous.',
    elimine: 'Je reste jusqu\'au bout du mandat.',
  },
  hollande: {
    debut: 'Mon véritable adversaire n\'a pas de nom. Il a un plateau.',
    victoire: 'Ça va mieux.',
    defaite: 'La courbe va s\'inverser.',
    elimine: 'Je reviendrai. C\'est mon pouvoir.',
  },
  retailleau: {
    debut: 'L\'ordre d\'abord. Le reste ensuite.',
    victoire: 'L\'ordre règne.',
    defaite: 'C\'est le laxisme.',
    elimine: 'Je rentre en Vendée.',
  },
  glucksmann: {
    debut: 'Une petite taxe, et on en parle.',
    victoire: 'On va pas rentrer dedans.',
    defaite: 'Deux de budget en plus. C\'est la taxe Zucman.',
    elimine: 'Je repars à Bruxelles.',
  },
  bardella: {
    debut: 'Je suis le dauphin. On m\'a dit de venir.',
    victoire: 'TikTok appréciera.',
    defaite: 'Je démens, et je porte plainte.',
    elimine: 'La relève attendra.',
  },
  lassalle: {
    debut: 'Je suis venu à pied.',
    victoire: 'Se canto !',
    defaite: 'Je repars à pied.',
    elimine: 'Je rentre à pied. Ne m\'attendez pas pour dîner.',
  },
  balkany: {
    debut: 'Levallois, c\'est par où ?',
    victoire: 'Encaissé. Déclaré, je ne sais plus.',
    defaite: 'Je revends tout.',
    elimine: 'Je demande un aménagement de peine.',
  },
  roussel: {
    debut: 'Un bon vin, une bonne viande, un bon fromage. On peut commencer.',
    victoire: 'Les jours heureux sont revenus.',
    defaite: 'Même pas un bon fromage pour se consoler.',
    elimine: 'Je retourne à la gastronomie française.',
  },
  ruffin: {
    debut: 'Debout ! On y va.',
    victoire: 'Merci patron !',
    defaite: 'Je vais en faire un film.',
    elimine: 'Je repars avec la caméra.',
  },
  bertrand: {
    debut: 'Je suis candidat. Je l\'étais déjà, d\'ailleurs.',
    victoire: 'Les Hauts-de-France applaudissent.',
    defaite: 'Je serai candidat la prochaine fois.',
    elimine: 'Rendez-vous dans cinq ans.',
  },
  lisnard: {
    debut: 'Libérons les énergies. Les miennes d\'abord.',
    victoire: 'Palme d\'or, à Cannes comme ici.',
    defaite: 'C\'est encore la faute de l\'État.',
    elimine: 'Je rentre à Cannes. Il y a pire.',
  },
  dupont_aignan: {
    debut: 'Debout ! Enfin, debout la France.',
    victoire: 'Les sondages me sous-estiment toujours.',
    defaite: 'Encore les parrainages.',
    elimine: 'Je reviendrai. Je reviens toujours.',
  },
  philippot: {
    debut: 'Frexit ! Ah, on joue d\'abord ?',
    victoire: 'Encore une victoire contre Bruxelles.',
    defaite: 'Bruxelles l\'a voulu.',
    elimine: 'Je manifeste samedi.',
  },
  arthaud: {
    debut: 'Travailleuses, travailleurs !',
    victoire: 'Une manche pour le camp des travailleurs.',
    defaite: 'Le capitalisme a gagné une manche. Pas la guerre.',
    elimine: 'Je retourne en classe.',
  },
  asselineau: {
    debut: 'Je vais vous expliquer. Il y en a pour trois heures.',
    victoire: 'Tout était dans l\'article 50.',
    defaite: 'Les médias ne m\'invitent jamais.',
    elimine: 'C\'est écrit dans les traités.',
  },
  cazeneuve: {
    debut: 'Gardons notre calme. Toujours.',
    victoire: 'C\'est l\'État qui a gagné.',
    defaite: 'Je regrette, sobrement.',
    elimine: 'Je retourne au barreau.',
  },
  bouamrane: {
    debut: 'Saint-Ouen vous salue.',
    victoire: 'Médaille d\'or pour Saint-Ouen.',
    defaite: 'Même pas besoin de primaire pour perdre.',
    elimine: 'Je retourne à la mairie.',
  },
  batho: {
    debut: 'Moins, mais mieux.',
    victoire: 'La décroissance, ça marche.',
    defaite: 'On m\'a déjà renvoyée du gouvernement pour moins que ça.',
    elimine: 'Je décrois.',
  },
  kazib: {
    debut: 'Grève générale, tout de suite.',
    victoire: 'Le rail a gagné.',
    defaite: 'Retard sur la ligne, comme d\'habitude.',
    elimine: 'Je retourne au dépôt.',
  },
  durif: {
    debut: 'Je suis le Christ cosmique, et je recrute.',
    victoire: 'Le cosmos l\'avait prédit.',
    defaite: 'Ce n\'est qu\'une réincarnation de plus.',
    elimine: 'Je remonte au ciel.',
  },
  lalanne: {
    debut: 'On se retrouvera. Dans la boutique.',
    victoire: 'Ça fera une chanson.',
    defaite: 'J\'écris une chanson là-dessus.',
    elimine: 'On se retrouvera.',
  },
  giscard: {
    debut: 'Je vous avais dit au revoir. Pas adieu.',
    victoire: 'Vous n\'avez pas le monopole du caveau.',
    defaite: 'L\'accordéon a un peu pris l\'humidité.',
    elimine: 'Au revoir ! La chaise reste vide. Vous avez l\'habitude.',
  },
};

export function repliqueDe(heroId: string, evenement: EvenementReplique): string | null {
  return REPLIQUES[heroId]?.[evenement] ?? null;
}
