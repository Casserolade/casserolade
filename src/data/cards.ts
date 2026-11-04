import type { Camp, Card, Counter, Effect, Keyword, ShopPick, Target, Trigger } from '../engine/types.ts';

/**
 * Les cartes, deuxième version (docs/gameplay/cartes.md). Une carte est une ligne de données :
 * stats, mots-clés, et des effets « déclencheur × cible × action × valeur ».
 * Aucune carte ne donne de bonus passif aux voisins du même camp : les camps se parlent par leurs textes.
 */

type Extra = { kw?: Keyword[]; fx?: Effect[]; golden?: boolean };

function card(id: string, name: string, camp: Camp, tier: number, atk: number, hp: number, extra: Extra = {}): Card {
  return { id, name, camp, tier, atk, hp, keywords: extra.kw, effects: extra.fx, ...(extra.golden ? { golden: true } : {}) };
}

type Rest = Partial<Pick<Effect, 'camp' | 'card' | 'n' | 'perma' | 'once'>>;

/** Un effet : quand, sur qui, quoi, et ses précisions. */
function fx(when: Trigger, to: Target, action: Record<string, unknown> & { do: string }, rest: Rest = {}): Effect {
  return { when, to, ...action, ...rest } as Effect;
}

const buff = (atk: number, hp: number) => ({ do: 'buff', atk, hp });
const motCle = (keyword: Keyword) => ({ do: 'mot_cle', keyword });
const carte = (cardId: string, count = 1) => ({ do: 'carte', card: cardId, count });
const invoque = (token: string, count = 1) => ({ do: 'invoquer', token, count });
const debauche = (pick: ShopPick) => ({ do: 'debaucher', pick });
const campBuff = (atk: number, hp: number) => ({ do: 'camp_buff', atk, hp });
const boutique = (atk: number, hp: number) => ({ do: 'boutique_buff', atk, hp });
const compteur = (c: Counter, atk: number, hp: number) => ({ do: 'compteur', compteur: c, atk, hp });
const tract = { do: 'jouer_tract' };

export const TOKENS: Record<string, Card> = {
  suppleant: { id: 'suppleant', name: 'Suppléant', camp: 'civile', tier: 1, atk: 1, hp: 1, token: true },
  electeur_fantome: { id: 'electeur_fantome', name: 'Électeur fantôme', camp: 'civile', tier: 1, atk: 1, hp: 1, token: true },
  hologramme: { id: 'hologramme', name: 'Hologramme', camp: 'civile', tier: 1, atk: 3, hp: 1, token: true },
  chaise_vide: { id: 'chaise_vide', name: 'Chaise vide', camp: 'civile', tier: 1, atk: 0, hp: 8, token: true, keywords: ['porte_parole'], feminin: true },
  assistant_fictif: {
    id: 'assistant_fictif',
    name: 'Assistant fictif',
    camp: 'civile',
    tier: 1,
    atk: 0,
    hp: 1,
    token: true,
    noAttack: true,
    effects: [fx('vente', 'joueur', { do: 'budget', value: 1 })],
  },
};

