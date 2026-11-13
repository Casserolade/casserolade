import type {
  Camp,
  CombatEvent,
  CombatPersist,
  CombatResult,
  CombatSide,
  CombatUnit,
  Context,
  Effect,
  HeroMods,
  Keyword,
  Minion,
  Params,
  Rng,
} from './types.ts';
import { MAX_STAT, cardOf, effectPower, makeMinion, makeToken } from './minion.ts';
import { relaunchable } from './relaunch.ts';
import { isCamp as isCampOf } from './camps.ts';
import { CASSEROLE_BY_ID } from '../data/casseroles.ts';

const MAX_ATTACKS = 400;
/** Des ripostes qui se répondent (deux casseroles à riposte face à face) s'arrêtent là, quoi qu'il arrive. */
const MAX_RIPOSTES = 200;

interface Unit extends Minion {
  attacked: boolean;
  /**
   * Le politique du plateau qu'il incarne : lui-même, ou celui dont il est la réincarnation (Retour en politique). Ses
   * gains pour de bon, ses effets « une fois par combat » et ses relances suivent ce politique-là, pas l'incarnation.
   */
  origin: number;
  /** Bonus de solitude compris dans atk et hp. */
  bonus: number;
  /** Ses stats sur le plateau, avant le bonus de solitude et les éclaboussures : ce que le combat montre d'abord. */
  board: { atk: number; hp: number };
  /** Morts alliées comptées pour la Revanche. */
  avenge: number;
  /** Les PV les plus hauts atteints : ce que rapporte un butin. */
  peak: number;
}

interface Side {
  index: 0 | 1;
  units: Unit[];
  mods: HeroMods;
  hp: number;
  tract: { atk: number; hp: number };
  deathRetourUsed: boolean;
  deathTransmitUsed: boolean;
  polemiqueResistUsed: boolean;
  /** Un seul exil par joueur et par combat, quel que soit le nombre de 49.3 qui exilent (10 novembre 2026). */
  exileUsed: boolean;
  penalty: number;
  persist: CombatPersist;
  /** Gains de camp du joueur, et ceux obtenus pendant ce combat : les serviteurs invoqués en profitent. */
  campBuffs: { camp?: Camp; card?: string; atk: number; hp: number }[];
}

interface Battle {
  sides: [Side, Side];
  log: CombatEvent[];
  logging: boolean;
  nextUid: number;
  /** Les serviteurs dont l'uid est en dessous viennent du plateau : leurs gains permanents comptent. */
  firstSummonUid: number;
  ctx: Context | null;
  /** Le hasard du combat : les cibles des attaques, et « au hasard » dans les effets. */
  rng: Rng;
  /** Les effets « une fois par combat » déjà joués : `uid:index`. */
  once: Set<string>;
  /** Les relances déjà faites pendant ce combat, une clé par relanceur et politique relancé (règle R4). */
  retriggered: Set<string>;
  /** La taille du plateau : les invocations s'arrêtent là, comme au recrutement. */
  boardSize: number;
  /** Les ripostes déjà jouées : une chaîne de ripostes s'arrête à MAX_RIPOSTES. */
  ripostes: number;
}

/**
 * Le seul bonus calculé au début du combat : celui d'un serviteur seul de son camp, apporté par une casserole. Un allié
 * Ni droite ni gauche est de son camp ; avec le Fer à cheval (`extremes`), les extrêmes sont un même camp.
 */
export function combatBonuses(minions: Minion[], extremes = false): number[] {
  return minions.map((m) => {
    const alone = m.aloneBonus > 0 && !minions.some((o) => o !== m && isCampOf(o, m.camp, extremes));
    return alone ? m.aloneBonus : 0;
  });
}

/**
 * L'éclaboussure d'un scandale : un politique en scandale dont une casserole éclabousse fait perdre -N/-N à chacun de
 * ses voisins, le temps du combat (13 novembre 2026). Le placement compte, et le cadenas du scandale aussi.
 */
export function scandalSplash(minions: Minion[]): number[] {
  return minions.map((_, i) => (minions[i - 1]?.scandal?.splash ?? 0) + (minions[i + 1]?.scandal?.splash ?? 0));
}

function toSide(index: 0 | 1, s: CombatSide, extremes: boolean): Side {
  const bonuses = combatBonuses(s.minions, extremes);
  const splashes = scandalSplash(s.minions);
  const units: Unit[] = s.minions.map((m, i) => {
    const extra = bonuses[i];
    const atk = Math.max(0, m.atk + extra - splashes[i]);
    const hp = Math.max(1, m.hp + extra - splashes[i]);
    return { ...m, keywords: [...m.keywords], effects: m.effects, atk, hp, attacked: false, origin: m.uid, bonus: extra, board: { atk: m.atk, hp: m.hp }, avenge: 0, peak: hp };
  });
  return {
    index,
    units,
    mods: s.mods,
    hp: s.hp,
    tract: s.tract ?? { atk: 1, hp: 1 },
    deathRetourUsed: false,
    deathTransmitUsed: false,
    polemiqueResistUsed: false,
    exileUsed: false,
    penalty: 0,
    persist: { buffs: [], handBuffs: [], campBuffs: [], cards: [], copies: [], doubles: [], tractBonus: { atk: 0, hp: 0 }, tracts: 0 },
    campBuffs: [...(s.campBuffs ?? [])],
  };
}

