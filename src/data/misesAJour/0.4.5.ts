import type { VersionCards } from '../misesAJour.ts';

/** Les cartes de la version 0.4.5, avant et après. Fichier généré par tools/mises_a_jour/instantane.ts. */
export const CARTES: VersionCards = {
  cards: [
    {"after":{"id":"villepin","name":"Dominique de Villepin","camp":"civile","tier":5,"atk":5,"hp":8,"keywords":[],"effects":[{"when":"debut_combat","to":"voisins","do":"mot_cle","keyword":"polemique"}]}},
  ],
  casseroles: [
    {"after":{"id":"toute_cette_energie","kind":"ridicule","name":"Où trouve-t-il toute cette énergie ?","owner":"bardella","cost":3,"ownerBonus":{"atk":2,"hp":2},"atk":2,"hp":2,"keywords":["cumul"],"silence":true,"pollsPerRound":2}},
    {"after":{"id":"trois_tweets","kind":"ridicule","name":"Trois tweets","owner":"riner","cost":2,"ownerBonus":{"atk":3,"hp":3},"atk":3,"hp":3,"splash":2}},
    {"after":{"id":"faire_chier_le_maire","kind":"ridicule","name":"Juste pour faire chier le maire","owner":"riner","cost":2,"ownerBonus":{"hp":6},"hp":6,"keywords":["porte_parole"],"silence":true,"pollsPerRound":2}},
    {"after":{"id":"jai_fini","kind":"ridicule","name":"J'ai fini","owner":"riner","cost":2,"ownerBonus":{"atk":2,"hp":2},"atk":2,"hp":2,"keywords":["immunite"],"noAttack":true}},
    {"after":{"id":"cpe","kind":"ridicule","name":"Le CPE","owner":"villepin","cost":2,"ownerBonus":{"atk":6,"hp":6},"atk":6,"hp":6,"noAttack":true,"pollsPerRound":2}},
    {"after":{"id":"statuettes_napoleon","kind":"affaire","name":"Les statuettes de Napoléon","owner":"villepin","cost":2,"ownerBonus":{"atk":8,"hp":4},"atk":8,"hp":4,"budgetPerRound":-2}},
    {"after":{"id":"croc_de_boucher","kind":"affaire","name":"Le croc de boucher","owner":"villepin","cost":2,"ownerBonus":{"atk":2,"hp":2},"atk":2,"hp":2,"keywords":["immunite"],"hpLossOnDeath":3}},
    {"after":{"id":"jamais_elu","kind":"ridicule","name":"Jamais élu","owner":"villepin","cost":2,"ownerBonus":{"aloneBonus":4},"aloneBonus":4,"pollsPerRound":2}},
  ],
  spells: [

  ],
};
