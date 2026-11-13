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
  card('boyard', 'Louis Boyard', 'insoumis', 2, 4, 5, { kw: ['vedette'], fx: [fx('annonce', 'joueur', carte('tract')), fx('celebration', 'joueur', carte('tract', 2))] }),
  card('leaument', 'Antoine Léaument', 'insoumis', 1, 3, 4, { fx: [fx('vente', 'joueur', carte('tract', 2)), fx('droit_de_reponse', 'joueur', carte('tract'))] }),
  // L'ancien garde du corps de Mélenchon : il protège, et le drapeau reste.
  card('delogu', 'Sébastien Delogu', 'insoumis', 1, 2, 4, { kw: ['porte_parole', 'vedette'], fx: [fx('heritage', 'joueur', carte('tract')), fx('celebration', 'joueur', carte('tract'))] }),
  card('portes', 'Thomas Portes', 'insoumis', 2, 3, 5, { fx: [fx('fin_tour', 'aleatoire', tract), fx('fin_tour', 'aleatoire', tract)] }),
  card('trouve', 'Aurélie Trouvé', 'insoumis', 3, 1, 4, { fx: [fx('aura', 'soi', compteur('tracts', 1, 1))] }),
  // PS, LREM, EDS, EELV, LFI : il se pose sur n'importe qui.
  card('tache', 'Aurélien Taché', 'insoumis', 2, 1, 2, { kw: ['ralliement'], fx: [fx('fin_tour', 'aleatoire', tract)] }),
  card('chikirou', 'Sophia Chikirou', 'insoumis', 3, 5, 8, { fx: [fx('annonce', 'aleatoire', tract), fx('annonce', 'aleatoire', tract), fx('annonce', 'aleatoire', tract)] }),
  card('bompard', 'Manuel Bompard', 'insoumis', 4, 4, 6, { fx: [fx('fin_tour', 'voisins', tract)] }),
  // Un insoumis préside la commission des Finances.
  card('coquerel', 'Éric Coquerel', 'insoumis', 3, 4, 6, { fx: [fx('annonce', 'joueur', { do: 'budget', value: 3 })] }),
  // 7 novembre 2026 : monte à l'échelon 5, à la place de Mélenchon parti au 6.
  card('panot', 'Mathilde Panot', 'insoumis', 5, 8, 8, { fx: [fx('annonce', 'joueur', { do: 'tract_bonus', atk: 2, hp: 2 })] }),
  card('ruffin', 'François Ruffin', 'insoumis', 5, 6, 7, {
    fx: [fx('annonce', 'joueur', carte('tract', 3)), fx('fin_tour', 'joueur', carte('tract', 2)), fx('droit_de_reponse', 'joueur', carte('tract', 2))],
  }),
  // « L'élue la plus poursuivie de la Ve République », dit-elle (octobre 2026) : chaque affaire mobilise les siens, et
  // chacune de ses phrases fait polémique (13 novembre 2026). Les casseroles nourrissent le moteur des Tracts.
  card('hassan', 'Rima Hassan', 'insoumis', 4, 4, 6, { kw: ['polemique'], fx: [fx('casserole_recue', 'joueur', carte('tract', 2))] }),
  // Échelon 6. Le meeting en hologramme (2017), dans sept villes à la fois : vos « Quand il attaque » jouent deux fois,
  // et chacune de ses attaques fait gonfler tous les Insoumis, pour de bon (re-spécification du 7 novembre 2026 ; gonfler
  // la valeur des Tracts payait trop tard, -0,09 place offert à la manche 9). « Qu'ils s'en aillent tous ! » (son livre
  // de 2010) : le Coup de balai, depuis le 13 novembre 2026.
  card('melenchon', 'Jean-Luc Mélenchon', 'insoumis', 6, 7, 7, {
    kw: ['vedette', 'balai'],
    fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'meeting' }), fx('meeting', 'camp', tract, { camp: 'insoumis', perma: true })],
  }),

  // Socialistes : le retour. La mort comme ressource, et les Suppléants.
  card('thevenoud', 'Thomas Thévenoud', 'socialistes', 1, 2, 3, { kw: ['retour', 'vedette'], fx: [fx('celebration', 'soi', buff(1, 1))] }),
  card('bouamrane', 'Karim Bouamrane', 'socialistes', 1, 2, 2, { fx: [fx('heritage', 'soi', invoque('suppleant'))] }),
  // 7 novembre 2026 : le frondeur grandit en attaquant ; avec son Retour, il attaque deux fois par combat (règle R17).
  // 13 novembre 2026 : sa réincarnation (R20) revient comme sa carte nue, sans les gains du combat. Les Socialistes,
  // dont le Retour est le moteur, passaient de premiers (4,59) à derniers (5,20) en mono-camp : +1/+1 par attaque,
  // Thévenoud 2/3 et Valls 3/3 les ramènent à 4,92, dans le peloton.
  card('guedj', 'Jérôme Guedj', 'socialistes', 2, 3, 2, {
    kw: ['retour'],
    fx: [fx('meeting', 'soi', buff(1, 1), { perma: true })],
  }),
  // 13 novembre 2026 : le camp n'avait rien qui grandisse hors du combat de tête. Chaque allié tombé le fait grandir
  // pour de bon, dès l'échelon 2 (avant : +1/+0 aux Socialistes après cinq morts, presque jamais atteint). Les
  // Socialistes passent de 5,19 à 4,84 de place moyenne en mono-camp (3 000 parties).
  card('vallaud', 'Boris Vallaud', 'socialistes', 2, 1, 3, { fx: [fx('revanche', 'soi', buff(1, 1), { n: 1, perma: true })] }),
  card('cahuzac', 'Jérôme Cahuzac', 'socialistes', 2, 4, 5, {
    kw: ['vedette'],
    fx: [fx('vente', 'joueur', { do: 'budget', value: 2, plus_tard: true }), fx('celebration', 'joueur', { do: 'budget', value: 1, plus_tard: true })],
  }),
  card('hidalgo', 'Anne Hidalgo', 'socialistes', 4, 7, 7, { fx: [fx('annonce', 'cible', { do: 'sacrifier', echelon: 0 })] }),
  card('valls', 'Manuel Valls', 'socialistes', 3, 3, 3, { kw: ['retour'], fx: [fx('annonce', 'cible', motCle('retour'))] }),
  card('faure', 'Olivier Faure', 'socialistes', 4, 6, 8, { fx: [fx('revanche', 'joueur', campBuff(2, 2), { n: 1, card: 'suppleant' }), fx('droit_de_reponse', 'soi', invoque('suppleant'))] }),
  // Parti du PS en 2022 pour fonder La Convention : un transfuge, qui se rallie (7 novembre 2026).
  card('cazeneuve', 'Bernard Cazeneuve', 'socialistes', 3, 3, 6, { kw: ['ralliement', 'porte_parole'], fx: [fx('heritage', 'soi', invoque('suppleant', 2))] }),
  card('royal', 'Ségolène Royal', 'socialistes', 5, 7, 8, {
    kw: ['vedette'],
    fx: [fx('annonce', 'aleatoire', motCle('retour')), fx('annonce', 'aleatoire', motCle('retour')), fx('celebration', 'allie_suivant', buff(2, 2))],
  }),
  card('glucksmann', 'Raphaël Glucksmann', 'socialistes', 5, 9, 12, {
    kw: ['retour'], fx: [fx('meeting', 'allies', { do: 'declencher', trigger: 'heritage' }, { once: 'combat' })] }),
  // Échelon 6, clé de voûte de la mort comme ressource : chaque allié tombé fait gonfler tout le camp, pour la partie
  // (re-spécification du 7 novembre 2026). Suppléants, Retours et Héritages nourrissent la synergie.
  card('hollande', 'François Hollande', 'socialistes', 6, 5, 7, { fx: [fx('revanche', 'joueur', campBuff(1, 1), { n: 1, camp: 'socialistes' })] }),
  // Le favori des sondages de 2011 : il grandit avec son camp à chaque attaque, et sa chute arme les autres
  // (7 novembre 2026). Glucksmann relance son Héritage, Mitterrand le double, un Retour le fait tomber deux fois.
  // Il léguait son attaque seule depuis le 7 novembre (avec ses stats, les Socialistes passaient alors devant). Depuis
  // la réincarnation comme carte nue, le camp est dernier et ne dépasse pas 77 de stats avec son meilleur montage : il
  // lègue de nouveau ses stats, et gagne +3/+3 par Socialiste à chaque attaque (13 novembre 2026). Avec Mitterrand et
  // Glucksmann, c'est le montage qui mène le camp vers 1 000.
  card('strauss_kahn', 'Dominique Strauss-Kahn', 'socialistes', 6, 6, 8, {
    fx: [
      fx('meeting', 'soi', { do: 'buff_par_membre', atk: 3, hp: 3 }, { camp: 'socialistes', perma: true }),
      fx('heritage', 'autres_camp', { do: 'transmettre', tout: true }, { camp: 'socialistes', perma: true }),
    ],
  }),

  // Écologistes : la pousse. La Fin de tour, et la boutique qu'on fait grandir.
  // « Le Tour de France est machiste et polluant » : le gag écologiste, en Vedette.
  card('doucet', 'Grégory Doucet', 'ecologistes', 1, 1, 3, { kw: ['vedette'], fx: [fx('fin_tour', 'soi', buff(1, 1)), fx('celebration', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('lucas', 'Benjamin Lucas-Lundy', 'ecologistes', 1, 2, 3, { fx: [fx('vente', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('batho', 'Delphine Batho', 'ecologistes', 2, 3, 3, { fx: [fx('fin_tour', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('hurmic', 'Pierre Hurmic', 'ecologistes', 2, 3, 5, { fx: [fx('joue', 'soi', buff(1, 1), { camp: 'ecologistes' })] }),
  card('mamere', 'Noël Mamère', 'ecologistes', 2, 2, 3, { fx: [fx('aura', 'soi', compteur('ecologistes_joues', 1, 1)), fx('droit_de_reponse', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  card('piolle', 'Éric Piolle', 'ecologistes', 3, 3, 6, { fx: [fx('fin_tour', 'voisins', buff(1, 1))] }),
  // Le démontage du McDonald's de Millau (12 août 1999), puis les fauchages d'OGM : ce qu'il arrache fait pousser le
  // reste. Chaque politique renvoyé fait grandir les Écologistes de la boutique (13 novembre 2026).
  card('bove', 'José Bové', 'ecologistes', 3, 4, 6, { fx: [fx('vente_allie', 'joueur', boutique(1, 1), { camp: 'ecologistes' })] }),
  // L'ancienne juge d'instruction du pôle financier, celle de l'affaire Elf : avec elle, l'argent revient. Chaque
  // Écologiste joué rembourse 1 de budget, et le camp peut enfin faire tourner ses politiques (13 novembre 2026).
  card('joly', 'Eva Joly', 'ecologistes', 3, 3, 4, { fx: [fx('joue', 'joueur', { do: 'budget', value: 1 }, { camp: 'ecologistes' })] }),
  card('duflot', 'Cécile Duflot', 'ecologistes', 4, 6, 7, { fx: [fx('joue', 'joue', buff(3, 3), { camp: 'ecologistes' })] }),
  // Échelon 6, clé de voûte de la Fin de tour. Il comptait les Écologistes du plateau (+7/+7 au plus, la même chose à
  // chaque manche) ; il compte ceux joués dans la partie, comme Mamère : le gain grandit tant qu'on joue des Écologistes
  // (13 novembre 2026). Entre deux Jadot, avec Lassalle, le camp approche 1 000 à la manche 15.
  card('cohn_bendit', 'Daniel Cohn-Bendit', 'ecologistes', 6, 6, 8, { fx: [fx('fin_tour', 'camp', { do: 'buff_compteur', compteur: 'ecologistes_joues', atk: 1, hp: 1 }, { camp: 'ecologistes' })] }),
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
  // 13 novembre 2026 : +2/+2 par Ralliement (au lieu de +2/+1) et Castaner 3/4. La Macronie, dernière en mono-camp,
  // avait les Ralliements au corps le plus faible.
  card('maillard', 'Sylvain Maillard', 'macronie', 1, 2, 3, { kw: ['ni_droite_ni_gauche'], fx: [fx('rallie', 'joue', buff(2, 2))] }),
  card('oudea', 'Amélie Oudéa-Castéra', 'macronie', 2, 2, 2, { golden: true, fx: [fx('fin_tour', 'dores', buff(1, 0))] }),
  card('rugy', 'François de Rugy', 'macronie', 2, 2, 3, {
    kw: ['vedette'],
    fx: [fx('depense', 'soi', buff(1, 1), { n: 5 }), fx('celebration', 'joueur', { do: 'budget', value: 1, plus_tard: true })],
  }),
  // 7 novembre 2026 : grandit tous les deux sorts. À chaque Tract, un échelon 2 dépassait les légendes.
  card('schiappa', 'Marlène Schiappa', 'macronie', 2, 2, 3, {
    kw: ['ni_droite_ni_gauche', 'vedette'],
    fx: [fx('sort', 'soi', buff(1, 1), { n: 2 }), fx('celebration', 'joueur', carte('sort_aleatoire'))],
  }),
  card('castaner', 'Christophe Castaner', 'macronie', 3, 3, 4, { kw: ['ralliement', 'cumul'] }),
  card('dupond_moretti', 'Éric Dupond-Moretti', 'macronie', 3, 1, 2, { kw: ['ralliement', 'immunite'] }),
  // 5 novembre 2026 : 2 de budget au lieu de 1. Une affaire n'arrivant plus qu'une fois, la Macronie perdait son économie (5,11 en mono-camp).
  card('lemaire', 'Bruno Le Maire', 'macronie', 3, 1, 3, { kw: ['ralliement'], fx: [fx('debut_tour', 'joueur', { do: 'budget', value: 2 })] }),
  // 7 novembre 2026 : « le premier flic de France » grandit en attaquant, et rallié, il l'apprend à son hôte. Avec
  // l'Immunité de Dupond-Moretti et le Cumul de Castaner, l'hôte de tête gonfle à chaque coup.
  card('darmanin', 'Gérald Darmanin', 'macronie', 4, 5, 6, { kw: ['ralliement'], fx: [fx('meeting', 'soi', buff(2, 2), { perma: true })] }),
  card('philippe', 'Édouard Philippe', 'macronie', 5, 8, 9, { fx: [fx('annonce', 'cible', { do: 'dorer', maxTier: 4 })] }),
  card('bayrou', 'François Bayrou', 'macronie', 4, 6, 8, { kw: ['ni_droite_ni_gauche'], fx: [fx('fin_tour', 'allies', { do: 'buff_par_ralliement', atk: 2, hp: 2 })] }),
  // Vingt-trois 49.3 en vingt mois (2022-2024), le record depuis Rocard : vos 49.3 se déclenchent deux fois, le sien
  // compris (13 novembre 2026). Un corps de multiplicateur, comme Lassalle, Chirac et Mitterrand. Son 49.3 à tous ses
  // alliés la mettait en tête de l'échelon 4 (1,72 place) : il va à ses voisins, qu'on place.
  card('borne', 'Élisabeth Borne', 'macronie', 4, 2, 7, { fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'debut_combat' }), fx('debut_combat', 'voisins', buff(2, 2))] }),
  card('attal', 'Gabriel Attal', 'macronie', 5, 8, 8, { fx: [fx('aura', 'soi', compteur('dores_joues', 6, 6))] }),
  // La Fête de la musique à l'Élysée, 21 juin 2018 : il fait la fête deux fois plus fort que les autres.
  // Échelon 6, clé de voûte du Ralliement : chaque Ralliement fait gonfler son hôte, d'autant plus qu'il en a déjà
  // reçu. Vedette sans gain : il prend la lumière et double les Célébrations des autres (7 novembre 2026).
  // 13 novembre 2026 : sans Ralliement sous la main, son moteur ne tournait pas (1,23 place, le plus faible des chefs
  // de camp). Il amène son transfuge : Gérald Darmanin, qui quitte Les Républicains pour son gouvernement en 2017.
  card('macron', 'Emmanuel Macron', 'macronie', 6, 9, 9, {
    kw: ['ni_droite_ni_gauche', 'vedette'],
    fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'celebration' }), fx('rallie', 'joue', { do: 'buff_par_ralliement', atk: 4, hp: 4 }), fx('annonce', 'joueur', carte('darmanin'))],
  }),

  // Républicains : l'Immunité en combat, les affaires hors combat.
  // Déjà l'un des meilleurs achats du début de partie : grandir à chaque attaque le rendait écrasant (Républicains 3,85
  // en plateaux mixtes), sans rien les Républicains tombaient derniers (5,15). Une fois par combat, les sept camps
  // tiennent en 0,15 place en mono-camp (7 novembre 2026).
  card('gueant', 'Claude Guéant', 'republicains', 1, 3, 2, { kw: ['immunite'], fx: [fx('meeting', 'soi', buff(1, 0), { perma: true, once: 'combat' })] }),
  card('tiberi', 'Jean Tiberi', 'republicains', 1, 2, 3, { fx: [fx('annonce', 'soi', invoque('electeur_fantome'))] }),
  card('balkany', 'Patrick Balkany', 'republicains', 2, 2, 2, { kw: ['immunite'], fx: [fx('aura', 'soi', compteur('casseroles', 1, 1))] }),
  card('hortefeux', 'Brice Hortefeux', 'republicains', 2, 3, 4, { fx: [fx('immunite_perdue', 'soi', buff(1, 1), { perma: true })] }),
  card('morano', 'Nadine Morano', 'republicains', 2, 5, 5, { kw: ['vedette'], fx: [fx('celebration', 'aleatoire', motCle('immunite'))] }),
  card('lisnard', 'David Lisnard', 'republicains', 3, 2, 2, { kw: ['immunite'], fx: [fx('fin_tour', 'allie_suivant', motCle('immunite'))] }),
  card('wauquiez', 'Laurent Wauquiez', 'republicains', 3, 4, 7, {
    kw: ['porte_parole'],
    fx: [fx('riposte', 'soi', buff(1, 1)), fx('droit_de_reponse', 'joueur', campBuff(1, 0), { camp: 'republicains' })],
  }),
  card('bertrand', 'Xavier Bertrand', 'republicains', 3, 4, 5, { fx: [fx('annonce', 'cible', motCle('immunite'))] }),
  // Allié au RN en 2024 : un transfuge, qui se rallie (7 novembre 2026).
  card('ciotti', 'Éric Ciotti', 'republicains', 3, 6, 6, { kw: ['ralliement'], fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'serviteur', camp: 'rn', echelon: 0 })] }),
  card('retailleau', 'Bruno Retailleau', 'republicains', 4, 5, 9, { kw: ['porte_parole', 'immunite'] }),
  // Un 49.3 sur le budget de la Sécurité sociale le 2 décembre 2024, censuré le 4 par 331 députés : le plus court
  // passage à Matignon de la Ve République. Puis élu député de Paris le 28 septembre 2025 : son 49.3 gonfle les autres,
  // il tombe, et se réincarne aussitôt (13 novembre 2026). Revanches et Héritages en profitent.
  card('barnier', 'Michel Barnier', 'republicains', 4, 6, 6, { kw: ['retour'], fx: [fx('debut_combat', 'autres', buff(2, 2)), fx('debut_combat', 'soi', { do: 'detruire' })] }),
  // Condamné en 2004 pour les emplois du RPR, parti enseigner au Québec, revenu maire de Bordeaux en 2006 puis ministre :
  // « le meilleur d'entre nous » (Chirac). Le peuple oublie, il revient plus fort (13 novembre 2026).
  card('juppe', 'Alain Juppé', 'republicains', 4, 4, 6, { kw: ['immunite'], fx: [fx('oubli', 'joue', buff(4, 4)), fx('oubli', 'joue', motCle('immunite'))] }),
  card('pecresse', 'Valérie Pécresse', 'republicains', 5, 6, 6, { fx: [fx('fin_tour', 'voisins', motCle('immunite'))] }),
  // 7 novembre 2026 : monte à l'échelon 5 et reprend le moteur de casseroles de Sarkozy, parti au 6. La casserole
  // Emploi fictif garde les Assistants.
  card('fillon', 'François Fillon', 'republicains', 5, 7, 7, {
    fx: [fx('aura', 'joueur', { do: 'scandale_plus', value: 1 }), fx('casserole_recue', 'joueur', campBuff(1, 1), { camp: 'republicains', once: 'manche' })],
  }),
  card('dati', 'Rachida Dati', 'republicains', 4, 5, 5, { kw: ['immunite'], fx: [fx('meeting', 'allie_suivant', motCle('immunite'))] }),
  // Échelon 6, clé de voûte des casseroles : une casserole double celui qui la reçoit (7 novembre 2026). Une fois par
  // manche depuis le 10 novembre au soir : chaque casserole doublait, et neuf casseroles en trois manches menaient un
  // Chirac à 89 millions ; une fois par manche, il grandit vers quelques milliers en fin de partie.
  card('sarkozy', 'Nicolas Sarkozy', 'republicains', 6, 6, 7, { kw: ['immunite'], fx: [fx('casserole_recue', 'joue', { do: 'doubler_stats' }, { once: 'manche' })] }),

  // RN : la dynastie. Le débauchage de la boutique, et l'héritage durable.
  // 13 novembre 2026 : chaque débauchage fait grossir le RN de la boutique, donc le débauchage suivant. Avec Marine
  // Le Pen, le camp ne dépassait pas 450 de stats : la boutique ne grandissait pas. (Avant : +1/+1 à l'allié suivant
  // quand il attaque, 0,47 place, l'une des cartes les plus faibles de l'échelon 2.)
  card('odoul', 'Julien Odoul', 'rn', 2, 4, 5, { kw: ['vedette'], fx: [fx('debauche', 'joueur', boutique(1, 1), { camp: 'rn' }), fx('celebration', 'aleatoire', buff(1, 1), { camp: 'rn' })] }),
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
  // Un transfuge qui se rallie : son débauchage profite à son hôte (7 novembre 2026).
  card('mariani', 'Thierry Mariani', 'rn', 3, 4, 5, { kw: ['ralliement'], fx: [fx('annonce', 'soi', debauche('plus_fort'))] }),
  card('marechal', 'Marion Maréchal', 'rn', 4, 5, 5, { kw: ['retour'], fx: [fx('heritage', 'allie_suivant', buff(1, 1), { perma: true })] }),
  card('bardella', 'Jordan Bardella', 'rn', 5, 8, 8, {
    kw: ['vedette'],
    fx: [fx('annonce', 'cible', debauche('plus_fort')), fx('annonce', 'cible', debauche('plus_fort')), fx('celebration', 'main', debauche('plus_fort'))],
  }),
  // 7 novembre 2026 : monte à l'échelon 5, et la dynastie garde ce qu'il transmet.
  card('jmlp', 'Jean-Marie Le Pen', 'rn', 5, 6, 8, { fx: [fx('heritage', 'allie_suivant', { do: 'transmettre', tout: true }, { perma: true })] }),
  // Échelon 6, clé de voûte du débauchage : chaque débauché donne ses stats à tout le RN, pour la partie (7 novembre 2026).
  card('lepen', 'Marine Le Pen', 'rn', 6, 7, 8, { fx: [fx('debauche', 'joueur', { do: 'gain_debauche' }, { camp: 'rn' })] }),

  // Reconquête : le buzz. L'actualisation et la main ; la Polémique, une fois par combat.
  // 3 novembre 2026 : Reconquête vit de l'actualisation, qui coûte ; ses cartes la rendent gratuite ou la remboursent.
  card('bay', 'Nicolas Bay', 'reconquete', 2, 4, 4, { fx: [fx('annonce', 'joueur', { do: 'actualisations_gratuites', value: 3 })] }),
  // Rallié à Marine Le Pen en 2017, Premier ministre annoncé : un Ralliement (7 novembre 2026).
  card('dupont_aignan', 'Nicolas Dupont-Aignan', 'reconquete', 2, 3, 3, { kw: ['ralliement', 'vedette'], fx: [fx('actualise', 'soi', buff(1, 1)), fx('celebration', 'joueur', { do: 'actualisations_gratuites', value: 1 })] }),
  // Le stratège numérique de Zemmour, et la cellule WikiZédia : chaque actualisation du fil le fait monter.
  // Il réécrivait aussi chaque boutique (congrès) : Reconquête gagnait une partie sur trois, retiré le 3 novembre 2026.
  card('lafont', 'Samuel Lafont', 'reconquete', 1, 2, 3, { fx: [fx('actualise', 'soi', buff(2, 0))] }),
  // Maire d'Orange après son père, condamné pour un emploi de collaborateur parlementaire.
  card('yann_bompard', 'Yann Bompard', 'reconquete', 1, 3, 3, { fx: [fx('annonce', 'soi', invoque('assistant_fictif'))] }),
  // 7 novembre 2026 : le plus faible de l'échelon 2 (0,39 place) grandit en attaquant.
  card('rigault', 'Stanislas Rigault', 'reconquete', 2, 3, 4, { kw: ['polemique'], fx: [fx('meeting', 'soi', buff(1, 1), { perma: true })] }),
  card('asselineau', 'François Asselineau', 'reconquete', 3, 3, 4, { kw: ['vedette'], fx: [fx('actualise', 'aleatoire', buff(1, 1), { camp: 'reconquete' }), fx('celebration', 'joueur', carte('sort_aleatoire'))] }),
  // 1,45 % à la primaire de 2016, rallié à Zemmour en 2021 : on le renvoie, il ramène quelqu'un.
  card('poisson', 'Jean-Frédéric Poisson', 'reconquete', 2, 5, 5, { fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'serviteur', camp: 'reconquete', echelon: 0 })] }),
  // De LR à Reconquête : il se rallie, et apporte sa Polémique à son hôte (7 novembre 2026).
  card('peltier', 'Guillaume Peltier', 'reconquete', 4, 7, 8, { kw: ['ralliement', 'polemique'] }),
  card('philippot', 'Florian Philippot', 'reconquete', 4, 6, 7, { kw: ['polemique'], fx: [fx('droit_de_reponse', 'joueur', { do: 'actualisations_gratuites', value: 3 })] }),
  // Chaque buzz lance sa cagnotte.
  card('messiha', 'Jean Messiha', 'reconquete', 3, 6, 7, { fx: [fx('actualise', 'joueur', { do: 'budget', value: 1 }, { once: 'manche' })] }),
  // 5 novembre 2026 : elle faisait aussi grandir la main à chaque actualisation, et portait seule Reconquête (+3,6 places offerte).
  // 7 novembre 2026 : monte à l'échelon 5. La main de Zemmour ne servait pas (0,51 place) : chaque actualisation fait
  // grandir un autre politique de Reconquête.
  card('knafo', 'Sarah Knafo', 'reconquete', 5, 7, 7, { fx: [fx('actualise', 'aleatoire', buff(2, 2), { camp: 'reconquete' })] }),
  card('villiers', 'Philippe de Villiers', 'reconquete', 5, 6, 8, {
    kw: ['vedette'],
    fx: [fx('debut_combat', 'tous_ennemis', { do: 'degats', value: 2 }), fx('celebration', 'joueur', { do: 'actualisations_gratuites', value: 2 })],
  }),
  // Échelon 6, clé de voûte de l'actualisation : il grandit au carré, de +1/+1 par actualisation de la partie (7 novembre 2026).
  card('zemmour', 'Éric Zemmour', 'reconquete', 6, 8, 9, {
    kw: ['polemique', 'vedette'],
    fx: [fx('actualise', 'soi', { do: 'buff_compteur', compteur: 'actualisations', atk: 1, hp: 1 })],
  }),

  // Société civile : sans étiquette. Les pièces qu'on ajoute à n'importe quel moteur.
  card('kazib', 'Anasse Kazib', 'civile', 1, 3, 2, { fx: [fx('annonce', 'joueur', carte('tract'))] }),
  card('cheminade', 'Jacques Cheminade', 'civile', 1, 2, 3, { kw: ['vedette'], fx: [fx('vente', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 }), fx('celebration', 'joueur', carte('sort_aleatoire'))] }),
  // Le Christ cosmique bénit : après une victoire, un autre politique au hasard grandit.
  card('durif', 'Sylvain Durif', 'civile', 2, 2, 3, {
    kw: ['vedette'],
    fx: [fx('fin_tour', 'aleatoire', buff(1, 1)), fx('fin_tour', 'aleatoire', buff(1, 1)), fx('celebration', 'aleatoire', buff(2, 2))],
  }),
  // Le chanteur en tête de la liste « Alliance jaune » aux européennes de 2019 : un ridicule en attire un autre, il
  // découvre un Ridicule (13 novembre 2026). Sa Célébration ajoutait une copie de lui-même : chaque victoire rapportait
  // un Ridicule de plus, gratuit, dès la manche 2, et il était le meilleur achat du début de partie (41 % des plateaux
  // vainqueurs à 5/6, 19 % à 4/4). Le soir même : ses Ridicules coûtent 2 ou moins, sans les plus forts, et sa
  // Célébration donne le Retour en politique, comme sa chanson de 1986, « On se retrouvera ».
  card('lalanne', 'Francis Lalanne', 'civile', 2, 4, 4, {
    kw: ['vedette'],
    fx: [fx('annonce', 'joueur', { do: 'decouvrir', quoi: 'casserole', genre: 'ridicule', coutMax: 2 }), fx('celebration', 'aleatoire', motCle('retour'))],
  }),
  card('arthaud', 'Nathalie Arthaud', 'civile', 3, 5, 7, { kw: ['vedette'], fx: [fx('annonce', 'joueur', boutique(1, 1)), fx('celebration', 'joueur', boutique(1, 1))] }),
  card('branco', 'Juan Branco', 'civile', 2, 3, 2, {
    fx: [fx('annonce', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 }), fx('droit_de_reponse', 'joueur', { do: 'decouvrir', quoi: 'sort', echelon: 0 })],
  }),
  card('roussel', 'Fabien Roussel', 'civile', 3, 1, 3, { fx: [fx('sort', 'allies', buff(1, 0))] }),
  // « Nous, on n'a pas d'immunité ouvrière » : il répond quand on perd. Au débat du 4 avril 2017, il tape sur Fillon et
  // sur Le Pen d'un même élan : le Coup de balai (13 novembre 2026).
  card('poutou', 'Philippe Poutou', 'civile', 3, 2, 6, { kw: ['vedette', 'balai'], fx: [fx('vente_allie', 'soi', buff(2, 2)), fx('droit_de_reponse', 'joueur', { do: 'budget', value: 1, plus_tard: true })] }),
  // Candidat le 9 novembre 2026 : « ni de droite, ni de gauche », et « Je sais ce que c'est de se battre, de tomber,
  // de se relever toujours » (vidéo de sa candidature). Il compte pour chaque parti, et se relève une fois.
  card('riner', 'Teddy Riner', 'civile', 4, 6, 9, { kw: ['ni_droite_ni_gauche', 'retour'] }),
  card('lassalle', 'Jean Lassalle', 'civile', 5, 6, 11, { kw: ['vedette'], fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'fin_tour' })] }),

  // Échelon 6, le Panthéon : les anciens présidents, au-dessus des partis (la doctrine de De Gaulle).
  // Société civile : tout le monde peut les viser, quel que soit son camp.
  // 13 novembre 2026 : les présidents passent au niveau des chefs de camp (ils gagnaient 1,2 à 2 places, contre 2,3 à
  // 2,8 pour les chefs).
  // « Je vous ai compris » (Alger, 4 juin 1958) : chacun a cru qu'il était de son côté, et chaque nouveau venu aussi.
  card('de_gaulle', 'Charles de Gaulle', 'civile', 6, 9, 9, {
    fx: [fx('annonce', 'allies', motCle('ni_droite_ni_gauche')), fx('annonce', 'allies', buff(4, 4)), fx('joue', 'joue', motCle('ni_droite_ni_gauche')), fx('joue', 'joue', buff(2, 2))],
  }),
  // « Au revoir » (19 mai 1981) : il se lève, et la caméra reste sur sa chaise vide. Il est revenu ensuite, longtemps.
  // 7 novembre 2026 : la chaise vide tient ce qu'il tenait, ses PV. 13 novembre 2026 : à 0 d'attaque, elle ne servait
  // presque à rien ; elle a ses stats, et lui passe de 13/16 à 10/13. Réincarné comme sa carte, il en relaisse une.
  card('giscard', 'Valéry Giscard d\'Estaing', 'civile', 6, 10, 13, { kw: ['retour'], fx: [fx('heritage', 'soi', { do: 'chaise_vide' })] }),
  // 3 novembre 2026 : sur 300 parties, une seule finissait avec lui ; son Annonce rejoue tout de suite celles du plateau.
  // 13 novembre 2026 : candidat en 1981, 1988, 1995 et 2002, il revient toujours. Les Annonces se rejouent à chaque
  // fin de tour (doublées par lui), le jour de sa pose compris. Celles de ses voisins seulement, comme Jadot pour les
  // Fins de tour : quand il rejouait toutes les Annonces du plateau, il était sur 48 % des plateaux vainqueurs, le plus
  // souvent avec de Gaulle (+8/+8 à tous à chaque manche). On choisit les deux Annonces qu'on place à côté de lui.
  card('chirac', 'Jacques Chirac', 'civile', 6, 16, 16, {
    fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'annonce' }), fx('fin_tour', 'voisins', { do: 'declencher', trigger: 'annonce' })],
  }),
  // « Je crois aux forces de l'esprit et je ne vous quitterai pas » (vœux du 31 décembre 1994) : son Héritage reste,
  // pour de bon (13 novembre 2026 ; avant, +4/+4 le temps du combat).
  card('mitterrand', 'François Mitterrand', 'civile', 6, 6, 10, { fx: [fx('aura', 'joueur', { do: 'doubler', trigger: 'heritage' }), fx('heritage', 'allies', buff(3, 3), { perma: true })] }),
];