function has(u: Minion, k: Keyword): boolean {
  return u.keywords.includes(k);
}

function grant(b: Battle, u: Minion, k: Keyword): void {
  if (has(u, k)) return;
  u.keywords.push(k);
  if (b.logging) b.log.push({ e: 'mot_cle', uid: u.uid, keyword: k, gain: true });
}

function lose(b: Battle, u: Minion, k: Keyword): void {
  if (!has(u, k)) return;
  u.keywords = u.keywords.filter((x) => x !== k);
  if (b.logging) b.log.push({ e: 'mot_cle', uid: u.uid, keyword: k, gain: false });
}

function addStats(b: Battle, side: Side, u: Unit, atk: number, hp: number, perma = false): void {
  if (atk === 0 && hp === 0) return;
  u.atk = Math.min(MAX_STAT, u.atk + atk);
  u.hp = Math.min(MAX_STAT, u.hp + hp);
  u.peak = Math.max(u.peak, u.hp);
  if (b.logging) b.log.push({ e: 'stats', uid: u.uid, atk: u.atk, hp: u.hp });
  if (perma && u.origin < b.firstSummonUid) side.persist.buffs.push({ uid: u.origin, atk, hp });
}

/** Ses effets tels que le client les lit : chacun dit sa puissance, l'identité des effets ne voyage pas. */
function withPower(u: Minion): Effect[] {
  return u.effects.map((e) => ({ ...e, power: effectPower(u, e) }));
}

function toCombatUnit(u: Unit): CombatUnit {
  return {
    uid: u.uid,
    cardId: u.cardId,
    name: u.name,
    camp: u.camp,
    tier: u.tier,
    atk: u.atk,
    hp: u.hp,
    keywords: [...u.keywords],
    golden: u.golden,
    token: u.token,
    noAttack: u.noAttack,
    casseroles: [...u.casseroles],
    effects: withPower(u),
    bonus: u.bonus,
    ...(u.scandal ? { scandal: true } : {}),
  };
}

function snapshot(sides: [Side, Side]): [CombatUnit[], CombatUnit[]] {
  return [sides[0].units.map(toCombatUnit), sides[1].units.map(toCombatUnit)];
}

/**
 * L'ouverture du journal : les plateaux sans le bonus de solitude des casseroles, puis ce bonus,
 * politique par politique. La Fin de tour, elle, se joue sur la table de recrutement, avant le combat.
 */
function logOpening(b: Battle, first: 0 | 1): void {
  const seen = b.sides.map((side) => side.units.map((u) => ({ ...toCombatUnit(u), atk: u.board.atk, hp: u.board.hp })));
  b.log.push({ e: 'debut', first, sides: [seen[0], seen[1]] });
  b.sides.forEach((side) => {
    for (const u of side.units) {
      if (u.bonus <= 0) continue;
      const casserole = u.casseroles.find((id) => (CASSEROLE_BY_ID[id]?.aloneBonus ?? 0) > 0);
      const effect: Effect = { when: 'debut_combat', to: 'soi', do: 'buff', atk: u.bonus, hp: u.bonus };
      b.log.push({ e: 'effet', uid: u.uid, when: 'debut_combat', effect, ...(casserole ? { casserole } : {}) });
      b.log.push({ e: 'stats', uid: u.uid, atk: u.board.atk + u.bonus, hp: u.board.hp + u.bonus });
    }
    // Les éclaboussures des scandales : la source, sa casserole, puis ses voisins à leurs stats du combat.
    side.units.forEach((u, i) => {
      const splash = u.scandal?.splash ?? 0;
      if (splash <= 0) return;
      const casserole = u.casseroles.slice(u.oublie).find((id) => (CASSEROLE_BY_ID[id]?.splash ?? 0) > 0);
      const effect: Effect = { when: 'debut_combat', to: 'voisins', do: 'buff', atk: -splash, hp: -splash };
      b.log.push({ e: 'effet', uid: u.uid, when: 'debut_combat', effect, ...(casserole ? { casserole } : {}) });
      for (const n of [side.units[i - 1], side.units[i + 1]]) {
        if (!n) continue;
        b.log.push({ e: 'stats', uid: n.uid, atk: n.atk, hp: n.hp });
      }
    });
  });
}

function logEffect(b: Battle, u: Unit, eff: Effect): void {
  const casserole = u.casseroles.find((id) => CASSEROLE_BY_ID[id]?.effects?.includes(eff) || CASSEROLE_BY_ID[id]?.ownerBonus.effects?.includes(eff));
  b.log.push({ e: 'effet', uid: u.uid, when: eff.when, effect: { ...eff, power: effectPower(u, eff) }, ...(casserole ? { casserole } : {}) });
}

function otherSide(b: Battle, side: Side): Side {
  return side === b.sides[0] ? b.sides[1] : b.sides[0];
}

/** Un coup qui touche. Faux s'il est annulé par l'Immunité. */
function dealDamage(b: Battle, side: Side, u: Unit, amount: number): boolean {
  if (amount <= 0) return false;
  if (has(u, 'immunite')) {
    u.keywords = u.keywords.filter((x) => x !== 'immunite');
    if (b.logging) b.log.push({ e: 'immunite', uid: u.uid });
    for (const other of [...side.units]) {
      if (other.hp <= 0) continue;
      for (const eff of other.effects) {
        if (eff.when === 'immunite_perdue') runEffect(b, side, other, side.units.indexOf(other), eff, u);
      }
    }
    return false;
  }
  u.hp -= amount;
  if (b.logging) b.log.push({ e: 'degats', uid: u.uid, value: amount, hp: u.hp });
  return true;
}