/** L'échelon suit la notoriété : les inconnus d'abord, les poids lourds à la fin. */
export const CARDS: Card[] = [
  // Insoumis : la rue. Les Tracts, sorts gratuits qu'on améliore pour la partie.
  card('boyard', 'Louis Boyard', 'insoumis', 1, 3, 2, { kw: ['vedette'], fx: [fx('celebration', 'joueur', carte('tract'))] }),
  card('leaument', 'Antoine Léaument', 'insoumis', 1, 2, 3, { fx: [fx('vente', 'joueur', carte('tract', 2))] }),
  // L'ancien garde du corps de Mélenchon : il protège, et le drapeau reste.
  card('delogu', 'Sébastien Delogu', 'insoumis', 1, 1, 3, { kw: ['porte_parole'], fx: [fx('heritage', 'joueur', carte('tract'))] }),
  card('portes', 'Thomas Portes', 'insoumis', 2, 3, 2, { fx: [fx('fin_tour', 'aleatoire', tract)] }),
  card('trouve', 'Aurélie Trouvé', 'insoumis', 2, 2, 4, { fx: [fx('aura', 'soi', compteur('tracts', 1, 1))] }),
  // Elle a coordonné L'Avenir en commun : celle qui écrit les promesses en distribue.
  card('guette', 'Clémence Guetté', 'insoumis', 2, 2, 3, { fx: [fx('annonce', 'joueur', carte('promesse'))] }),
  // PS, LREM, EDS, EELV, LFI : il se pose sur n'importe qui.
  card('tache', 'Aurélien Taché', 'insoumis', 2, 2, 3, { kw: ['ralliement'], fx: [fx('fin_tour', 'aleatoire', tract)] }),
  card('chikirou', 'Sophia Chikirou', 'insoumis', 3, 3, 4, { fx: [fx('annonce', 'aleatoire', tract), fx('annonce', 'aleatoire', tract)] }),
  card('bompard', 'Manuel Bompard', 'insoumis', 3, 3, 5, { fx: [fx('fin_tour', 'voisins', tract)] }),
  // Un insoumis préside la commission des Finances.
  card('coquerel', 'Éric Coquerel', 'insoumis', 3, 3, 4, { fx: [fx('annonce', 'joueur', carte('loi_de_finances'))] }),
  card('panot', 'Mathilde Panot', 'insoumis', 4, 4, 5, { fx: [fx('annonce', 'joueur', { do: 'tract_bonus', atk: 1, hp: 1 })] }),
  card('ruffin', 'François Ruffin', 'insoumis', 4, 5, 5, { fx: [fx('annonce', 'joueur', carte('tract', 2)), fx('droit_de_reponse', 'joueur', carte('tract', 2))] }),
  // Les faux billets de 500 € offerts à Juncker : tout le monde en reçoit.
  card('aubry', 'Manon Aubry', 'insoumis', 4, 4, 5, { fx: [fx('annonce', 'autres', tract)] }),
  card('melenchon', 'Jean-Luc Mélenchon', 'insoumis', 5, 6, 6, { kw: ['vedette'], fx: [fx('fin_tour', 'camp', tract, { camp: 'insoumis' })] }),

  // Socialistes : le retour. La mort comme ressource, et les Suppléants.
  card('thevenoud', 'Thomas Thévenoud', 'socialistes', 1, 2, 1, { kw: ['retour'] }),
  card('bouamrane', 'Karim Bouamrane', 'socialistes', 1, 2, 2, { fx: [fx('heritage', 'soi', invoque('suppleant'))] }),
  card('guedj', 'Jérôme Guedj', 'socialistes', 2, 3, 2, {
    kw: ['retour'],
    fx: [fx('fin_tour', 'soi', buff(1, 1))],
  }),
  card('vallaud', 'Boris Vallaud', 'socialistes', 2, 2, 4, { fx: [fx('revanche', 'joueur', campBuff(1, 0), { n: 3, camp: 'socialistes' })] }),
  card('cahuzac', 'Jérôme Cahuzac', 'socialistes', 2, 3, 2, { fx: [fx('vente', 'joueur', { do: 'budget', value: 2, plus_tard: true })] }),
  card('hidalgo', 'Anne Hidalgo', 'socialistes', 3, 3, 4, { fx: [fx('annonce', 'cible', { do: 'sacrifier', echelon: 0 })] }),
  card('valls', 'Manuel Valls', 'socialistes', 3, 4, 3, { kw: ['retour'], fx: [fx('annonce', 'cible', motCle('retour'))] }),
  card('faure', 'Olivier Faure', 'socialistes', 3, 2, 4, { fx: [fx('revanche', 'joueur', campBuff(1, 1), { n: 1, card: 'suppleant' })] }),
  card('cazeneuve', 'Bernard Cazeneuve', 'socialistes', 3, 2, 6, { kw: ['porte_parole'], fx: [fx('heritage', 'soi', invoque('suppleant', 2))] }),
  card('royal', 'Ségolène Royal', 'socialistes', 4, 4, 5, {
    kw: ['vedette'],
    fx: [fx('celebration', 'allie_suivant', motCle('retour')), fx('celebration', 'allie_suivant', buff(2, 2))],
  }),
  card('glucksmann', 'Raphaël Glucksmann', 'socialistes', 4, 4, 6, { fx: [fx('meeting', 'premier_allie', { do: 'declencher', trigger: 'heritage' }, { once: 'combat' })] }),
  card('hollande', 'François Hollande', 'socialistes', 5, 5, 6, { kw: ['retour'], fx: [fx('heritage', 'joueur', campBuff(1, 1), { camp: 'socialistes' })] }),

  // Écologistes : la pousse. La Fin de tour, et la boutique qu'on fait grandir.
  card('doucet', 'Grégory Doucet', 'ecologistes', 1, 1, 3, { fx: [fx('fin_tour', 'soi', buff(1, 1))] }),
  card('lucas', 'Benjamin Lucas-Lundy', 'ecologistes', 1, 2, 2, { fx: [fx('vente', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('batho', 'Delphine Batho', 'ecologistes', 2, 2, 3, { fx: [fx('fin_tour', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('hurmic', 'Pierre Hurmic', 'ecologistes', 2, 2, 4, { fx: [fx('joue', 'soi', buff(1, 1), { camp: 'ecologistes' })] }),
  card('mamere', 'Noël Mamère', 'ecologistes', 2, 2, 3, { fx: [fx('aura', 'soi', compteur('ecologistes_joues', 1, 1))] }),
  card('piolle', 'Éric Piolle', 'ecologistes', 3, 3, 4, { fx: [fx('fin_tour', 'voisins', buff(1, 1))] }),
  card('duflot', 'Cécile Duflot', 'ecologistes', 3, 3, 5, { fx: [fx('joue', 'joue', buff(1, 2), { camp: 'ecologistes' })] }),
  card('cohn_bendit', 'Daniel Cohn-Bendit', 'ecologistes', 3, 4, 4, { fx: [fx('fin_tour', 'aleatoire', buff(2, 2))] }),
  card('jadot', 'Yannick Jadot', 'ecologistes', 4, 4, 6, { fx: [fx('fin_tour', 'voisins', { do: 'declencher', trigger: 'fin_tour' })] }),
  card('rousseau', 'Sandrine Rousseau', 'ecologistes', 4, 5, 5, {
    kw: ['vedette'],
    fx: [fx('fin_tour', 'autres_camp', buff(1, 1), { camp: 'ecologistes' }), fx('celebration', 'joueur', campBuff(1, 1), { camp: 'ecologistes' })],
  }),
  card('tondelier', 'Marine Tondelier', 'ecologistes', 5, 6, 7, {
    fx: [fx('fin_tour', 'joueur', campBuff(1, 1), { camp: 'ecologistes' }), fx('fin_tour', 'joueur', boutique(1, 1), { camp: 'ecologistes' })],
  }),

  // Macronie : le marché. Le budget, le doré, et le Ralliement. Thevenot et Bregeon sont hors réserve.
  card('ndiaye', 'Sibeth Ndiaye', 'macronie', 1, 2, 3, { kw: ['porte_parole'], fx: [fx('droit_de_reponse', 'joueur', { do: 'budget', value: 1, plus_tard: true })] }),
  card('maillard', 'Sylvain Maillard', 'macronie', 2, 3, 3, { kw: ['ni_droite_ni_gauche'], fx: [fx('rallie', 'joue', buff(2, 1))] }),
  card('oudea', 'Amélie Oudéa-Castéra', 'macronie', 2, 2, 3, { golden: true, fx: [fx('fin_tour', 'dores', buff(1, 0))] }),
  card('rugy', 'François de Rugy', 'macronie', 2, 2, 3, { fx: [fx('depense', 'soi', buff(1, 1), { n: 5 })] }),
  card('schiappa', 'Marlène Schiappa', 'macronie', 2, 3, 3, {
    kw: ['ni_droite_ni_gauche', 'vedette'],
    fx: [fx('sort', 'soi', buff(1, 1)), fx('celebration', 'joueur', carte('sort_aleatoire'))],
  }),
  card('castaner', 'Christophe Castaner', 'macronie', 3, 1, 2, { kw: ['ralliement', 'cumul'] }),
  card('berge', 'Aurore Bergé', 'macronie', 3, 2, 3, { kw: ['ralliement'], fx: [fx('heritage', 'soi', invoque('suppleant'))] }),
  card('dupond_moretti', 'Éric Dupond-Moretti', 'macronie', 3, 3, 3, { kw: ['ralliement', 'immunite'] }),
  card('lemaire', 'Bruno Le Maire', 'macronie', 3, 2, 4, { kw: ['ralliement'], fx: [fx('debut_tour', 'joueur', { do: 'budget', value: 1 })] }),
  card('darmanin', 'Gérald Darmanin', 'macronie', 4, 4, 6, { kw: ['ralliement', 'porte_parole'] }),
  card('philippe', 'Édouard Philippe', 'macronie', 4, 5, 6, { fx: [fx('annonce', 'cible', { do: 'dorer', maxTier: 3 })] }),
  card('lecornu', 'Sébastien Lecornu', 'macronie', 4, 3, 4, { kw: ['ralliement', 'retour'] }),
  card('bayrou', 'François Bayrou', 'macronie', 4, 4, 6, { kw: ['ni_droite_ni_gauche'], fx: [fx('fin_tour', 'allies', { do: 'buff_par_ralliement', atk: 1, hp: 1 })] }),
  card('attal', 'Gabriel Attal', 'macronie', 4, 5, 5, { fx: [fx('aura', 'soi', compteur('dores_joues', 2, 2))] }),
  card('macron', 'Emmanuel Macron', 'macronie', 5, 6, 6, {
    kw: ['ni_droite_ni_gauche', 'vedette'],
    fx: [fx('fin_tour', 'dores', buff(2, 2)), fx('celebration', 'joueur', { do: 'budget', value: 2, plus_tard: true })],
  }),

  // Républicains : l'Immunité en combat, les affaires hors combat.
  card('gueant', 'Claude Guéant', 'republicains', 1, 2, 1, { kw: ['immunite'] }),
  card('tiberi', 'Jean Tiberi', 'republicains', 1, 1, 3, { fx: [fx('annonce', 'soi', invoque('electeur_fantome'))] }),
  card('balkany', 'Patrick Balkany', 'republicains', 2, 3, 3, { kw: ['immunite'], fx: [fx('aura', 'soi', compteur('casseroles', 1, 1))] }),
  card('hortefeux', 'Brice Hortefeux', 'republicains', 2, 3, 3, { fx: [fx('immunite_perdue', 'soi', buff(1, 1), { perma: true })] }),
  card('cope', 'Jean-François Copé', 'republicains', 2, 2, 4, { kw: ['porte_parole'], fx: [fx('heritage', 'premier_allie', motCle('immunite'))] }),
  card('morano', 'Nadine Morano', 'republicains', 2, 3, 3, { kw: ['vedette'], fx: [fx('celebration', 'aleatoire', motCle('immunite'))] }),
  card('lisnard', 'David Lisnard', 'republicains', 3, 3, 4, { kw: ['immunite'], fx: [fx('fin_tour', 'allie_suivant', motCle('immunite'))] }),
  card('wauquiez', 'Laurent Wauquiez', 'republicains', 3, 3, 7, {
    kw: ['porte_parole'],
    fx: [fx('riposte', 'soi', buff(1, 1)), fx('droit_de_reponse', 'joueur', campBuff(1, 0), { camp: 'republicains' })],
  }),
  card('bertrand', 'Xavier Bertrand', 'republicains', 3, 3, 5, { fx: [fx('annonce', 'cible', motCle('immunite'))] }),
  card('ciotti', 'Éric Ciotti', 'republicains', 3, 4, 4, { fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'serviteur', camp: 'rn', echelon: 0 })] }),
  card('retailleau', 'Bruno Retailleau', 'republicains', 4, 5, 8, { kw: ['porte_parole', 'immunite'] }),
  card('pecresse', 'Valérie Pécresse', 'republicains', 4, 5, 6, { fx: [fx('fin_tour', 'voisins', motCle('immunite'))] }),
  card('fillon', 'François Fillon', 'republicains', 4, 5, 5, {
    fx: [fx('annonce', 'soi', invoque('assistant_fictif', 2)), fx('aura', 'joueur', { do: 'scandale_plus', value: 1 })],
  }),
  card('dati', 'Rachida Dati', 'republicains', 4, 5, 5, { kw: ['immunite'], fx: [fx('meeting', 'allie_suivant', motCle('immunite'))] }),
  card('sarkozy', 'Nicolas Sarkozy', 'republicains', 5, 6, 7, { kw: ['immunite'], fx: [fx('casserole_recue', 'joueur', campBuff(2, 1), { camp: 'republicains' })] }),

  // RN : la dynastie. Le débauchage de la boutique, et l'héritage durable.
  card('odoul', 'Julien Odoul', 'rn', 1, 2, 2, { fx: [fx('heritage', 'allie_suivant', { do: 'transmettre' })] }),
  card('houssin', 'Timothée Houssin', 'rn', 1, 1, 1, { fx: [fx('annonce', 'soi', debauche('plus_fort'))] }),
  // « Que de la main-d'œuvre locale », puis des travailleurs détachés à 5 € de l'heure : il embauche le moins cher, un autre en profite.
  card('fournas', 'Grégoire de Fournas', 'rn', 1, 2, 1, { fx: [fx('annonce', 'aleatoire', debauche('plus_fort'))] }),
  card('chenu', 'Sébastien Chenu', 'rn', 2, 3, 2, { fx: [fx('annonce', 'cible', debauche('plus_fort'))] }),
  card('lavalette', 'Laure Lavalette', 'rn', 2, 2, 3, { fx: [fx('annonce', 'soi', debauche('plus_fort'))] }),
  // Partie avec Mégret en 1998, revenue au FN en 2016 : la dynastie transmet deux fois.
  card('mc_lepen', 'Marie-Caroline Le Pen', 'rn', 2, 2, 2, { kw: ['retour'], fx: [fx('heritage', 'allie_suivant', { do: 'transmettre' })] }),
  card('tanguy', 'Jean-Philippe Tanguy', 'rn', 3, 2, 4, { fx: [fx('aura', 'soi', compteur('debauchages', 2, 2))] }),
  card('aliot', 'Louis Aliot', 'rn', 3, 3, 5, { fx: [fx('fin_tour', 'soi', debauche('plus_faible'))] }),
  // De LR au RN, avec un détour par la Crimée : il prend chez le voisin ce qu'il y a de plus gros.
  card('mariani', 'Thierry Mariani', 'rn', 3, 2, 4, { fx: [fx('annonce', 'soi', debauche('plus_fort'))] }),
  card('marechal', 'Marion Maréchal', 'rn', 4, 5, 4, { kw: ['retour'], fx: [fx('heritage', 'allie_suivant', buff(1, 1), { perma: true })] }),
  card('bardella', 'Jordan Bardella', 'rn', 4, 4, 5, {
    kw: ['vedette'],
    fx: [fx('annonce', 'cible', debauche('plus_fort')), fx('celebration', 'main', debauche('plus_fort'))],
  }),
  card('jmlp', 'Jean-Marie Le Pen', 'rn', 4, 3, 7, { fx: [fx('heritage', 'allie_suivant', { do: 'transmettre', tout: true })] }),
  card('lepen', 'Marine Le Pen', 'rn', 5, 6, 7, { fx: [fx('debauche', 'joueur', campBuff(2, 2), { camp: 'rn' })] }),

  // Reconquête : le buzz. L'actualisation et la main ; la Polémique, une fois par combat.
  // 3 novembre 2026 : Reconquête vit de l'actualisation, qui coûte ; ses cartes la rendent gratuite ou la remboursent.
  card('bay', 'Nicolas Bay', 'reconquete', 1, 2, 2, { fx: [fx('annonce', 'joueur', { do: 'actualisations_gratuites', value: 2 })] }),
  card('dupont_aignan', 'Nicolas Dupont-Aignan', 'reconquete', 1, 2, 3, { fx: [fx('actualise', 'soi', buff(1, 1))] }),
  // Le stratège numérique de Zemmour, et la cellule WikiZédia : chaque actualisation du fil le fait monter.
  // Il réécrivait aussi chaque boutique (congrès) : Reconquête gagnait une partie sur trois, retiré le 3 novembre 2026 (docs/13).
  card('lafont', 'Samuel Lafont', 'reconquete', 1, 1, 2, { fx: [fx('actualise', 'soi', buff(2, 0))] }),
  // Maire d'Orange après son père, condamné pour un emploi de collaborateur parlementaire.
  card('yann_bompard', 'Yann Bompard', 'reconquete', 1, 2, 2, { fx: [fx('annonce', 'soi', invoque('assistant_fictif'))] }),
  card('rigault', 'Stanislas Rigault', 'reconquete', 2, 1, 1, { kw: ['polemique'] }),
  card('asselineau', 'François Asselineau', 'reconquete', 2, 3, 3, { fx: [fx('actualise', 'aleatoire', buff(1, 1), { camp: 'reconquete' })] }),
  // 1,45 % à la primaire de 2016, rallié à Zemmour en 2021 : on le renvoie, il ramène quelqu'un.
  card('poisson', 'Jean-Frédéric Poisson', 'reconquete', 2, 3, 3, { fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'serviteur', camp: 'reconquete', echelon: 0 })] }),
  card('peltier', 'Guillaume Peltier', 'reconquete', 3, 2, 3, { fx: [fx('annonce', 'cible', motCle('polemique'))] }),
  card('philippot', 'Florian Philippot', 'reconquete', 3, 2, 5, { kw: ['polemique'], fx: [fx('droit_de_reponse', 'joueur', { do: 'actualisations_gratuites', value: 1 })] }),
  // Chaque buzz lance sa cagnotte.
  card('messiha', 'Jean Messiha', 'reconquete', 3, 3, 5, { fx: [fx('actualise', 'joueur', { do: 'budget', value: 1 }, { once: 'manche' })] }),
  card('knafo', 'Sarah Knafo', 'reconquete', 4, 4, 5, {
    fx: [fx('actualise', 'camp', buff(1, 1), { camp: 'reconquete' }), fx('actualise', 'toute_la_main', buff(1, 1), { camp: 'reconquete' })],
  }),
  card('villiers', 'Philippe de Villiers', 'reconquete', 4, 4, 6, {
    kw: ['vedette'],
    fx: [fx('debut_combat', 'tous_ennemis', { do: 'degats', value: 2 }), fx('celebration', 'joueur', { do: 'actualisations_gratuites', value: 2 })],
  }),
  card('zemmour', 'Éric Zemmour', 'reconquete', 5, 5, 7, { kw: ['polemique', 'vedette'], fx: [fx('tue', 'main', { do: 'butin', part: 'pv' }, { once: 'combat' })] }),

  // Société civile : sans étiquette. Les pièces qu'on ajoute à n'importe quel moteur.
  card('kazib', 'Anasse Kazib', 'civile', 1, 2, 1, { fx: [fx('annonce', 'joueur', carte('tract'))] }),
  card('cheminade', 'Jacques Cheminade', 'civile', 1, 2, 2, { fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 })] }),
  card('durif', 'Sylvain Durif', 'civile', 1, 1, 3, { fx: [fx('fin_tour', 'aleatoire', buff(1, 1))] }),
  card('lalanne', 'Francis Lalanne', 'civile', 2, 4, 3, { kw: ['vedette'], fx: [fx('celebration', 'joueur', carte('copie'))] }),
  card('arthaud', 'Nathalie Arthaud', 'civile', 2, 3, 4, { fx: [fx('annonce', 'joueur', boutique(1, 1))] }),
  card('branco', 'Juan Branco', 'civile', 2, 4, 2, {
    fx: [fx('annonce', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 }), fx('droit_de_reponse', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 })],
  }),
  card('roussel', 'Fabien Roussel', 'civile', 3, 4, 5, { fx: [fx('sort', 'allies', buff(1, 0))] }),
  card('poutou', 'Philippe Poutou', 'civile', 3, 3, 6, { fx: [fx('vente_allie', 'soi', buff(1, 1))] }),
  card('lassalle', 'Jean Lassalle', 'civile', 5, 1, 5, { fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'fin_tour' })] }),

  // Échelon 6, le Panthéon : les anciens présidents, au-dessus des partis (la doctrine de De Gaulle).
  // Société civile : tout le monde peut les viser, quel que soit son camp.
  // « Je vous ai compris » (Alger, 4 juin 1958) : chacun a cru qu'il était de son côté.
  card('de_gaulle', 'Charles de Gaulle', 'civile', 6, 7, 7, { fx: [fx('annonce', 'allies', motCle('ni_droite_ni_gauche')), fx('annonce', 'allies', buff(2, 2))] }),
  // « Au revoir » (19 mai 1981) : il se lève, et la caméra reste sur sa chaise vide. Il est revenu ensuite, longtemps.
  card('giscard', 'Valéry Giscard d\'Estaing', 'civile', 6, 5, 8, { kw: ['retour'], fx: [fx('heritage', 'soi', invoque('chaise_vide'))] }),
  // 3 novembre 2026 : sur 300 parties, une seule finissait avec lui ; son Annonce rejoue tout de suite celles du plateau.
  card('chirac', 'Jacques Chirac', 'civile', 6, 3, 6, { fx: [fx('annonce', 'autres', { do: 'declencher', trigger: 'annonce' }), fx('aura', 'joueur', { do: 'doubler', trigger: 'annonce' })] }),
  card('mitterrand', 'François Mitterrand', 'civile', 6, 2, 8, { fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'heritage' })] }),
];

export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export const PARTY_CAMPS: Camp[] = ['insoumis', 'socialistes', 'ecologistes', 'macronie', 'republicains', 'rn', 'reconquete'];
