import type { Camp, Card, Counter, Effect, Keyword, Spell, Target, Trigger } from '#src/engine/types.ts';
import { KEYWORD_RULES } from '#src/client/const/keywordRules.ts';
import { signed } from '#src/client/tools/signed.ts';
import { CARD_BY_ID, TOKENS } from '#src/data/cards.ts';
import { SPELL_BY_ID } from '#src/data/sorts.ts';

/**
 * Le texte des cartes, toujours généré depuis les données. Les mots-clés et les déclencheurs
 * sont entourés de ** : l'interface les met en gras (`RichText`).
 */

const CAMP_ONE: Record<Camp, string> = {
  insoumis: 'Insoumis',
  socialistes: 'Socialiste',
  ecologistes: 'Écologiste',
  macronie: 'politique de la Macronie',
  republicains: 'Républicain',
  rn: 'politique du RN',
  reconquete: 'politique de Reconquête',
  civile: 'politique de la Société civile',
};

const CAMP_MANY: Record<Camp, string> = {
  insoumis: 'Insoumis',
  socialistes: 'Socialistes',
  ecologistes: 'Écologistes',
  macronie: 'politiques de la Macronie',
  republicains: 'Républicains',
  rn: 'politiques du RN',
  reconquete: 'politiques de Reconquête',
  civile: 'politiques de la Société civile',
};

const CAMP_OF: Record<Camp, string> = {
  insoumis: 'insoumis',
  socialistes: 'socialiste',
  ecologistes: 'écologiste',
  macronie: 'de la Macronie',
  republicains: 'républicain',
  rn: 'du RN',
  reconquete: 'de Reconquête',
  civile: 'de la Société civile',
};

const COUNTER_TEXT: Record<Counter, string> = {
  tracts: '**Tract** lancé',
  ecologistes_joues: 'Écologiste joué',
  dores_joues: 'politique doré joué',
  casseroles: 'casserole reçue par vos politiques',
  debauchages: 'débauchage',
};

const TRIGGER_WORD: Partial<Record<Trigger, string>> = { annonce: 'Annonce', heritage: 'Héritage', fin_tour: 'Fin de tour' };
const TRIGGER_WORDS: Partial<Record<Trigger, string>> = { annonce: 'Annonces', heritage: 'Héritages', fin_tour: 'Fins de tour', celebration: 'Célébrations' };

function keyword(k: Keyword): string {
  return `**${KEYWORD_RULES[k].label}**`;
}

function stats(atk: number, hp: number): string {
  return `${signed(atk)}/${signed(hp)}`;
}

function plural(n: number, one: string, many: string): string {
  return n > 1 ? `${n} ${many}` : one;
}

/** Qui reçoit l'effet, en complément d'objet : « à vos voisins », « à un autre allié ». */
function who(to: Target, camp?: Camp, onSpell = false): string {
  switch (to) {
    case 'voisins':
      return 'ses voisins';
    case 'meme_camp':
      return 'les politiques de son camp';
    case 'camp':
      return camp ? `vos ${CAMP_MANY[camp]}` : 'vos politiques de son camp';
    case 'allies':
      return 'vos politiques';
    case 'autres':
      return 'vos autres politiques';
    case 'autres_camp':
      return camp ? `vos autres ${CAMP_MANY[camp]}` : 'vos autres politiques de son camp';
    case 'premier_allie':
      return 'votre premier politique';
    case 'dernier_allie':
      return 'votre dernier politique';
    case 'allie_suivant':
      return 'l\'allié suivant';
    case 'dores':
      return 'vos politiques dorés';
    case 'cible':
      return onSpell ? 'un politique' : 'un autre allié';
    case 'aleatoire':
      return camp ? `un autre ${CAMP_ONE[camp]} au hasard` : 'un autre allié au hasard';
    case 'joue':
      return 'ce politique';
    case 'declencheur':
      return 'cet allié';
    case 'main':
      return camp ? `un ${CAMP_ONE[camp]} de votre main` : 'un politique de votre main';
    case 'toute_la_main':
      return camp ? `vos ${CAMP_MANY[camp]} en main` : 'les politiques de votre main';
    case 'premier_ennemi':
      return 'le premier ennemi';
    case 'dernier_ennemi':
      return 'le dernier ennemi';
    case 'tous_ennemis':
      return 'tous les ennemis';
    case 'ennemi_aleatoire':
      return 'un ennemi au hasard';
    case 'soi':
    case 'joueur':
      return 'lui';
  }
}

/** « à » suivi de la cible, avec les contractions : « aux ennemis », « au premier ennemi ». */
function to(target: string): string {
  if (target.startsWith('les ')) return `aux ${target.slice(4)}`;
  if (target.startsWith('le ')) return `au ${target.slice(3)}`;
  return `à ${target}`;
}