/** Les alliés visés par un effet, toujours sans hasard. */
function allyTargets(b: Battle, side: Side, self: Unit, index: number, eff: Effect, trigger?: Unit): Unit[] {
  const alive = side.units.filter((u) => u.hp > 0);
  const isCamp = (u: Minion, camp: Camp) => isCampOf(u, camp, b.ctx?.extremesAllied ?? false);
  switch (eff.to) {
    case 'soi':
      return [self];
    case 'voisins': {
      // Un mort retiré du plateau joue son Héritage depuis la place d'avant (`index`) : ses voisins
      // sont alors à `index` et `index + 1`.
      const at = side.units.indexOf(self);
      const around = at >= 0 ? [side.units[at - 1], side.units[at + 1]] : [side.units[index], side.units[index + 1]];
      return around.filter((u) => u && u.hp > 0);
    }
    case 'meme_camp':
      return alive.filter((u) => isCamp(u, self.camp));
    case 'camp':
      return alive.filter((u) => isCamp(u, eff.camp ?? self.camp));
    case 'autres_camp':
      return alive.filter((u) => u !== self && isCamp(u, eff.camp ?? self.camp));
    case 'allies':
      return alive;
    case 'autres':
      return alive.filter((u) => u !== self);
    case 'premier_allie':
      return alive.slice(0, 1);
    case 'dernier_allie':
      return alive.slice(-1);
    case 'allie_suivant': {
      const next = side.units.slice(index + 1).find((u) => u.hp > 0 && u !== self) ?? alive.find((u) => u !== self);
      return next ? [next] : [];
    }
    case 'aleatoire': {
      // Un mot-clé au hasard va à un allié qui ne l'a pas encore.
      const pool = alive.filter((u) => u !== self && (!eff.camp || isCamp(u, eff.camp)) && !(eff.do === 'mot_cle' && has(u, eff.keyword)));
      return pool.length > 0 ? [b.rng.pick(pool)] : [];
    }
    case 'dores':
      return alive.filter((u) => u.golden);
    case 'declencheur':
      return trigger && trigger.hp > 0 ? [trigger] : [];
    default:
      return [];
  }
}

function foeTargets(b: Battle, enemy: Side, eff: Effect): Unit[] {
  const alive = enemy.units.filter((u) => u.hp > 0);
  switch (eff.to) {
    case 'ennemi_aleatoire':
      return alive.length > 0 ? [b.rng.pick(alive)] : [];
    case 'premier_ennemi':
      return alive.slice(0, 1);
    case 'dernier_ennemi':
      return alive.slice(-1);
    case 'ennemi_plus_faible': {
      // Le moins fort : la plus petite somme attaque + PV ; à égalité, le plus à gauche.
      const weakest = alive.reduce<Unit | null>((low, u) => (!low || u.atk + u.hp < low.atk + low.hp ? u : low), null);
      return weakest ? [weakest] : [];
    }
    case 'tous_ennemis':
      return alive;
    default:
      return [];
  }
}

/**
 * Donne un mot-clé en combat. Rejoué (doré, Mitterrand, relance), il ne se perd pas sur un allié qui l'a déjà : il passe
 * à un autre allié vivant au hasard qui ne l'a pas.
 */
function giveKeyword(b: Battle, side: Side, self: Unit, u: Unit, keyword: Keyword, replay: boolean): void {
  if (!has(u, keyword)) return grant(b, u, keyword);
  if (!replay) return;
  const lacking = side.units.filter((x) => x.hp > 0 && x !== self && !has(x, keyword));
  if (lacking.length > 0) grant(b, b.rng.pick(lacking), keyword);
}

