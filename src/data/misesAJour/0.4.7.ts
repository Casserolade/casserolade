import type { VersionCards } from '../misesAJour.ts';

/** Les cartes de la version 0.4.7, avant et après. Fichier généré par tools/mises_a_jour/instantane.ts. */
export const CARTES: VersionCards = {
  cards: [
    {"before":{"id":"lemaire","name":"Bruno Le Maire","camp":"macronie","tier":3,"atk":1,"hp":3,"keywords":["ralliement"],"effects":[{"when":"debut_tour","to":"joueur","do":"budget","value":2}]},"after":{"id":"lemaire","name":"Bruno Le Maire","camp":"macronie","tier":3,"atk":1,"hp":3,"keywords":["ralliement"],"effects":[{"when":"debut_tour","to":"joueur","do":"budget","value":1}]}},
    {"before":{"id":"lisnard","name":"David Lisnard","camp":"republicains","tier":3,"atk":2,"hp":2,"keywords":["immunite"],"effects":[{"when":"fin_tour","to":"allie_suivant","do":"mot_cle","keyword":"immunite"}]},"after":{"id":"lisnard","name":"David Lisnard","camp":"republicains","tier":3,"atk":2,"hp":2,"keywords":["immunite"],"effects":[{"when":"annonce","to":"allie_suivant","do":"mot_cle","keyword":"immunite"}]}},
  ],
  casseroles: [

  ],
  spells: [

  ],
};