/** « de » suivi de la cible : « du premier ennemi », « des ennemis », « d'un politique ». */
function of(target: string): string {
  if (target.startsWith('les ')) return `des ${target.slice(4)}`;
  if (target.startsWith('le ')) return `du ${target.slice(3)}`;
  if (/^[aeiouhéèêàùâîôûl]/i.test(target) && !target.startsWith('la ') && !target.startsWith('l\'')) return `d'${target}`;
  return `de ${target}`;
}

function cardName(id: string): string {
  return SPELL_BY_ID[id]?.name ?? CARD_BY_ID[id]?.name ?? TOKENS[id]?.name ?? id;
}

function tokenText(id: string, count: number): string {
  const token = TOKENS[id];
  const name = token?.name ?? id;
  const many = name.split(' ').map((w) => (/[sx]$/.test(w) || ['de', 'du', 'des'].includes(w) ? w : `${w}s`)).join(' ');
  const body = token ? ` ${token.atk}/${token.hp}${token.keywords?.includes('porte_parole') ? ' **Porte-parole**' : ''}` : '';
  if (count === 1) return `${token?.feminin ? 'une' : 'un'} ${name}${body}`;
  return `${count === 2 ? 'deux' : count} ${many}${body}`;
}

/**
 * Ce que joue un politique doré : le moteur applique ses effets avec k = 2 (`power()` dans
 * recruit.ts et combat.ts). Le texte dit ce qui arrive vraiment, nombres doublés compris.
 */
function goldenEffect(e: Effect): Effect {
  switch (e.do) {
    case 'buff':
    case 'buff_par_allie':
    case 'buff_par_camp':
    case 'buff_par_ralliement':
    case 'camp_buff':
    case 'boutique_buff':
    case 'tract_bonus':
    case 'compteur':
      return { ...e, atk: e.atk * 2, hp: e.hp * 2 };
    case 'budget':
    case 'degats':
    case 'actualisations_gratuites':
    case 'pari_defaite':
    case 'scandale_plus':
      return { ...e, value: e.value * 2 };
    case 'invoquer':
    case 'carte':
      return { ...e, count: e.count * 2 };
    default:
      return e;
  }
}