/** `replay` : l'effet est rejoué (doré, Mitterrand, relance) ; un mot-clé déjà là passe alors à un autre allié. */
function runEffect(b: Battle, side: Side, self: Unit, index: number, eff: Effect, trigger?: Unit, replay = false): void {
  const enemy = otherSide(b, side);
  const k = effectPower(self, eff);
  if (eff.once === 'combat') {
    // Sa réincarnation est le même politique : ce qu'il a déjà joué une fois dans le combat ne rejoue pas.
    const key = `${self.origin}:${self.effects.indexOf(eff)}`;
    if (b.once.has(key)) return;
    b.once.add(key);
  }
  // Un seul exil par joueur et par combat : les autres 49.3 qui exilent se taisent.
  if (eff.do === 'exiler' && side.exileUsed) return;
  if (b.logging) logEffect(b, self, eff);
  // La main ne combat pas : ce qui la vise est mis de côté et appliqué après le combat.
  if (eff.to === 'main' || eff.to === 'toute_la_main') {
    const all = eff.to === 'toute_la_main';
    if (eff.do === 'buff') side.persist.handBuffs.push({ all, atk: eff.atk * k, hp: eff.hp * k });
    if (eff.do === 'jouer_tract') side.persist.handBuffs.push({ all, atk: side.tract.atk * k, hp: side.tract.hp * k });
    if (eff.do === 'butin' && trigger) side.persist.handBuffs.push({ all, atk: eff.part === 'tout' ? trigger.atk * k : 0, hp: trigger.peak * k });
    return;
  }
  switch (eff.do) {
    case 'butin':
      if (!trigger) break;
      for (const u of allyTargets(b, side, self, index, { ...eff, to: eff.to === 'declencheur' ? 'soi' : eff.to }, trigger)) {
        addStats(b, side, u, eff.part === 'tout' ? trigger.atk * k : 0, trigger.peak * k, eff.perma);
      }
      break;
    case 'buff':
      for (const u of allyTargets(b, side, self, index, eff, trigger)) addStats(b, side, u, eff.atk * k, eff.hp * k, eff.perma);
      break;
    case 'buff_par_allie': {
      const n = side.units.filter((u) => u.hp > 0 && u !== self).length;
      for (const u of allyTargets(b, side, self, index, eff, trigger)) addStats(b, side, u, eff.atk * n * k, eff.hp * n * k, eff.perma);
      break;
    }
    case 'buff_par_camp': {
      const n = new Set(side.units.filter((u) => u.hp > 0 && u.camp !== 'civile').map((u) => u.camp)).size;
      for (const u of allyTargets(b, side, self, index, eff, trigger)) addStats(b, side, u, eff.atk * n * k, eff.hp * n * k, eff.perma);
      break;
    }
    case 'jouer_tract':
      // Un Tract joué par un effet compte comme un sort lancé, en combat aussi (règle R5) : compté après le combat.
      for (const u of allyTargets(b, side, self, index, eff, trigger)) {
        addStats(b, side, u, side.tract.atk * k, side.tract.hp * k, eff.perma);
        side.persist.tracts++;
      }
      break;
    case 'camp_buff': {
      const gain = { camp: eff.camp, card: eff.card, atk: eff.atk * k, hp: eff.hp * k };
      side.persist.campBuffs.push(gain);
      side.campBuffs.push(gain);
      for (const u of side.units) {
        if (u.hp > 0 && (!eff.camp || isCampOf(u, eff.camp, b.ctx?.extremesAllied ?? false)) && (!eff.card || u.cardId === eff.card)) addStats(b, side, u, gain.atk, gain.hp);
      }
      break;
    }
    case 'degats':
      // Des dégâts d'effet font riposter, comme ceux d'une attaque : « après avoir subi des dégâts, s'il survit ».
      for (const u of foeTargets(b, enemy, eff)) {
        if (dealDamage(b, enemy, u, eff.value * k) && u.hp > 0) fireRiposte(b, enemy, u);
      }
      break;
    case 'mot_cle':
      // Doré, il le donne deux fois : la deuxième, comme un effet rejoué, va à un autre allié si la cible l'a déjà.
      for (let i = 0; i < k; i++) {
        for (const u of allyTargets(b, side, self, index, eff, trigger)) giveKeyword(b, side, self, u, eff.keyword, replay || i > 0);
      }
      break;
    case 'retirer':
      for (const u of foeTargets(b, enemy, eff)) lose(b, u, eff.keyword);
      break;
    case 'exiler': {
      const gone = foeTargets(b, enemy, eff).slice(0, 1);
      side.exileUsed = true;
      // Retiré du combat sans mourir : pas d'Héritage ni de Retour en politique.
      if (b.logging) for (const u of gone) b.log.push({ e: 'exil', uid: u.uid });
      enemy.units = enemy.units.filter((u) => !gone.includes(u));
      break;
    }
    case 'transmettre':
      if (eff.to === 'allie_suivant') {
        transmit(b, side, self, index, eff.tout ?? false, k, eff.perma ?? false);
        break;
      }
      // À plusieurs cibles : Strauss-Kahn lègue ses stats à chacun de ses autres Socialistes.
      for (const u of allyTargets(b, side, self, index, eff, trigger)) {
        if (u !== self) addStats(b, side, u, Math.max(1, self.atk) * k, eff.tout ? Math.max(1, self.peak) * k : 0, eff.perma);
      }
      break;
    case 'invoquer':
      summon(b, side, self, index, eff.token, eff.count * k);
      break;
    case 'carte':
      for (let i = 0; i < eff.count * k; i++) {
        if (eff.card === 'copie') side.persist.copies.push(self.cardId);
        else side.persist.cards.push(eff.card);
      }
      break;
    case 'declencher':
      for (const u of allyTargets(b, side, self, index, eff, trigger)) {
        // Règle R4 : un relanceur ne relance pas deux fois le même politique dans le combat ; deux relanceurs s'additionnent.
        const key = `${self.origin}>${u.origin}`;
        if (u === self || b.retriggered.has(key)) continue;
        b.retriggered.add(key);
        const at = side.units.indexOf(u);
        // Doré, il joue deux fois ce qu'il relance ; une relance compte comme un effet rejoué. Les multiplicateurs
        // s'appliquent aussi à ce qui est relancé : Mitterrand vivant double les Héritages relancés (règle R18).
        const repeats = eff.trigger === 'heritage' ? repeatsOf(side.units, 'heritage') : 1;
        for (let i = 0; i < k * repeats; i++) {
          for (const other of relaunchable(u.effects, eff.trigger)) runEffect(b, side, u, at, other, undefined, true);
        }
      }
      break;
    case 'doubler_stats':
      // Doublez : tout de suite dans le combat, et pour de bon après s'il le dit (Hollande). Doré, deux fois.
      for (const u of allyTargets(b, side, self, index, eff, trigger)) {
        for (let i = 0; i < k; i++) {
          addStats(b, side, u, u.atk, u.hp);
          if (eff.perma && u.origin < b.firstSummonUid) side.persist.doubles.push(u.origin);
        }
      }
      break;
    case 'chaise_vide':
      summonChair(b, side, self, index, k);
      break;
    case 'detruire':
      // Censuré : il tombe, Immunité ou pas. Sa mort se résout avec les autres, Héritage et Retour compris.
      for (const u of allyTargets(b, side, self, index, eff, trigger)) {
        if (u.hp > 0) u.hp = 0;
      }
      break;
    case 'tract_bonus':
      // Pour le reste de la partie : les Tracts de ce combat en profitent déjà, et ceux d'après aussi.
      side.tract = { atk: side.tract.atk + eff.atk * k, hp: side.tract.hp + eff.hp * k };
      side.persist.tractBonus.atk += eff.atk * k;
      side.persist.tractBonus.hp += eff.hp * k;
      break;
    case 'buff_par_membre': {
      const n = side.units.filter((u) => u.hp > 0 && isCampOf(u, eff.camp ?? self.camp, b.ctx?.extremesAllied ?? false)).length;
      for (const u of allyTargets(b, side, self, index, eff, trigger)) addStats(b, side, u, eff.atk * n * k, eff.hp * n * k, eff.perma);
      break;
    }
    default:
      // Le reste ne se joue qu'au recrutement.
      break;
  }
}