// Une carte partage ses effets, par identité, avec chacun de ses serviteurs, dans toutes les parties : figés, rien
// ne peut les modifier en place.
for (const card of [...CARDS, ...Object.values(TOKENS)]) {
  for (const effect of card.effects ?? []) Object.freeze(effect);
  Object.freeze(card.effects);
}

/**
 * La réserve : des politiques sortis du roster. Ils ne sont plus dans la boutique ni au bestiaire, mais leur carte,
 * leurs casseroles (`RESERVE_CASSEROLES`), leurs phrases, leurs voix et leurs visages restent. Pour un retour, la
 * ligne remonte dans `CARDS`. Depuis la 0.4.0 (13 novembre 2026) : les camps les plus fournis ont rendu des cartes,
 * pour que la boutique propose chaque camp à parts plus égales.
 */
export const RESERVE_CARDS: Card[] = [
  // Elle a coordonné L'Avenir en commun : celle qui écrit les promesses en distribue.
  card('guette', 'Clémence Guetté', 'insoumis', 2, 4, 5, { fx: [fx('annonce', 'joueur', carte('promesse'))] }),
  // Les faux billets de 500 € offerts à Juncker : tout le monde en reçoit.
  card('aubry', 'Manon Aubry', 'insoumis', 4, 6, 7, { fx: [fx('annonce', 'autres', tract)] }),
  card('berge', 'Aurore Bergé', 'macronie', 3, 4, 4, { kw: ['ralliement'], fx: [fx('heritage', 'soi', invoque('suppleant'))] }),
  card('lecornu', 'Sébastien Lecornu', 'macronie', 4, 5, 6, { kw: ['ralliement', 'retour'] }),
  card('cope', 'Jean-François Copé', 'republicains', 2, 3, 4, { kw: ['porte_parole'], fx: [fx('heritage', 'premier_allie', motCle('immunite'))] }),
];

export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export const PARTY_CAMPS: Camp[] = ['insoumis', 'socialistes', 'ecologistes', 'macronie', 'republicains', 'rn', 'reconquete'];