/** L'action, à l'infinitif ou conjuguée, sans le déclencheur. `golden` : ce que fait un politique doré. */
function action(raw: Effect, onSpell: boolean, golden = false): string {
  const e = golden ? goldenEffect(raw) : raw;
  const self = e.to === 'soi';
  const dest = who(e.to, e.camp, onSpell);
  const twice = golden ? 'deux fois ' : '';
  switch (e.do) {
    case 'buff':
      return self ? `gagne ${stats(e.atk, e.hp)}` : `donne ${stats(e.atk, e.hp)} ${to(dest)}`;
    case 'buff_par_allie':
      return self ? `gagne ${stats(e.atk, e.hp)} par autre allié` : `donne ${stats(e.atk, e.hp)} par autre allié ${to(dest)}`;
    case 'buff_par_camp':
      return self ? `gagne ${stats(e.atk, e.hp)} par camp différent sur votre plateau` : `donne ${stats(e.atk, e.hp)} par camp différent ${to(dest)}`;
    case 'buff_par_ralliement':
      return `${dest === 'vos politiques' ? 'vos politiques gagnent' : `${dest} gagne`} ${stats(e.atk, e.hp)} par **Ralliement** reçu`;
    case 'jouer_tract':
      return `joue un **Tract**${golden ? ' doublé' : ''} sur ${self ? 'lui' : dest === 'ses voisins' ? 'chacun de ses voisins' : dest.startsWith('vos ') ? `chacun de ${dest}` : dest}`;
    case 'degats':
      return `inflige ${e.value} dégât${e.value > 1 ? 's' : ''} ${to(dest)}`;
    case 'invoquer':
      return `invoque ${tokenText(e.token, e.count)}`;
    case 'budget':
      return `gagnez ${e.value} budget${e.plus_tard ? ' à la prochaine manche' : ''}`;
    case 'mot_cle':
      return self ? `gagne ${keyword(e.keyword)}` : `donne ${keyword(e.keyword)} ${to(dest)}`;
    case 'retirer':
      return `retire ${keyword(e.keyword)} ${to(dest)}`;
    case 'basculer':
      return `donne ${keyword(e.keyword)} ${to(dest)}, ou le lui retire s'il l'a`;
    case 'exiler':
      return `retire ${dest} du combat`;
    case 'transmettre':
      return e.tout ? `donne ${twice}ses stats ${to(dest)}` : `donne ${twice}son attaque ${to(dest)}`;
    case 'carte':
      if (e.card === 'tract') return `ajoutez ${plural(e.count, 'un **Tract**', '**Tracts**')} à votre main`;
      if (e.card === 'sort_aleatoire') return e.count > 1 ? `ajoutez ${e.count === 2 ? 'deux' : e.count} sorts au hasard à votre main` : 'ajoutez un sort au hasard à votre main';
      if (e.card === 'copie') return e.count > 1 ? `ajoutez ${e.count === 2 ? 'deux' : e.count} copies de ce politique à votre main` : 'ajoutez une copie de ce politique à votre main';
      if (SPELL_BY_ID[e.card]) return `ajoutez ${e.count > 1 ? `${e.count === 2 ? 'deux' : e.count} sorts` : 'le sort'} ${cardName(e.card)} à votre main`;
      return `ajoutez ${plural(e.count, cardName(e.card), cardName(e.card))} à votre main`;
    case 'decouvrir': {
      const again = golden ? ', deux fois' : '';
      if (e.quoi === 'sort') return `**découvrez** un sort${again}`;
      const tier = e.echelon === 1 ? ' de l\'échelon au-dessus du vôtre' : e.echelon === 0 ? ' de votre échelon' : '';
      if (e.declencheur) return `**découvrez** un politique à **${TRIGGER_WORD[e.declencheur] ?? e.declencheur}**${tier}${again}`;
      return `**découvrez** un politique${e.camp ? ` ${CAMP_OF[e.camp]}` : ''}${tier}${again}`;
    }
    case 'camp_buff': {
      const group = e.card ? `vos ${TOKENS[e.card]?.name ?? e.card}s` : e.camp ? `vos ${CAMP_MANY[e.camp]}` : 'vos politiques';
      return `${group}, partout, gagnent ${stats(e.atk, e.hp)} pour le reste de la partie`;
    }
    case 'boutique_buff':
      return `les ${e.camp ? CAMP_MANY[e.camp] : 'politiques'} de la boutique ont ${stats(e.atk, e.hp)} pour le reste de la partie`;
    case 'tract_bonus':
      return `vos **Tracts** donnent ${stats(e.atk, e.hp)} de plus pour le reste de la partie`;
    case 'debaucher': {
      const which = `**débauchez** le plus ${e.pick === 'plus_fort' ? 'fort' : 'faible'} de la boutique`;
      return self ? `${which}, et gagne ${twice}ses stats` : `${which} : ${dest} gagne ${twice}ses stats`;
    }
    case 'dorer':
      return `rend doré ${dest} d'échelon ${e.maxTier} ou moins`;
    case 'detruire':
      return `détruisez ${dest}`;
    case 'sacrifier':
      return `détruisez ${dest} et **découvrez** un politique de son camp`;
    case 'declencher':
      return `déclenche ${e.trigger === 'fin_tour' ? 'la ' : 'l\''}**${TRIGGER_WORD[e.trigger]}** ${of(dest)}`;
    case 'doubler':
      return `vos **${TRIGGER_WORDS[e.trigger]}** se déclenchent ${golden ? 'trois' : 'deux'} fois`;
    case 'compteur':
      return `a ${stats(e.atk, e.hp)} par ${COUNTER_TEXT[e.compteur]} cette partie`;
    case 'scandale_plus':
      return e.value > 1 ? `il faut ${e.value} casseroles de plus à vos politiques pour faire scandale` : 'il faut une casserole de plus à vos politiques pour faire scandale';
    case 'actualiser':
      return (e.count ?? 1) > 1 ? `actualisez la boutique ${e.count} fois` : 'actualisez la boutique';
    case 'actualisations_gratuites':
      return e.value > 1 ? `vos ${e.value} prochaines actualisations sont gratuites` : 'votre prochaine actualisation est gratuite';
    case 'budget_max':
      return `votre budget maximum augmente de ${e.value}`;
    case 'oublier':
      return 'le peuple oublie tout de suite le scandale le plus long de vos politiques. Sous bracelet, il ne bouge plus et ne se renvoie pas avant la prochaine manche';
    case 'pari_defaite':
      return `si vous perdez le prochain combat, gagnez ${e.value} budget`;
    case 'congres':
      if (self) return e.when === 'actualise' ? 'elle ne propose que des politiques de son camp' : 'actualisez la boutique avec des politiques de son camp';
      return `actualisez la boutique avec des politiques du camp ${dest === 'un politique' ? 'd\'un politique' : `de ${dest}`}`;
    case 'butin':
      return `donne ${twice}${e.part === 'pv' ? 'les PV max' : 'les stats'} de sa victime ${to(dest)}`;
  }
}