/** Transmet son attaque (ou toutes ses stats) à l'allié suivant ; `perma` : il les garde après le combat (Jean-Marie Le Pen). */
function transmit(b: Battle, side: Side, self: Unit, index: number, all: boolean, k: number, perma = false): void {
  const next = side.units.slice(index + 1).find((u) => u.hp > 0) ?? side.units.find((u) => u.hp > 0 && u !== self);
  if (!next) return;
  const atk = Math.max(1, self.atk) * k;
  addStats(b, side, next, atk, all ? Math.max(1, self.peak) * k : 0, perma);
}

/** Les gains de camp du joueur qui valent pour ce nouveau venu : un jeton invoqué, une réincarnation. */
function campGains(b: Battle, side: Side, m: Minion): { atk: number; hp: number } {
  const total = { atk: 0, hp: 0 };
  for (const gain of side.campBuffs) {
    if ((!gain.camp || isCampOf(m, gain.camp, b.ctx?.extremesAllied ?? false)) && (!gain.card || m.cardId === gain.card)) {
      total.atk += gain.atk;
      total.hp += gain.hp;
    }
  }
  return total;
}

function summon(b: Battle, side: Side, self: Minion, index: number, tokenId: string, count: number): void {
  for (let i = 0; i < count; i++) {
    if (side.units.length >= b.boardSize + (side.mods.boardDelta ?? 0)) return;
    const m = makeToken(tokenId, self.camp, b.nextUid++);
    const gain = campGains(b, side, m);
    m.atk += gain.atk;
    m.hp += gain.hp;
    const unit: Unit = { ...m, attacked: false, origin: m.uid, bonus: 0, board: { atk: m.atk, hp: m.hp }, avenge: 0, peak: m.hp };
    const at = Math.min(index + 1 + i, side.units.length);
    side.units.splice(at, 0, unit);
    if (b.logging) b.log.push({ e: 'invocation', side: side.index, index: at, unit: toCombatUnit(unit) });
  }
}

/**
 * Giscard : une Chaise vide Porte-parole qui a son attaque et les PV les plus hauts qu'il ait eus, à sa place. Elle
 * tient ce qu'il tenait (13 novembre 2026 : à 0 d'attaque, elle ne servait presque à rien).
 */
function summonChair(b: Battle, side: Side, self: Unit, index: number, count: number): void {
  const before = side.units.length;
  summon(b, side, self, index, 'chaise_vide', count);
  for (const chair of side.units.slice(index + 1, index + 1 + (side.units.length - before))) {
    if (chair.cardId !== 'chaise_vide') continue;
    chair.atk = Math.max(chair.atk, self.atk);
    chair.hp = Math.max(chair.hp, self.peak);
    chair.peak = chair.hp;
    if (b.logging) b.log.push({ e: 'stats', uid: chair.uid, atk: chair.atk, hp: chair.hp });
  }
}

/** Combien de fois jouent les effets d'un déclencheur de ce camp : un multiplicateur vivant (Mitterrand, Macron) les double, les triple doré. */
function repeatsOf(units: Unit[], trigger: 'heritage' | 'celebration' | 'meeting' | 'debut_combat'): number {
  let count = 1;
  for (const u of units) {
    if (u.hp <= 0) continue;
    for (const eff of u.effects) {
      if (eff.when === 'aura' && eff.do === 'doubler' && eff.trigger === trigger) count = Math.max(count, effectPower(u, eff) > 1 ? 3 : 2);
    }
  }
  return count;
}

