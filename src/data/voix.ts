/**
 * Les vraies voix du jeu : un extrait par citation, jugé « bon » à l'écoute. Généré par
 * tools/collecte/voix_jeu.py, ne pas modifier à la main. `fichier` est la clé de
 * manifest.sons.citations. Jamais de voix synthétisée : sans extrait, la citation reste en texte.
 */
export interface Voix {
  fichier: string;
  /** La carte ou le héros qui parle. */
  personne: string;
  /** Les mots de l'extrait, tels que les sous-titres les situent. */
  phrase: string;
  /** La casserole qui raconte exactement ce que dit l'extrait. */
  casserole?: string;
}

export const VOIX: Voix[] = [
  { fichier: 'accent_toulouse', personne: 'melenchon', phrase: 'qu\'est-ce que ça veut dire', casserole: 'accent' },
  { fichier: 'amie_tchadienne', personne: 'morano', phrase: 'plus noire qu\'une arabe', casserole: 'amie_tchadienne' },
  { fichier: 'arbre_mort', personne: 'hurmic', phrase: 'arbre mort', casserole: 'arbre_mort' },
  { fichier: 'attaque_hopital', personne: 'castaner', phrase: 'attaqué un hôpital', casserole: 'salpetriere' },
  { fichier: 'blancos', personne: 'valls', phrase: 'blancos', casserole: 'blancos' },
  { fichier: 'bravitude', personne: 'royal', phrase: 'bravitude', casserole: 'bravitude' },
  { fichier: 'cest_notre_projet', personne: 'macron', phrase: 'c\'est notre projet' },
  { fichier: 'conditions_lecornu', personne: 'lecornu', phrase: 'conditions n\'étaient' },
  { fichier: 'courbe_chomage', personne: 'hollande', phrase: 'inverser la courbe' },
  { fichier: 'debat_2017_dossiers', personne: 'lepen', phrase: 'alstom', casserole: 'confusion_dossiers' },
  { fichier: 'farine_francaise', personne: 'fillon', phrase: 'la farine était française', casserole: 'farine_francaise' },
  { fichier: 'faux_billets', personne: 'darmanin', phrase: 'faux billets', casserole: 'faux_billets' },
  { fichier: 'gaulois_refractaires', personne: 'macron', phrase: 'gaulois réfractaires' },
  { fichier: 'hologrammes', personne: 'melenchon', phrase: 'le temps des hologrammes', casserole: 'hologramme' },
  { fichier: 'immunite_ouvriere', personne: 'poutou', phrase: 'immunité ouvrière', casserole: 'immunite_ouvriere' },
  { fichier: 'minable', personne: 'cohn_bendit', phrase: 'minable', casserole: 'minable' },
  { fichier: 'moi_president', personne: 'hollande', phrase: 'moi président' },
  { fichier: 'paquets_heures', personne: 'oudea', phrase: 'paquets d\'heures', casserole: 'paquets_heures' },
  { fichier: 'personne_sacree', personne: 'melenchon', phrase: 'ma personne est sacrée' },
  { fichier: 'pisse_dessus', personne: 'glucksmann', phrase: 'on leur pisse dessus', casserole: 'on_leur_pisse_dessus' },
  { fichier: 'pognon_de_dingue', personne: 'macron', phrase: 'pognon de dingue', casserole: 'pognon' },
  { fichier: 'probite_intacte', personne: 'schiappa', phrase: 'probité' },
  { fichier: 'quand_il_y_en_a_un', personne: 'hortefeux', phrase: 'quand il y en a un', casserole: 'quand_il_y_en_a_un' },
  { fichier: 'racaille', personne: 'sarkozy', phrase: 'cette bande de racailles' },
  { fichier: 'republique_cest_moi', personne: 'melenchon', phrase: 'la république c\'est moi', casserole: 'la_republique_cest_moi' },
  { fichier: 'se_canto', personne: 'lassalle', phrase: 'se canto', casserole: 'se_canto' },
  { fichier: 'siege_ciotti', personne: 'ciotti', phrase: 'je suis le président', casserole: 'siege_ciotti' },
  { fichier: 'traverse_la_rue', personne: 'macron', phrase: 'je traverse la rue', casserole: 'traverser_la_rue' },
];