/** Ce qui ouvre le texte : un mot-clé en gras suivi de « : », ou une proposition. */
function prefix(e: Effect): string {
  switch (e.when) {
    case 'annonce':
      return '**Annonce** : ';
    case 'fin_tour':
      return '**Fin de tour** : ';
    case 'debut_tour':
      return 'Au début de votre tour, ';
    case 'joue':
      return e.camp ? `Quand vous jouez un ${CAMP_ONE[e.camp]}, ` : 'Quand vous jouez un politique, ';
    case 'vente':
      return '**Vente** : ';
    case 'vente_allie':
      return 'Quand vous renvoyez un autre politique, ';
    case 'sort':
      return e.card === 'tract' ? 'Après que vous lancez un **Tract**, ' : 'Après que vous lancez un sort, ';
    case 'actualise':
      return 'Quand vous actualisez la boutique, ';
    case 'debauche':
      return 'Après que vous **débauchez**, ';
    case 'rallie':
      return 'Après que vous ralliez un politique, ';
    case 'casserole_recue':
      return 'Quand un allié reçoit une casserole, ';
    case 'depense':
      return `Chaque fois que vous dépensez ${e.n ?? 5} budget, `;
    case 'celebration':
      return '**Célébration** : ';
    case 'droit_de_reponse':
      return '**Droit de réponse** : ';
    case 'debut_combat':
      return '**49.3** : ';
    case 'heritage':
      return '**Héritage** : ';
    case 'riposte':
      return 'Après avoir subi des dégâts, s\'il survit, ';
    case 'meeting':
      return 'Quand il attaque, ';
    case 'tue':
      return 'Quand il tue un ennemi en attaquant et survit, ';
    case 'revanche':
      if (e.card) return `Après la mort d'un ${TOKENS[e.card]?.name ?? e.card} allié, `;
      return (e.n ?? 1) > 1 ? `Après la mort de ${e.n} alliés, ` : 'Après la mort d\'un allié, ';
    case 'immunite_perdue':
      return 'Après qu\'un allié perd son **Immunité**, ';
    case 'aura':
      return '';
  }
}

function capitalize(text: string): string {
  const i = text.startsWith('**') ? 2 : 0;
  return text.slice(0, i) + text.charAt(i).toUpperCase() + text.slice(i + 1);
}

function suffix(e: Effect): string {
  const parts: string[] = [];
  if (e.perma) parts.push(' pour de bon');
  if (e.once === 'combat') parts.push('. Une fois par combat');
  if (e.once === 'manche') parts.push('. Une fois par manche');
  return parts.join('');
}

/** Le texte d'un effet de politique ou de casserole, déclencheur compris. `golden` : porté par un politique doré. */
export function describeEffect(effect: Effect, golden = false): string {
  const head = prefix(effect);
  const body = action(effect, false, golden) + suffix(effect);
  return `${head ? head + body : capitalize(body)}.`;
}

/** Le texte d'un sort : ses effets jouent quand on le lance, sans déclencheur. */
export function describeSpell(spell: Spell): string {
  return `${capitalize(spell.effects.map((e) => action(e, true)).join(', et '))}.`;
}

/**
 * Les lignes de règle d'un politique : ses mots-clés, puis ses effets regroupés par déclencheur.
 * `card.golden` est la propriété « Toujours doré » de la carte ; `isGolden`, l'état du politique
 * montré : doré, ses effets jouent deux fois plus fort, et son texte le dit.
 */
export function cardRuleLines(card: Pick<Card, 'keywords' | 'effects' | 'golden'>, { isGolden = false }: { isGolden?: boolean } = {}): string[] {
  const lines: string[] = [];
  const keywords = (card.keywords ?? []).map((k) => `${keyword(k)}.`);
  if (card.golden) keywords.unshift('Toujours doré.');
  if (keywords.length) lines.push(keywords.join(' '));
  const effects = card.effects ?? [];
  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    const previous = effects[i - 1];
    // Deux effets du même déclencheur se lisent en une phrase ; un effet répété se lit « deux fois ».
    if (previous && JSON.stringify(previous) === JSON.stringify(e)) {
      lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}, deux fois.`;
    } else if (previous && previous.when === e.when && prefix(e) !== '') {
      const last = lines[lines.length - 1].slice(0, -1);
      const next = action(e, false, isGolden);
      // « donne X à vos politiques » puis « donne Y à vos politiques » : « donne X et Y à vos politiques ».
      const shared = / (à [^,]+)$/.exec(last)?.[1];
      if (shared && next.startsWith('donne ') && next.endsWith(` ${shared}`) && !suffix(e)) {
        lines[lines.length - 1] = `${last.slice(0, -(shared.length + 1))} et ${next.slice(6, -(shared.length + 1))} ${shared}.`;
      } else {
        lines[lines.length - 1] = `${last}, et ${next}${suffix(e)}.`;
      }
    } else {
      lines.push(describeEffect(e, isGolden));
    }
  }
  return lines;
}