function fireAvenge(b: Battle, side: Side, dead: Unit): void {
  for (const u of [...side.units]) {
    if (u === dead || u.hp <= 0) continue;
    // `card` : seule la mort de ces serviteurs compte (Faure et les Suppléants).
    const avenges = u.effects.filter((eff) => eff.when === 'revanche' && (!eff.card || dead.cardId === eff.card));
    if (avenges.length === 0) continue;
    u.avenge++;
    for (const eff of avenges) {
      if (u.avenge % Math.max(1, eff.n ?? 1) === 0) runEffect(b, side, u, side.units.indexOf(u), eff);
    }
  }
}

/**
 * Le Retour en politique, comme la Réincarnation de Battlegrounds (13 novembre 2026) : le politique meurt pour de bon,
 * son Héritage joue (ses jetons prennent sa place), puis il se réincarne à la place où il est tombé, s'il reste de la
 * place sur le plateau. Il revient **comme sa carte nue**, avec 1 PV (décision du 13 novembre 2026, pour que l'Héritage
 * compte) : l'attaque de sa carte (doublée s'il est doré), ses mots-clés de carte sans Retour (sa Polémique, son
 * Immunité), ses seuls effets de carte. Ses gains, ses casseroles et ses Ralliements restent sur le plateau ; les gains
 * de camp du joueur lui donnent leur attaque, comme à un jeton. C'est une nouvelle incarnation : elle n'a pas encore
 * attaqué (règle R17).
 */
function reincarnate(b: Battle, side: Side, dead: Unit, at: number): boolean {
  if (side.units.length >= b.boardSize + (side.mods.boardDelta ?? 0)) return false;
  const card = cardOf(dead);
  const bare: Minion = { ...makeMinion(card, b.nextUid++), camp: dead.camp, golden: dead.golden };
  bare.keywords = bare.keywords.filter((k) => k !== 'retour');
  bare.atk = Math.min(MAX_STAT, card.atk * (dead.golden ? 2 : 1) + campGains(b, side, bare).atk);
  bare.hp = 1;
  const unit: Unit = { ...bare, attacked: false, origin: dead.origin, bonus: 0, board: { atk: bare.atk, hp: 1 }, avenge: 0, peak: 1 };
  const index = Math.max(0, Math.min(at, side.units.length));
  side.units.splice(index, 0, unit);
  if (b.logging) b.log.push({ e: 'retour', side: side.index, index, unit: toCombatUnit(unit), from: dead.uid });
  return true;
}

function resolveDeaths(b: Battle, order: [Side, Side]): void {
  for (let guard = 0; guard < 100; guard++) {
    let changed = false;
    for (const side of order) {
      for (let i = 0; i < side.units.length; i++) {
        const u = side.units[i];
        if (u.hp > 0) continue;
        changed = true;
        const ownRetour = has(u, 'retour');
        const comesBack = ownRetour || (side.mods.firstDeathRetour === true && !side.deathRetourUsed);
        if (b.logging) {
          b.log.push({ e: 'mort', uid: u.uid });
          if (u.hpLossOnDeath > 0) b.log.push({ e: 'penalite', uid: u.uid, side: side.index, value: u.hpLossOnDeath });
        }
        side.penalty += u.hpLossOnDeath;
        const repeats = repeatsOf(side.units, 'heritage');
        side.units.splice(i, 1);
        if (side.mods.firstDeathTransmit && !side.deathTransmitUsed) {
          side.deathTransmitUsed = true;
          transmit(b, side, u, i - 1, false, 1);
        }
        for (let r = 0; r < repeats; r++) {
          for (const eff of u.effects) if (eff.when === 'heritage') runEffect(b, side, u, i - 1, eff, undefined, r > 0);
        }
        // Les Revanches comptent sa mort avant qu'il revienne : sa réincarnation ne venge pas sa propre mort.
        fireAvenge(b, side, u);
        // Après son Héritage, il se réincarne là où il est tombé, s'il y a la place. Le pouvoir du héros ne se
        // consomme que s'il a servi.
        if (comesBack && reincarnate(b, side, u, i) && !ownRetour) side.deathRetourUsed = true;
        i--;
      }
    }
    if (!changed) return;
  }
}

function nextAttacker(side: Side): Unit | null {
  const can = (u: Unit) => u.atk > 0 && !u.noAttack && u.hp > 0;
  let u = side.units.find((x) => can(x) && !x.attacked);
  if (u) return u;
  for (const x of side.units) x.attacked = false;
  u = side.units.find(can);
  return u ?? null;
}

function pickTarget(b: Battle, enemy: Side): Unit | null {
  const alive = enemy.units.filter((u) => u.hp > 0);
  if (alive.length === 0) return null;
  const pool = alive.filter((u) => has(u, 'porte_parole'));
  // Les cibles sont tirées au hasard, sauf Porte-parole (décision du 2 novembre 2026).
  return b.rng.pick(pool.length > 0 ? pool : alive);
}

/** Les voisins vivants de la cible : un Coup de balai les touche aussi. */
function sweptNeighbours(side: Side, target: Unit): Unit[] {
  const alive = side.units.filter((u) => u.hp > 0);
  const at = alive.indexOf(target);
  return at < 0 ? [] : [alive[at - 1], alive[at + 1]].filter((u): u is Unit => Boolean(u));
}

