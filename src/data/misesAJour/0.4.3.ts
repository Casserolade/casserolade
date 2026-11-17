import type { VersionCards } from '../misesAJour.ts';

/** Les cartes de la version 0.4.3, avant et après. Fichier généré par tools/mises_a_jour/instantane.ts. */
export const CARTES: VersionCards = {
  cards: [
    {"after":{"id":"polony","name":"Natacha Polony","camp":"civile","tier":4,"atk":4,"hp":6,"keywords":[],"effects":[{"when":"fin_tour","to":"soi","do":"buff_par_camp","atk":1,"hp":1}]}},
  ],
  casseroles: [
    {"after":{"id":"cavale_de_dakar","kind":"affaire","name":"La cavale de Dakar","owner":"branco","cost":2,"ownerBonus":{"atk":4,"hp":4},"atk":4,"hp":4,"noAttack":true}},
    {"after":{"id":"robe_en_chocolat","kind":"ridicule","name":"La robe en chocolat","owner":"polony","cost":2,"ownerBonus":{"atk":2,"hp":2},"atk":3,"hp":3,"splash":2}},
    {"after":{"id":"salauds_face_a_salauds","kind":"affaire","name":"Des salauds face à d'autres salauds","owner":"polony","cost":2,"ownerBonus":{"atk":6,"hp":6},"atk":6,"hp":6,"silence":true,"pollsPerRound":2}},
  ],
  spells: [

  ],
};
