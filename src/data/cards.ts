import type { Camp, Card, Counter, Effect, Keyword, ShopPick, Target, Trigger } from '../engine/types.ts';

/**
 * Les cartes, deuxième version. Une carte est une ligne de données :
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

/**
 * L'échelon suit la notoriété : les inconnus d'abord, les poids lourds à la fin. Comme dans Battlegrounds, chaque
 * camp a deux politiques à l'échelon 1, trois ou quatre au 2, et deux à l'échelon 5 (refonte du 5 novembre 2026,
 * mesurée carte par carte : node src/sim/bilan_cartes.ts).
 */
export const CARDS: Card[] = [
  // Insoumis : la rue. Les Tracts, sorts gratuits qu'on améliore pour la partie.
  card('boyard', 'Louis Boyard', 'insoumis', 2, 4, 4, { kw: ['vedette'], fx: [fx('annonce', 'joueur', carte('tract')), fx('celebration', 'joueur', carte('tract', 2))] }),
  card('leaument', 'Antoine Léaument', 'insoumis', 1, 3, 4, { fx: [fx('vente', 'joueur', carte('tract', 2)), fx('droit_de_reponse', 'joueur', carte('tract'))] }),
  // L'ancien garde du corps de Mélenchon : il protège, et le drapeau reste.
  card('delogu', 'Sébastien Delogu', 'insoumis', 1, 2, 4, { kw: ['porte_parole', 'vedette'], fx: [fx('heritage', 'joueur', carte('tract')), fx('celebration', 'joueur', carte('tract'))] }),
  card('portes', 'Thomas Portes', 'insoumis', 2, 3, 4, { fx: [fx('fin_tour', 'aleatoire', tract)] }),
  card('trouve', 'Aurélie Trouvé', 'insoumis', 3, 1, 4, { fx: [fx('aura', 'soi', compteur('tracts', 1, 1))] }),
  // Elle a coordonné L'Avenir en commun : celle qui écrit les promesses en distribue.
  card('guette', 'Clémence Guetté', 'insoumis', 2, 4, 4, { fx: [fx('annonce', 'joueur', carte('promesse'))] }),
  // PS, LREM, EDS, EELV, LFI : il se pose sur n'importe qui.
  card('tache', 'Aurélien Taché', 'insoumis', 2, 1, 2, { kw: ['ralliement'], fx: [fx('fin_tour', 'aleatoire', tract)] }),
  card('chikirou', 'Sophia Chikirou', 'insoumis', 3, 4, 7, { fx: [fx('annonce', 'aleatoire', tract), fx('annonce', 'aleatoire', tract), fx('annonce', 'aleatoire', tract)] }),
  card('bompard', 'Manuel Bompard', 'insoumis', 4, 4, 6, { fx: [fx('fin_tour', 'voisins', tract)] }),
  // Un insoumis préside la commission des Finances.
  card('coquerel', 'Éric Coquerel', 'insoumis', 3, 4, 6, { fx: [fx('annonce', 'joueur', { do: 'budget', value: 2 })] }),
  card('panot', 'Mathilde Panot', 'insoumis', 4, 5, 6, { fx: [fx('annonce', 'joueur', { do: 'tract_bonus', atk: 1, hp: 1 })] }),
  card('ruffin', 'François Ruffin', 'insoumis', 5, 6, 7, {
    fx: [fx('annonce', 'joueur', carte('tract', 3)), fx('fin_tour', 'joueur', carte('tract', 2)), fx('droit_de_reponse', 'joueur', carte('tract', 2))],
  }),
  // Les faux billets de 500 € offerts à Juncker : tout le monde en reçoit.
  card('aubry', 'Manon Aubry', 'insoumis', 4, 6, 7, { fx: [fx('annonce', 'autres', tract)] }),
  card('melenchon', 'Jean-Luc Mélenchon', 'insoumis', 5, 6, 6, { kw: ['vedette'], fx: [fx('fin_tour', 'camp', tract, { camp: 'insoumis' })] }),

  // Socialistes : le retour. La mort comme ressource, et les Suppléants.
  card('thevenoud', 'Thomas Thévenoud', 'socialistes', 1, 2, 2, { kw: ['retour', 'vedette'], fx: [fx('celebration', 'soi', buff(1, 1))] }),
  card('bouamrane', 'Karim Bouamrane', 'socialistes', 1, 2, 2, { fx: [fx('heritage', 'soi', invoque('suppleant'))] }),
  card('guedj', 'Jérôme Guedj', 'socialistes', 2, 3, 2, {
    kw: ['retour'],
    fx: [fx('fin_tour', 'soi', buff(1, 1))],
  }),
  card('vallaud', 'Boris Vallaud', 'socialistes', 2, 1, 3, { fx: [fx('revanche', 'joueur', campBuff(1, 0), { n: 4, camp: 'socialistes' })] }),
  card('cahuzac', 'Jérôme Cahuzac', 'socialistes', 2, 4, 5, {
    kw: ['vedette'],
    fx: [fx('vente', 'joueur', { do: 'budget', value: 2, plus_tard: true }), fx('celebration', 'joueur', { do: 'budget', value: 1, plus_tard: true })],
  }),
  card('hidalgo', 'Anne Hidalgo', 'socialistes', 4, 7, 7, { fx: [fx('annonce', 'cible', { do: 'sacrifier', echelon: 0 })] }),
  card('valls', 'Manuel Valls', 'socialistes', 3, 2, 2, { kw: ['retour'], fx: [fx('annonce', 'cible', motCle('retour'))] }),
  card('faure', 'Olivier Faure', 'socialistes', 3, 5, 7, { fx: [fx('revanche', 'joueur', campBuff(2, 2), { n: 1, card: 'suppleant' }), fx('droit_de_reponse', 'soi', invoque('suppleant'))] }),
  card('cazeneuve', 'Bernard Cazeneuve', 'socialistes', 3, 3, 6, { kw: ['porte_parole'], fx: [fx('heritage', 'soi', invoque('suppleant', 2))] }),
  card('royal', 'Ségolène Royal', 'socialistes', 5, 7, 8, {
    kw: ['vedette'],
    fx: [fx('annonce', 'aleatoire', motCle('retour')), fx('annonce', 'aleatoire', motCle('retour')), fx('celebration', 'allie_suivant', buff(2, 2))],
  }),
  card('glucksmann', 'Raphaël Glucksmann', 'socialistes', 4, 7, 9, { fx: [fx('meeting', 'allies', { do: 'declencher', trigger: 'heritage' }, { once: 'combat' })] }),
  card('hollande', 'François Hollande', 'socialistes', 5, 4, 5, { fx: [fx('heritage', 'joueur', campBuff(1, 1), { camp: 'socialistes' })] }),

  // Écologistes : la pousse. La Fin de tour, et la boutique qu'on fait grandir.
  // « Le Tour de France est machiste et polluant » : le gag écologiste, en Vedette.
  card('doucet', 'Grégory Doucet', 'ecologistes', 1, 1, 3, { kw: ['vedette'], fx: [fx('fin_tour', 'soi', buff(1, 1)), fx('celebration', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('lucas', 'Benjamin Lucas-Lundy', 'ecologistes', 1, 2, 3, { fx: [fx('vente', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('batho', 'Delphine Batho', 'ecologistes', 2, 3, 3, { fx: [fx('fin_tour', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('hurmic', 'Pierre Hurmic', 'ecologistes', 2, 3, 5, { fx: [fx('joue', 'soi', buff(1, 1), { camp: 'ecologistes' })] }),
  card('mamere', 'Noël Mamère', 'ecologistes', 2, 2, 3, { fx: [fx('aura', 'soi', compteur('ecologistes_joues', 1, 1)), fx('droit_de_reponse', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('piolle', 'Éric Piolle', 'ecologistes', 3, 3, 6, { fx: [fx('fin_tour', 'voisins', buff(1, 1))] }),
  card('duflot', 'Cécile Duflot', 'ecologistes', 3, 5, 5, { fx: [fx('joue', 'joue', buff(2, 2), { camp: 'ecologistes' })] }),
  card('cohn_bendit', 'Daniel Cohn-Bendit', 'ecologistes', 4, 5, 7, { fx: [fx('fin_tour', 'aleatoire', buff(2, 2))] }),
  card('jadot', 'Yannick Jadot', 'ecologistes', 4, 7, 9, { fx: [fx('fin_tour', 'voisins', { do: 'declencher', trigger: 'fin_tour' })] }),
  card('rousseau', 'Sandrine Rousseau', 'ecologistes', 5, 6, 6, {
    kw: ['vedette'],
    fx: [fx('fin_tour', 'autres_camp', buff(1, 1), { camp: 'ecologistes' }), fx('celebration', 'joueur', campBuff(1, 1), { camp: 'ecologistes' })],
  }),
  card('tondelier', 'Marine Tondelier', 'ecologistes', 5, 5, 5, {
    fx: [fx('fin_tour', 'joueur', campBuff(1, 1), { camp: 'ecologistes' })],
  }),

  // Macronie : le marché. Le budget, le doré, et le Ralliement. Thevenot et Bregeon sont hors réserve.
  card('ndiaye', 'Sibeth Ndiaye', 'macronie', 1, 2, 4, { kw: ['porte_parole'], fx: [fx('droit_de_reponse', 'joueur', { do: 'budget', value: 1, plus_tard: true })] }),
  card('maillard', 'Sylvain Maillard', 'macronie', 1, 2, 3, { kw: ['ni_droite_ni_gauche'], fx: [fx('rallie', 'joue', buff(2, 1))] }),
  card('oudea', 'Amélie Oudéa-Castéra', 'macronie', 2, 2, 2, { golden: true, fx: [fx('fin_tour', 'dores', buff(1, 0))] }),
  card('rugy', 'François de Rugy', 'macronie', 2, 2, 3, {
    kw: ['vedette'],
    fx: [fx('depense', 'soi', buff(1, 1), { n: 5 }), fx('celebration', 'joueur', { do: 'budget', value: 1, plus_tard: true })],
  }),
  card('schiappa', 'Marlène Schiappa', 'macronie', 2, 1, 2, {
    kw: ['ni_droite_ni_gauche', 'vedette'],
    fx: [fx('sort', 'soi', buff(1, 1)), fx('celebration', 'joueur', carte('sort_aleatoire'))],
  }),
  card('castaner', 'Christophe Castaner', 'macronie', 3, 2, 3, { kw: ['ralliement', 'cumul'] }),
  card('berge', 'Aurore Bergé', 'macronie', 3, 3, 3, { kw: ['ralliement'], fx: [fx('heritage', 'soi', invoque('suppleant'))] }),
  card('dupond_moretti', 'Éric Dupond-Moretti', 'macronie', 3, 1, 2, { kw: ['ralliement', 'immunite'] }),
  // 5 novembre 2026 : 2 de budget au lieu de 1. Une affaire n'arrivant plus qu'une fois, la Macronie perdait son économie (5,11 en mono-camp).
  card('lemaire', 'Bruno Le Maire', 'macronie', 3, 1, 3, { kw: ['ralliement'], fx: [fx('debut_tour', 'joueur', { do: 'budget', value: 2 })] }),
  card('darmanin', 'Gérald Darmanin', 'macronie', 4, 8, 9, { kw: ['ralliement', 'porte_parole'] }),
  card('philippe', 'Édouard Philippe', 'macronie', 5, 8, 9, { fx: [fx('annonce', 'cible', { do: 'dorer', maxTier: 4 })] }),
  card('lecornu', 'Sébastien Lecornu', 'macronie', 4, 5, 6, { kw: ['ralliement', 'retour'] }),
  card('bayrou', 'François Bayrou', 'macronie', 4, 6, 8, { kw: ['ni_droite_ni_gauche'], fx: [fx('fin_tour', 'allies', { do: 'buff_par_ralliement', atk: 1, hp: 1 })] }),
  card('attal', 'Gabriel Attal', 'macronie', 4, 7, 7, { fx: [fx('aura', 'soi', compteur('dores_joues', 3, 3))] }),
  // La Fête de la musique à l'Élysée, 21 juin 2018 : il fait la fête deux fois plus fort que les autres.
  card('macron', 'Emmanuel Macron', 'macronie', 5, 8, 8, {
    kw: ['ni_droite_ni_gauche', 'vedette'],
    fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'celebration' }), fx('celebration', 'joueur', { do: 'budget', value: 2, plus_tard: true })],
  }),

  // Républicains : l'Immunité en combat, les affaires hors combat.
  card('gueant', 'Claude Guéant', 'republicains', 1, 3, 2, { kw: ['immunite'] }),
  card('tiberi', 'Jean Tiberi', 'republicains', 1, 2, 3, { fx: [fx('annonce', 'soi', invoque('electeur_fantome'))] }),
  card('balkany', 'Patrick Balkany', 'republicains', 2, 2, 2, { kw: ['immunite'], fx: [fx('aura', 'soi', compteur('casseroles', 1, 1))] }),
  card('hortefeux', 'Brice Hortefeux', 'republicains', 2, 3, 4, { fx: [fx('immunite_perdue', 'soi', buff(1, 1), { perma: true })] }),
  card('cope', 'Jean-François Copé', 'republicains', 2, 3, 4, { kw: ['porte_parole'], fx: [fx('heritage', 'premier_allie', motCle('immunite'))] }),
  card('morano', 'Nadine Morano', 'republicains', 2, 5, 5, { kw: ['vedette'], fx: [fx('celebration', 'aleatoire', motCle('immunite'))] }),
  card('lisnard', 'David Lisnard', 'republicains', 3, 2, 2, { kw: ['immunite'], fx: [fx('fin_tour', 'allie_suivant', motCle('immunite'))] }),
  card('wauquiez', 'Laurent Wauquiez', 'republicains', 3, 4, 7, {
    kw: ['porte_parole'],
    fx: [fx('riposte', 'soi', buff(1, 1)), fx('droit_de_reponse', 'joueur', campBuff(1, 0), { camp: 'republicains' })],
  }),
  card('bertrand', 'Xavier Bertrand', 'republicains', 3, 4, 5, { fx: [fx('annonce', 'cible', motCle('immunite'))] }),
  card('ciotti', 'Éric Ciotti', 'republicains', 3, 6, 6, { fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'serviteur', camp: 'rn', echelon: 0 })] }),
  card('retailleau', 'Bruno Retailleau', 'republicains', 4, 5, 9, { kw: ['porte_parole', 'immunite'] }),
  card('pecresse', 'Valérie Pécresse', 'republicains', 5, 6, 6, { fx: [fx('fin_tour', 'voisins', motCle('immunite'))] }),
  card('fillon', 'François Fillon', 'republicains', 4, 6, 6, {
    fx: [fx('annonce', 'soi', invoque('assistant_fictif', 2)), fx('aura', 'joueur', { do: 'scandale_plus', value: 1 })],
  }),
  card('dati', 'Rachida Dati', 'republicains', 4, 5, 5, { kw: ['immunite'], fx: [fx('meeting', 'allie_suivant', motCle('immunite'))] }),
  card('sarkozy', 'Nicolas Sarkozy', 'republicains', 5, 5, 6, { kw: ['immunite'], fx: [fx('casserole_recue', 'joueur', campBuff(1, 1), { camp: 'republicains', once: 'manche' })] }),

  // RN : la dynastie. Le débauchage de la boutique, et l'héritage durable.
  card('odoul', 'Julien Odoul', 'rn', 2, 4, 5, { kw: ['vedette'], fx: [fx('heritage', 'allie_suivant', { do: 'transmettre' }), fx('celebration', 'aleatoire', buff(1, 1), { camp: 'rn' })] }),
  card('houssin', 'Timothée Houssin', 'rn', 1, 1, 1, { fx: [fx('annonce', 'soi', debauche('plus_fort'))] }),
  // « Que de la main-d'œuvre locale », puis des travailleurs détachés à 5 € de l'heure : il embauche le moins cher, un autre en profite.
  card('fournas', 'Grégoire de Fournas', 'rn', 1, 1, 1, { fx: [fx('annonce', 'aleatoire', debauche('plus_fort'))] }),
  card('chenu', 'Sébastien Chenu', 'rn', 3, 4, 5, { fx: [fx('annonce', 'cible', debauche('plus_fort'))] }),
  card('lavalette', 'Laure Lavalette', 'rn', 2, 3, 3, { fx: [fx('annonce', 'soi', debauche('plus_fort')), fx('droit_de_reponse', 'soi', debauche('plus_faible'))] }),
  // Partie avec Mégret en 1998, revenue au FN en 2016 : la dynastie transmet deux fois.
  card('mc_lepen', 'Marie-Caroline Le Pen', 'rn', 2, 2, 2, { kw: ['retour'], fx: [fx('heritage', 'allie_suivant', { do: 'transmettre' })] }),
  card('tanguy', 'Jean-Philippe Tanguy', 'rn', 3, 2, 4, { fx: [fx('aura', 'soi', compteur('debauchages', 2, 2))] }),
  card('aliot', 'Louis Aliot', 'rn', 4, 4, 5, { fx: [fx('fin_tour', 'soi', debauche('plus_faible'))] }),
  // De LR au RN, avec un détour par la Crimée : il prend chez le voisin ce qu'il y a de plus gros.
  card('mariani', 'Thierry Mariani', 'rn', 3, 4, 5, { fx: [fx('annonce', 'soi', debauche('plus_fort'))] }),
  card('marechal', 'Marion Maréchal', 'rn', 4, 5, 5, { kw: ['retour'], fx: [fx('heritage', 'allie_suivant', buff(1, 1), { perma: true })] }),
  card('bardella', 'Jordan Bardella', 'rn', 5, 8, 8, {
    kw: ['vedette'],
    fx: [fx('annonce', 'cible', debauche('plus_fort')), fx('annonce', 'cible', debauche('plus_fort')), fx('celebration', 'main', debauche('plus_fort'))],
  }),
  card('jmlp', 'Jean-Marie Le Pen', 'rn', 4, 5, 8, { fx: [fx('heritage', 'allie_suivant', { do: 'transmettre', tout: true })] }),
  card('lepen', 'Marine Le Pen', 'rn', 5, 6, 7, { fx: [fx('debauche', 'joueur', campBuff(2, 1), { camp: 'rn' })] }),

  // Reconquête : le buzz. L'actualisation et la main ; la Polémique, une fois par combat.
  // 3 novembre 2026 : Reconquête vit de l'actualisation, qui coûte ; ses cartes la rendent gratuite ou la remboursent.
  card('bay', 'Nicolas Bay', 'reconquete', 2, 4, 4, { fx: [fx('annonce', 'joueur', { do: 'actualisations_gratuites', value: 3 })] }),
  card('dupont_aignan', 'Nicolas Dupont-Aignan', 'reconquete', 2, 3, 3, { kw: ['vedette'], fx: [fx('actualise', 'soi', buff(1, 1)), fx('celebration', 'joueur', { do: 'actualisations_gratuites', value: 1 })] }),
  // Le stratège numérique de Zemmour, et la cellule WikiZédia : chaque actualisation du fil le fait monter.
  // Il réécrivait aussi chaque boutique (congrès) : Reconquête gagnait une partie sur trois, retiré le 3 novembre 2026.
  card('lafont', 'Samuel Lafont', 'reconquete', 1, 2, 3, { fx: [fx('actualise', 'soi', buff(2, 0))] }),
  // Maire d'Orange après son père, condamné pour un emploi de collaborateur parlementaire.
  card('yann_bompard', 'Yann Bompard', 'reconquete', 1, 3, 3, { fx: [fx('annonce', 'soi', invoque('assistant_fictif'))] }),
  card('rigault', 'Stanislas Rigault', 'reconquete', 2, 3, 4, { kw: ['polemique'] }),
  card('asselineau', 'François Asselineau', 'reconquete', 3, 3, 4, { kw: ['vedette'], fx: [fx('actualise', 'aleatoire', buff(1, 1), { camp: 'reconquete' }), fx('celebration', 'joueur', carte('sort_aleatoire'))] }),
  // 1,45 % à la primaire de 2016, rallié à Zemmour en 2021 : on le renvoie, il ramène quelqu'un.
  card('poisson', 'Jean-Frédéric Poisson', 'reconquete', 2, 5, 5, { fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'serviteur', camp: 'reconquete', echelon: 0 })] }),
  card('peltier', 'Guillaume Peltier', 'reconquete', 3, 5, 6, { fx: [fx('annonce', 'cible', motCle('polemique'))] }),
  card('philippot', 'Florian Philippot', 'reconquete', 4, 6, 7, { kw: ['polemique'], fx: [fx('droit_de_reponse', 'joueur', { do: 'actualisations_gratuites', value: 3 })] }),
  // Chaque buzz lance sa cagnotte.
  card('messiha', 'Jean Messiha', 'reconquete', 3, 6, 7, { fx: [fx('actualise', 'joueur', { do: 'budget', value: 1 }, { once: 'manche' })] }),
  // 5 novembre 2026 : elle faisait aussi grandir la main à chaque actualisation, et portait seule Reconquête (+3,6 places offerte).
  card('knafo', 'Sarah Knafo', 'reconquete', 4, 5, 5, { fx: [fx('actualise', 'camp', buff(1, 1), { camp: 'reconquete', once: 'manche' })] }),
  card('villiers', 'Philippe de Villiers', 'reconquete', 5, 6, 8, {
    kw: ['vedette'],
    fx: [fx('debut_combat', 'tous_ennemis', { do: 'degats', value: 2 }), fx('celebration', 'joueur', { do: 'actualisations_gratuites', value: 2 })],
  }),
  card('zemmour', 'Éric Zemmour', 'reconquete', 5, 8, 9, {
    kw: ['polemique', 'vedette'],
    fx: [fx('annonce', 'joueur', { do: 'actualisations_gratuites', value: 2 }), fx('actualise', 'toute_la_main', buff(1, 1), { camp: 'reconquete' })],
  }),

  // Société civile : sans étiquette. Les pièces qu'on ajoute à n'importe quel moteur.
  card('kazib', 'Anasse Kazib', 'civile', 1, 3, 2, { fx: [fx('annonce', 'joueur', carte('tract'))] }),
  card('cheminade', 'Jacques Cheminade', 'civile', 1, 2, 3, { kw: ['vedette'], fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 }), fx('celebration', 'joueur', carte('sort_aleatoire'))] }),
  // Le Christ cosmique bénit : après une victoire, un autre politique au hasard grandit.
  card('durif', 'Sylvain Durif', 'civile', 2, 2, 3, {
    kw: ['vedette'],
    fx: [fx('fin_tour', 'aleatoire', buff(1, 1)), fx('fin_tour', 'aleatoire', buff(1, 1)), fx('celebration', 'aleatoire', buff(2, 2))],
  }),
  card('lalanne', 'Francis Lalanne', 'civile', 2, 5, 6, { kw: ['vedette'], fx: [fx('celebration', 'joueur', carte('copie'))] }),
  card('arthaud', 'Nathalie Arthaud', 'civile', 3, 4, 6, { kw: ['vedette'], fx: [fx('annonce', 'joueur', boutique(1, 1)), fx('celebration', 'joueur', boutique(1, 1))] }),
  card('branco', 'Juan Branco', 'civile', 2, 3, 2, {
    fx: [fx('annonce', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 }), fx('droit_de_reponse', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 })],
  }),
  card('roussel', 'Fabien Roussel', 'civile', 3, 1, 3, { fx: [fx('sort', 'allies', buff(1, 0))] }),
  // « Nous, on n'a pas d'immunité ouvrière » : il répond quand on perd.
  card('poutou', 'Philippe Poutou', 'civile', 3, 4, 6, { kw: ['vedette'], fx: [fx('vente_allie', 'soi', buff(2, 2)), fx('droit_de_reponse', 'joueur', { do: 'budget', value: 1, plus_tard: true })] }),
  card('lassalle', 'Jean Lassalle', 'civile', 5, 5, 9, { kw: ['vedette'], fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'fin_tour' })] }),

  // Échelon 6, le Panthéon : les anciens présidents, au-dessus des partis (la doctrine de De Gaulle).
  // Société civile : tout le monde peut les viser, quel que soit son camp.
  // « Je vous ai compris » (Alger, 4 juin 1958) : chacun a cru qu'il était de son côté.
  card('de_gaulle', 'Charles de Gaulle', 'civile', 6, 8, 8, { fx: [fx('annonce', 'allies', motCle('ni_droite_ni_gauche')), fx('annonce', 'allies', buff(3, 3))] }),
  // « Au revoir » (19 mai 1981) : il se lève, et la caméra reste sur sa chaise vide. Il est revenu ensuite, longtemps.
  card('giscard', 'Valéry Giscard d\'Estaing', 'civile', 6, 9, 12, { kw: ['retour'], fx: [fx('heritage', 'soi', invoque('chaise_vide'))] }),
  // 3 novembre 2026 : sur 300 parties, une seule finissait avec lui ; son Annonce rejoue tout de suite celles du plateau.
  card('chirac', 'Jacques Chirac', 'civile', 6, 10, 10, { fx: [fx('annonce', 'autres', { do: 'declencher', trigger: 'annonce' }), fx('aura', 'joueur', { do: 'doubler', trigger: 'annonce' })] }),
  card('mitterrand', 'François Mitterrand', 'civile', 6, 6, 10, { fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'heritage' }), fx('heritage', 'allies', buff(3, 3))] }),
];

// Une carte partage ses effets, par identité, avec chacun de ses serviteurs, dans toutes les parties : figés, rien
// ne peut les modifier en place.
for (const card of [...CARDS, ...Object.values(TOKENS)]) {
  for (const effect of card.effects ?? []) Object.freeze(effect);
  Object.freeze(card.effects);
}

export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export const PARTY_CAMPS: Camp[] = ['insoumis', 'socialistes', 'ecologistes', 'macronie', 'republicains', 'rn', 'reconquete'];