function strike(b: Battle, atkSide: Side, defSide: Side, attacker: Unit, target: Unit): void {
  /**
   * La Polémique détruit le serviteur blessé, puis se perd, comme une toxine : au premier coup qui blesse, qu'il tue par
   * ses dégâts, par la Polémique, ou que la victime y résiste (règle R16). Une Immunité qui pare le coup la garde. Un
   * Coup de balai est un seul coup : sa Polémique détruit tous ceux qu'il blesse, puis se perd.
   */
  const wound = (from: Unit, to: Unit, toSide: Side, venom: boolean): boolean => {
    const hit = dealDamage(b, toSide, to, from.atk);
    if (!hit || !venom) return hit;
    if (to.hp > 0 && toSide.mods.firstPolemiqueResist && !toSide.polemiqueResistUsed) {
      toSide.polemiqueResistUsed = true;
      if (b.logging) b.log.push({ e: 'resiste', uid: to.uid });
    } else if (to.hp > 0) {
      to.hp = 0;
      if (b.logging) b.log.push({ e: 'polemique', uid: to.uid, from: from.uid });
    }
    return hit;
  };
  const landed = (from: Unit, to: Unit, toSide: Side): boolean => {
    const hit = wound(from, to, toSide, has(from, 'polemique'));
    if (hit) lose(b, from, 'polemique');
    return hit;
  };
  const attackerIndex = atkSide.units.indexOf(attacker);
  // « Quand il attaque » : Mélenchon vivant les joue deux fois (re-spécification du 7 novembre 2026).
  const meetings = attacker.effects.some((eff) => eff.when === 'meeting') ? repeatsOf(atkSide.units, 'meeting') : 1;
  for (let r = 0; r < meetings && attacker.hp > 0; r++) {
    for (const eff of attacker.effects) {
      if (eff.when === 'meeting') runEffect(b, atkSide, attacker, atkSide.units.indexOf(attacker), eff, undefined, r > 0);
    }
  }
  if (attacker.hp <= 0 || target.hp <= 0 || attackerIndex < 0) return;
  if (b.logging) b.log.push({ e: 'attaque', from: attacker.uid, to: target.uid });
  // Le Coup de balai touche aussi les voisins de la cible, du même coup. Seule la cible riposte.
  const swept = has(attacker, 'balai') ? sweptNeighbours(defSide, target) : [];
  const venom = has(attacker, 'polemique');
  const hitTarget = wound(attacker, target, defSide, venom);
  const hitSwept = swept.filter((u) => wound(attacker, u, defSide, venom));
  if (venom && (hitTarget || hitSwept.length > 0)) lose(b, attacker, 'polemique');
  const hitAttacker = landed(target, attacker, atkSide);
  if (hitTarget && target.hp > 0) fireRiposte(b, defSide, target);
  for (const u of hitSwept) if (u.hp > 0) fireRiposte(b, defSide, u);
  if (hitAttacker && attacker.hp > 0) fireRiposte(b, atkSide, attacker);
  if (hitTarget && target.hp <= 0 && attacker.hp > 0) {
    for (const eff of attacker.effects) {
      if (eff.when === 'tue') runEffect(b, atkSide, attacker, atkSide.units.indexOf(attacker), eff, target);
    }
  }
}

function fireRiposte(b: Battle, side: Side, u: Unit): void {
  if (b.ripostes >= MAX_RIPOSTES || !u.effects.some((eff) => eff.when === 'riposte')) return;
  b.ripostes++;
  const index = side.units.indexOf(u);
  for (const eff of u.effects) {
    if (eff.when === 'riposte') runEffect(b, side, u, index, eff);
  }
}

function startOfCombat(b: Battle, side: Side, order: [Side, Side]): void {
  const front = side.units[0];
  if (front) {
    if (side.mods.frontPolemique) grant(b, front, 'polemique');
    if (side.mods.frontHp) addStats(b, side, front, 0, side.mods.frontHp);
  }
  // Borne vivante au début du combat : vos 49.3 se déclenchent deux fois (13 novembre 2026).
  const repeats = repeatsOf(side.units, 'debut_combat');
  for (const u of [...side.units]) {
    // Tombé sous un 49.3 adverse, il ne joue pas le sien ; censuré par le sien (Barnier), il le joue jusqu'au bout.
    if (u.hp <= 0 || !side.units.includes(u)) continue;
    for (let r = 0; r < repeats; r++) {
      for (const eff of u.effects) {
        if (eff.when === 'debut_combat') runEffect(b, side, u, side.units.indexOf(u), eff, undefined, r > 0);
      }
    }
  }
  resolveDeaths(b, order);
}

export interface CombatOptions {
  params: Params;
  ctx: Context | null;
  /** Les cibles du combat, l'égalité parfaite d'initiative, et « au hasard » dans les effets. */
  rng: Rng;
  log?: boolean;
  uidStart?: number;
}

function initiative(a: CombatSide, b: CombatSide, rng: Rng): 0 | 1 {
  if (a.minions.length !== b.minions.length) return a.minions.length > b.minions.length ? 0 : 1;
  if (a.hp !== b.hp) return a.hp < b.hp ? 0 : 1;
  return rng.int(2) as 0 | 1;
}

/**
 * Résout un combat. Les attaquants jouent de gauche à droite, et visent un ennemi au hasard,
 * sauf Porte-parole. À graine égale, le combat est le même.
 */
export function resolveCombat(a: CombatSide, c: CombatSide, opts: CombatOptions): CombatResult {
  const first = initiative(a, c, opts.rng);
  const extremes = opts.ctx?.extremesAllied ?? false;
  const sides: [Side, Side] = [toSide(0, a, extremes), toSide(1, c, extremes)];
  const uidStart = opts.uidStart ?? 1_000_000;
  const b: Battle = {
    sides,
    log: [],
    logging: opts.log ?? false,
    nextUid: uidStart,
    firstSummonUid: uidStart,
    ctx: opts.ctx,
    rng: opts.rng,
    once: new Set(),
    retriggered: new Set(),
    boardSize: opts.params.boardSize,
    ripostes: 0,
  };
  const order: [Side, Side] = first === 0 ? [sides[0], sides[1]] : [sides[1], sides[0]];
  if (b.logging) logOpening(b, first);

  startOfCombat(b, order[0], order);
  startOfCombat(b, order[1], order);

  let turn = 0;
  let idle = 0;
  for (let n = 0; n < MAX_ATTACKS; n++) {
    if (sides[0].units.length === 0 || sides[1].units.length === 0) break;
    const side = order[turn];
    const enemy = order[1 - turn];
    turn = 1 - turn;
    const attacker = nextAttacker(side);
    if (!attacker) {
      if (++idle >= 2) break;
      continue;
    }
    idle = 0;
    const swings = has(attacker, 'cumul') ? 2 : 1;
    attacker.attacked = true;
    // Tombé pendant ses coups, il s'arrête : sa réincarnation attaquera à son tour, comme neuve (règle R17).
    for (let s = 0; s < swings && attacker.hp > 0 && side.units.includes(attacker); s++) {
      const target = pickTarget(b, enemy);
      if (!target) break;
      strike(b, side, enemy, attacker, target);
      resolveDeaths(b, order);
    }
  }

  const alive: [number, number] = [sides[0].units.length, sides[1].units.length];
  let winner: 0 | 1 | null = null;
  if (alive[0] > 0 && alive[1] === 0) winner = 0;
  else if (alive[1] > 0 && alive[0] === 0) winner = 1;

  if (b.logging) b.log.push({ e: 'fin', winner, sides: snapshot(sides) });

  const celebrant = winner === null ? null : pickCelebrant(sides[winner]);
  // Macron double les Célébrations s'il a survécu, comme Mitterrand ne double les Héritages que vivant.
  const celebrationRepeats = winner === null ? 1 : repeatsOf(sides[winner].units, 'celebration');
  const celebrants = winner === null ? [] : sides[winner].units.filter((u) => u.hp > 0 && u.effects.some((eff) => eff.when === 'celebration'));
  const responder = winner === null ? null : pickResponder(winner === 0 ? 1 : 0, winner === 0 ? c : a);
  const loserBoard = winner === null ? [] : (winner === 0 ? c : a).minions;
  const responders = loserBoard.filter((m) => m.effects.some((eff) => eff.when === 'droit_de_reponse'));
  if (b.logging && celebrant) b.log.push({ e: 'celebration', side: celebrant.side, uid: celebrant.uid, cardId: celebrant.cardId });
  // Chaque Célébration joue son gain, même si un autre a pris la parole : on la voit sur sa carte.
  if (b.logging) {
    for (const u of celebrants) {
      for (const eff of u.effects) if (eff.when === 'celebration') logEffect(b, u, eff);
    }
  }
  if (b.logging && responder) b.log.push({ e: 'reponse', side: responder.side, uid: responder.uid, cardId: responder.cardId });

  const bonus = (s: Side) => s.units.reduce((sum, u) => sum + u.bonusDamage, 0);
  return {
    winner,
    first,
    survivors: alive,
    bonusDamage: [bonus(sides[0]), bonus(sides[1])],
    deathPenalty: [sides[0].penalty, sides[1].penalty],
    persist: [sides[0].persist, sides[1].persist],
    celebrant: celebrant ? { side: celebrant.side, uid: celebrant.uid } : null,
    // Le plateau connaît le politique, pas son incarnation : une réincarnation célèbre pour lui.
    celebrants: celebrants.map((u) => ({ side: sides[winner as 0 | 1].index, uid: u.origin })),
    responder: responder ? { side: responder.side, uid: responder.uid } : null,
    responders: responders.map((m) => ({ side: winner === 0 ? 1 : 0, uid: m.uid })),
    celebrationRepeats,
    log: b.log,
  };
}

/** Qui prononce la petite phrase : la Vedette survivante la plus à gauche, sinon le survivant le plus à gauche. */
function pickCelebrant(side: Side): { side: 0 | 1; uid: number; cardId: string } | null {
  const survivors = side.units.filter((u) => u.hp > 0);
  const star = survivors.find((u) => has(u, 'vedette')) ?? survivors[0];
  return star ? { side: side.index, uid: star.uid, cardId: star.cardId } : null;
}

/** Qui répond pour le perdant : le plus à gauche de son plateau de départ qui a un Droit de réponse. */
function pickResponder(index: 0 | 1, s: CombatSide): { side: 0 | 1; uid: number; cardId: string } | null {
  const m = s.minions.find((x) => x.effects.some((e) => e.when === 'droit_de_reponse'));
  return m ? { side: index, uid: m.uid, cardId: m.cardId } : null;
}
