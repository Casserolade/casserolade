import type { BotLevel } from '../bots/bots.ts';
import { CONTEXTS, RANDOM_CONTEXT } from '../data/heroes.ts';
import { CHAT_COUPE, CHAT_LONGUEUR, EXCLU_DU_SALON, PARTIE_DISPARUE } from '../protocol/messages.ts';
import { recruitTimeMs } from '../protocol/recruitTime.ts';
import type { Classement, ClientMessage, MessageChat, OptionsSalon, ServerMessage, VueSalon } from '../protocol/messages.ts';
import { SALON_NOUVEAU_MS, SALONS_AFFICHES } from '../protocol/publicRooms.ts';
import type { SalonPublic } from '../protocol/publicRooms.ts';
import { formerGroupes, majorite, niveauDesBots } from './file.ts';
import type { Attendant } from './file.ts';
import { MMR_DEPART, appliquerVariation, variationsMmr } from './mmr.ts';
import { nettoyerNomDeSalon } from './nettoyerNomDeSalon.ts';
import { generateSeed } from '../server/generateSeed.ts';
import { GameRoom } from '../server/room.ts';
import type { Clock, RoomIncident, RoomSeat, RoomTimers } from '../server/room.ts';

export const SIEGES = 8;
/** Au moins deux participants à une table, humains ou bots. */
export const TABLE_MIN = 2;
const LONGUEUR_CODE = 6;
/** Sans 0/O ni 1/I/L : un code se dicte. */
const ALPHABET_CODE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const OCTETS_JETON = 24;
const LONGUEUR_PSEUDO = 24;
const TOUS_NIVEAUX: BotLevel[] = ['facile', 'moyen', 'difficile'];

/** Une place reste réservée le temps de recharger la page, puis le salon d'attente la libère. */
const GRACE_ATTENTE_MS = 30_000;
/** Plus personne de connecté : le salon disparaît. */
const ABANDON_MS = 5 * 60_000;

/** Le chat : les dernières lignes gardées, et pas plus de 5 lignes en 10 secondes par joueur. */
const CHAT_HISTORIQUE = 50;
const CHAT_RAFALE = 5;
const CHAT_FENETRE_MS = 10_000;

const CHRONO_JEU: RoomTimers = {
  heroMs: 30_000,
  recruitMs: recruitTimeMs,
  graceMs: 15_000,
};
const SANS_CHRONO: RoomTimers = { heroMs: null, recruitMs: null, graceMs: 15_000 };

/** La file se recompose à ce rythme : la fenêtre de MMR s'élargit avec l'attente. */
const TIC_FILE_MS = 5000;
const MAX_FILE = 2000;

interface Humain {
  pseudo: string;
  /** Quand il a écrit ses dernières lignes de chat : pas plus de CHAT_RAFALE par CHAT_FENETRE_MS. */
  ecrits: number[];
  jeton: string;
  connexion: string | null;
  /** Le siège dans la partie en cours, null si le joueur est arrivé après ou a quitté. */
  siegeJeu: number | null;
  graceAttente: unknown;
  /** L'identifiant anonyme du navigateur, pour le MMR ; null pour qui n'en a pas donné : il n'est pas classé. */
  joueur: string | null;
  /** D'où vient sa connexion (`LobbyOptions.origine`) : exclu, il ne revient pas par une autre. */
  origine: string;
  /** L'hôte a coupé son chat : ses lignes ne partent plus. */
  muet: boolean;
}

/** Un joueur dans la file publique. */
interface EnFile extends Attendant {
  connexion: string;
  pseudo: string;
  joueur: string;
  /** « Lancer avec des bots » */
  vote: boolean;
}

/**
 * Ce qu'une partie compte pour le MMR : toute partie entre humains, dans un salon comme à une table de la file.
 * Les bots n'y sont jamais.
 */
interface Cotes {
  /**
   * Siège de jeu → joueur, fixé au lancement : un départ en cours de partie compte quand même. Un même joueur assis
   * deux fois (deux onglets du même navigateur) n'y est qu'une fois : on ne se bat pas soi-même.
   */
  joueurs: Map<number, string>;
  /** Le MMR avant et après la partie, par siège, pour qui revient voir le classement. */
  resultats: Map<number, { avant: number; apres: number }>;
}

function sansCotes(): Cotes {
  return { joueurs: new Map(), resultats: new Map() };
}

interface Salon {
  code: string;
  /** Quand il a été créé, à l'horloge du lobby : un salon public tout neuf se dit « nouveau » sur l'accueil. */
  creeA: number;
  humains: Humain[];
  options: OptionsSalon;
  etat: VueSalon['etat'];
  room: GameRoom | null;
  sieges: RoomSeat[];
  abandon: unknown;
  /** Le minuteur qui rend le salon à ceux qui attendent, dès qu'un bot a pris le siège du dernier humain à table. */
  remise: unknown;
  classement: Classement | null;
  /** Une table formée par la file : elle ne se règle pas, ne se relance pas, et n'a pas d'hôte. */
  classee: boolean;
  /** Les joueurs classés de la partie en cours ou finie, et ce qu'elle leur a rapporté. */
  cotes: Cotes;
  /** Ceux que l'hôte a exclus, par l'origine de leur connexion : le salon leur reste fermé tant qu'il existe. */
  exclus: Set<string>;
  /** Les dernières lignes du chat, pour qui arrive ou revient. */
  chat: MessageChat[];
  prochainMessage: number;
}

/** Où le serveur garde le MMR de chaque joueur anonyme. */
export interface MmrStore {
  lire(joueur: string): number | undefined;
  ecrire(joueur: string, mmr: number): void;
}

/** Un MMR qui s'oublie à l'arrêt : pour les tests, et à défaut de fichier. */
export function mmrEnMemoire(): MmrStore {
  const valeurs = new Map<string, number>();
  return {
    lire: (joueur) => valeurs.get(joueur),
    ecrire: (joueur, mmr) => void valeurs.set(joueur, mmr),
  };
}

export interface LobbyOptions {
  clock: Clock;
  send(connexion: string, message: ServerMessage): void;
  /** Injectable pour les tests. Par défaut, la source cryptographique. */
  octets?: (n: number) => Uint8Array;
  graine?: () => number;
  /**
   * D'où vient une connexion, pour qu'un joueur exclu d'un salon n'y revienne pas par une autre : le serveur donne
   * l'adresse, gardée en mémoire seulement, le temps du salon. Sans elle, la connexion elle-même.
   */
  origine?: (connexion: string) => string;
  /** Fabrique la partie : les tests y mettent des minuteurs courts. */
  chronos?: { avec: RoomTimers; sans: RoomTimers };
  mmr?: MmrStore;
  /** Reçoit chaque incident d'une partie (plantage ou anomalie), avec le code du salon : le serveur l'enregistre. */
  signaler?: (incident: RoomIncident, code: string) => void;
  /**
   * Pour les statistiques du site et l'archive des parties : un salon créé, une partie lancée, finie (le serveur la
   * garde pour l'équilibrage) ou abandonnée par tous ses humains, un siège repris par un bot après une déconnexion.
   */
  evenement?: (evenement: EvenementSalon) => void;
}

export type EvenementSalon =
  /** `nomPublic` : le nom sous lequel l'accueil l'affiche, null pour un salon privé. */
  | { type: 'salon_cree'; nomPublic: string | null }
  /** L'hôte ouvre au public un salon qui attend, ou change son nom. */
  | { type: 'salon_public'; nom: string }
  | { type: 'partie'; publique: boolean; humains: number }
  | { type: 'partie_finie'; publique: boolean; room: GameRoom }
  | { type: 'partie_abandonnee'; publique: boolean; room: GameRoom }
  | { type: 'reprise'; publique: boolean; manche: number };

function octetsCrypto(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

function nettoyerPseudo(brut: string): string {
  // Le pseudo reste du texte : le client l'affiche sans jamais l'interpréter.
  const propre = brut.replace(/[\p{C}]/gu, '').replace(/\s+/gu, ' ').trim().slice(0, LONGUEUR_PSEUDO);
  return propre || 'Sans étiquette';
}

/**
 * Les salons : créer, rejoindre, régler, lancer, partir et revenir. Et la file publique :
 * attendre, voter, jouer contre des inconnus de niveau proche. Sans dépendance à Node ni
 * au réseau : le serveur WebSocket n'a qu'à relayer les messages déjà validés.
 */
export class Lobby {
  private readonly salons = new Map<string, Salon>();
  private readonly parJeton = new Map<string, { salon: Salon; humain: Humain }>();
  private readonly parConnexion = new Map<string, { salon: Salon; humain: Humain }>();
  /** La file publique, par connexion. */
  private readonly file = new Map<string, EnFile>();
  private ticFile: unknown = null;
  private readonly options: LobbyOptions;
  private readonly mmr: MmrStore;

  constructor(options: LobbyOptions) {
    this.options = options;
    this.mmr = options.mmr ?? mmrEnMemoire();
  }

  get nombreDeSalons(): number {
    return this.salons.size;
  }

  get nombreEnFile(): number {
    return this.file.size;
  }

  get nombreEnJeu(): number {
    let n = 0;
    for (const salon of this.salons.values()) if (salon.etat === 'en_jeu') n++;
    return n;
  }

  /**
   * Les parties en ligne, pour l'accueil : une par joueur, comme en solo. Les humains connectés d'un salon qui attend,
   * et ceux d'une partie en cours qui sont encore en lice ; un éliminé a fini la sienne, les bots ne comptent pas.
   */
  get partiesEnLigne(): number {
    let n = 0;
    for (const salon of this.salons.values()) {
      if (salon.etat === 'fini') continue;
      for (const humain of salon.humains) if (humain.connexion && this.encoreEnLice(salon, humain)) n++;
    }
    return n;
  }

  private encoreEnLice(salon: Salon, humain: Humain): boolean {
    if (salon.etat !== 'en_jeu') return true;
    return humain.siegeJeu !== null && Boolean(salon.room?.game.players[humain.siegeJeu]?.alive);
  }

  /**
   * Les salons publics, pour l'accueil : ceux qui attendent d'abord, les plus remplis en tête, puis ceux qui jouent.
   * Un salon dont plus personne n'est connecté ne s'affiche pas : personne n'y répondrait.
   */
  get salonsPublics(): SalonPublic[] {
    const ouverts: SalonPublic[] = [];
    const enJeu: SalonPublic[] = [];
    for (const salon of this.salons.values()) {
      const nom = salon.options.nomPublic;
      const hote = salon.humains[0];
      if (!nom || !hote || !salon.humains.some((h) => h.connexion)) continue;
      const manche = salon.etat === 'en_jeu' ? (salon.room?.game.round ?? 0) : null;
      const nouveau = manche === null && this.options.clock.now() - salon.creeA < SALON_NOUVEAU_MS;
      (manche === null ? ouverts : enJeu).push({ code: salon.code, nom, hote: hote.pseudo, joueurs: salon.humains.length, places: SIEGES, manche, ...(nouveau ? { nouveau: true } : {}) });
    }
    // Le tri garde l'ordre de création à égalité : le plus ancien des salons aussi remplis passe devant.
    ouverts.sort((a, b) => b.joueurs - a.joueurs);
    return [...ouverts, ...enJeu].slice(0, SALONS_AFFICHES);
  }

  /** Entre inconnus : un salon public, ou une table de la file. C'est ce que les mesures appellent « publique ». */
  private entreInconnus(salon: Salon): boolean {
    return Boolean(salon.classee) || salon.options.nomPublic !== undefined;
  }

  /** Les parties en cours, pour le tableau de bord du serveur : leur salle, et si la table est publique. */
  get partiesEnCours(): { room: GameRoom; publique: boolean }[] {
    const parties: { room: GameRoom; publique: boolean }[] = [];
    for (const salon of this.salons.values()) if (salon.etat === 'en_jeu' && salon.room) parties.push({ room: salon.room, publique: this.entreInconnus(salon) });
    return parties;
  }

  /** Les humains connectés à une partie en cours. */
  get joueursEnJeu(): number {
    let n = 0;
    for (const salon of this.salons.values()) if (salon.etat === 'en_jeu') n += salon.humains.filter((h) => h.connexion && h.siegeJeu !== null).length;
    return n;
  }

  handleMessage(connexion: string, message: ClientMessage): void {
    switch (message.type) {
      case 'creer_salon':
        this.sortirDeFile(connexion);
        this.creer(connexion, message.pseudo, message.options, message.joueur ?? null);
        return;
      case 'rejoindre':
        this.sortirDeFile(connexion);
        this.rejoindre(connexion, message.code, message.pseudo, message.joueur ?? null);
        return;
      case 'reprendre':
        this.reprendre(connexion, message.jeton);
        return;
      case 'file_rejoindre':
        this.entrerDansFile(connexion, message.pseudo, message.joueur);
        return;
      case 'file_vote':
        this.voter(connexion, message.oui);
        return;
      case 'quitter':
        if (this.file.has(connexion)) {
          this.sortirDeFile(connexion);
          return;
        }
        break;
      default:
        break;
    }
    const place = this.parConnexion.get(connexion);
    if (!place) {
      this.erreur(connexion, 'Vous n\'êtes dans aucun salon.');
      return;
    }
    const { salon, humain } = place;
    if (message.type === 'chat') this.discuter(salon, humain, connexion, message.texte);
    else if (message.type === 'renommer') this.renommer(salon, humain, connexion, message.pseudo);
    else if (message.type === 'muet') this.moderer(salon, humain, connexion, message.pseudo, (cible) => this.couperChat(salon, cible, message.oui));
    else if (message.type === 'exclure') this.moderer(salon, humain, connexion, message.pseudo, (cible) => this.exclure(salon, cible));
    else if (message.type === 'regler_salon') this.regler(salon, humain, connexion, message.options);
    else if (message.type === 'lancer') this.lancer(salon, humain, connexion);
    else if (message.type === 'quitter') this.quitter(connexion);
    else if (salon.room && humain.siegeJeu !== null) salon.room.handleMessage(humain.siegeJeu, message);
    else if (message.type === 'action') this.options.send(connexion, { type: 'refus', seq: message.seq, erreur: 'Aucune partie en cours.' });
  }

  /** La connexion est perdue : le siège attend son joueur, qui revient avec son jeton. */
  disconnect(connexion: string): void {
    if (this.file.delete(connexion)) {
      this.evaluerFile();
      return;
    }
    const place = this.parConnexion.get(connexion);
    if (!place) return;
    const { salon, humain } = place;
    this.parConnexion.delete(connexion);
    humain.connexion = null;
    if (salon.etat !== 'en_jeu' || humain.siegeJeu === null) {
      // Hors partie, un joueur absent ne doit pas bloquer « Lancer » ni « Rejouer » ; sans siège, il ne garde pas de place.
      humain.graceAttente = this.options.clock.setTimeout(() => this.retirer(salon, humain), GRACE_ATTENTE_MS);
    } else if (salon.room) {
      salon.room.setConnected(humain.siegeJeu, false);
    }
    this.surveillerAbandon(salon);
    this.diffuser(salon);
  }

  /** Arrête toutes les parties : pour les tests et l'arrêt du serveur. */
  destroy(): void {
    this.file.clear();
    if (this.ticFile !== null) this.options.clock.clearTimeout(this.ticFile);
    this.ticFile = null;
    // L'arrêt du serveur n'est l'abandon de personne.
    for (const salon of [...this.salons.values()]) this.supprimer(salon, false);
  }

  private creer(connexion: string, pseudo: string, options: OptionsSalon, joueur: string | null): void {
    this.quitter(connexion);
    const salon: Salon = {
      code: this.nouveauCode(),
      creeA: this.options.clock.now(),
      humains: [],
      options: this.optionsValides(options),
      etat: 'attente',
      room: null,
      sieges: [],
      abandon: null,
      remise: null,
      classement: null,
      classee: false,
      cotes: sansCotes(),
      exclus: new Set(),
      chat: [],
      prochainMessage: 1,
    };
    this.salons.set(salon.code, salon);
    this.options.evenement?.({ type: 'salon_cree', nomPublic: salon.options.nomPublic ?? null });
    this.ajouter(salon, connexion, pseudo, joueur);
    this.diffuser(salon);
  }

  private rejoindre(connexion: string, code: string, pseudo: string, joueur: string | null): void {
    const salon = this.salons.get(code.trim().toUpperCase());
    if (!salon) {
      this.erreur(connexion, 'Ce salon n\'existe pas, ou plus.');
      return;
    }
    // Une table de la file ne se relance pas : y entrer en cours de partie ne mènerait nulle part.
    if (salon.etat === 'en_jeu' && salon.classee) {
      this.erreur(connexion, 'La partie a déjà commencé.');
      return;
    }
    if (salon.exclus.has(this.origineDe(connexion))) {
      this.erreur(connexion, EXCLU_DU_SALON);
      return;
    }
    if (salon.humains.length >= SIEGES) {
      this.erreur(connexion, 'Ce salon est complet.');
      return;
    }
    this.quitter(connexion);
    // Quitter son ancien salon a pu supprimer celui-ci s'il s'agissait du même.
    if (!this.salons.has(salon.code)) {
      this.erreur(connexion, 'Ce salon n\'existe pas, ou plus.');
      return;
    }
    // Pendant une partie, on entre quand même : sans siège, on discute avec la table en attendant la suivante.
    const humain = this.ajouter(salon, connexion, pseudo, joueur);
    this.diffuser(salon);
    this.envoyerHistorique(salon, connexion);
    this.annoncer(salon, `${humain.pseudo} entre dans le salon.`);
  }

  private reprendre(connexion: string, jeton: string): void {
    const place = this.parJeton.get(jeton);
    if (!place) {
      this.erreur(connexion, PARTIE_DISPARUE);
      return;
    }
    const { salon, humain } = place;
    const ancienne = humain.connexion;
    if (ancienne === connexion) return;
    this.sortirDeFile(connexion);
    if (ancienne) this.parConnexion.delete(ancienne);
    const autre = this.parConnexion.get(connexion);
    if (autre && autre.humain !== humain) this.quitter(connexion);
    if (humain.graceAttente !== null) {
      this.options.clock.clearTimeout(humain.graceAttente);
      humain.graceAttente = null;
    }
    humain.connexion = connexion;
    humain.origine = this.origineDe(connexion);
    this.parConnexion.set(connexion, place);
    this.annulerAbandon(salon);
    this.diffuser(salon);
    this.envoyerHistorique(salon, connexion);
    if (salon.etat === 'fini' && salon.classement) {
      this.options.send(connexion, { type: 'fin', classement: salon.classement });
      const mmr = humain.siegeJeu === null ? undefined : salon.cotes.resultats.get(humain.siegeJeu);
      if (mmr) this.options.send(connexion, { type: 'mmr', ...mmr });
    } else if (salon.room && humain.siegeJeu !== null) salon.room.setConnected(humain.siegeJeu, true);
  }

  private regler(salon: Salon, humain: Humain, connexion: string, options: OptionsSalon): void {
    if (salon.classee) {
      this.erreur(connexion, 'Une table classée ne se règle pas.');
      return;
    }
    if (salon.humains[0] !== humain) {
      this.erreur(connexion, 'Seul l\'hôte règle le salon.');
      return;
    }
    if (salon.etat === 'en_jeu') {
      this.erreur(connexion, 'La partie a déjà commencé.');
      return;
    }
    const avant = salon.options.nomPublic;
    salon.options = this.optionsValides(options);
    const nom = salon.options.nomPublic;
    if (nom !== undefined && nom !== avant) this.options.evenement?.({ type: 'salon_public', nom });
    this.diffuser(salon);
  }

  /** Sert aussi à « Rejouer » : une partie finie se relance dans le même salon. */
  private lancer(salon: Salon, humain: Humain, connexion: string): void {
    if (salon.classee) {
      this.erreur(connexion, 'Une table classée ne se relance pas : retournez dans la file.');
      return;
    }
    if (salon.humains[0] !== humain) {
      this.erreur(connexion, 'Seul l\'hôte lance la partie.');
      return;
    }
    if (salon.etat === 'en_jeu') {
      this.erreur(connexion, 'La partie a déjà commencé.');
      return;
    }
    this.demarrer(salon);
  }

  private demarrer(salon: Salon): void {
    salon.room?.destroy();
    salon.sieges = this.composerTable(salon);
    salon.humains.forEach((h, i) => {
      h.siegeJeu = i;
    });
    salon.cotes = sansCotes();
    const assis = new Set<string>();
    salon.humains.forEach((h, i) => {
      if (!h.joueur || assis.has(h.joueur)) return;
      assis.add(h.joueur);
      salon.cotes.joueurs.set(i, h.joueur);
    });
    salon.etat = 'en_jeu';
    salon.classement = null;
    this.options.evenement?.({ type: 'partie', publique: this.entreInconnus(salon), humains: salon.humains.length });
    const room = new GameRoom({
      seed: (this.options.graine ?? generateSeed)(),
      seats: salon.sieges,
      // De 2 à 8 sièges, selon la table choisie : les règles ne changent pas selon le nombre d'humains.
      game: { contextId: salon.options.contexte },
      timers: this.chronosPour(salon),
      clock: this.options.clock,
      send: (siege, message) => this.envoyerAuSiege(salon, siege, message),
      onEnd: (classement) => this.terminer(salon, room, classement),
      onIncident: (incident) => this.surIncident(salon, room, incident),
      onTakeover: () => {
        this.options.evenement?.({ type: 'reprise', publique: this.entreInconnus(salon), manche: room.game.round });
        // Après le tour de la salle, pas pendant : elle finit d'abord de confier le siège au bot.
        this.annulerRemise(salon);
        salon.remise = this.options.clock.setTimeout(() => {
          salon.remise = null;
          this.rendreAuxPresents(salon);
        }, 0);
      },
    });
    salon.room = room;
    this.diffuser(salon);
    room.start();
  }

  private chronosPour(salon: Salon): RoomTimers {
    const chronos = this.options.chronos ?? { avec: CHRONO_JEU, sans: SANS_CHRONO };
    // Un seul humain : personne à faire attendre, donc pas de minuteur.
    return salon.options.minuteur && salon.humains.length > 1 ? chronos.avec : chronos.sans;
  }

  /**
   * Les humains, puis des bots jusqu'à la taille de table choisie (2 à 8, 8 par défaut) : comme un salon privé de
   * Battlegrounds, deux amis peuvent jouer seuls, ou avec les bots qu'ils veulent (7 novembre 2026). La table s'agrandit
   * si plus d'humains la rejoignent.
   */
  private composerTable(salon: Salon): RoomSeat[] {
    const humains: RoomSeat[] = salon.humains.map((h) => ({ pseudo: h.pseudo, level: null }));
    const taille = Math.max(humains.length, salon.options.table ?? SIEGES);
    const bots: RoomSeat[] = Array.from({ length: taille - humains.length }, (_, i) => ({
      pseudo: `Bot ${i + 1}`,
      level: salon.options.niveauBots,
    }));
    return [...humains, ...bots];
  }

  private terminer(salon: Salon, room: GameRoom, classement: Classement): void {
    if (salon.room !== room) return;
    salon.etat = 'fini';
    salon.classement = classement;
    this.compterMmr(salon, classement);
    this.options.evenement?.({ type: 'partie_finie', publique: this.entreInconnus(salon), room });
    // Ceux qui sont partis pendant la partie libèrent leur place pour la suivante.
    for (const humain of [...salon.humains]) if (!humain.connexion) this.oublier(salon, humain);
    if (salon.humains.length === 0) {
      this.supprimer(salon);
      return;
    }
    this.diffuser(salon);
  }

  /**
   * Un incident de partie : il part au serveur pour être rejoué. Un plantage n'arrête que cette partie : le
   * salon se termine sans classement, et ses joueurs repartent à l'accueil (room.ts leur a dit pourquoi).
   */
  private surIncident(salon: Salon, room: GameRoom, incident: RoomIncident): void {
    this.options.signaler?.(incident, salon.code);
    if (incident.kind !== 'crash' || salon.room !== room) return;
    salon.etat = 'fini';
    salon.classement = null;
    for (const humain of [...salon.humains]) if (!humain.connexion) this.oublier(salon, humain);
    if (salon.humains.length === 0) {
      this.supprimer(salon);
      return;
    }
    this.diffuser(salon);
  }

  /** Départ volontaire. En partie, le siège reste tenu par un bot jusqu'à la fin. */
  private quitter(connexion: string): void {
    const place = this.parConnexion.get(connexion);
    if (place) this.sortir(place.salon, place.humain, `${place.humain.pseudo} quitte le salon.`);
  }

  /**
   * Un joueur sort du salon pour de bon, de lui-même ou exclu par l'hôte : sa connexion n'y est plus, et le salon
   * l'annonce à ceux qui restent. En partie, un bot tient son siège jusqu'à la fin.
   */
  private sortir(salon: Salon, humain: Humain, annonce: string): void {
    if (humain.connexion) this.parConnexion.delete(humain.connexion);
    humain.connexion = null;
    if (salon.etat === 'en_jeu') {
      if (salon.room && humain.siegeJeu !== null) salon.room.setConnected(humain.siegeJeu, false);
      this.oublier(salon, humain);
      this.surveillerAbandon(salon);
      this.diffuser(salon);
      this.annoncer(salon, annonce);
      this.rendreAuxPresents(salon);
      return;
    }
    this.retirer(salon, humain, annonce);
  }

  /**
   * L'hôte modère son salon, quand il veut, avant comme pendant la partie : couper le chat d'un joueur, ou l'exclure.
   * Lui seul, jamais sur lui-même, et pas à une table de la file, qui n'a pas d'hôte.
   */
  private moderer(salon: Salon, humain: Humain, connexion: string, pseudo: string, appliquer: (cible: Humain) => void): void {
    if (salon.classee || salon.humains[0] !== humain) {
      this.erreur(connexion, 'Seul l\'hôte modère le salon.');
      return;
    }
    const cible = salon.humains.find((h) => h.pseudo === pseudo);
    if (!cible || cible === humain) {
      this.erreur(connexion, 'Ce joueur n\'est pas dans le salon.');
      return;
    }
    appliquer(cible);
  }

  private couperChat(salon: Salon, cible: Humain, muet: boolean): void {
    if (cible.muet === muet) return;
    cible.muet = muet;
    this.diffuser(salon);
    this.annoncer(salon, muet ? `L'hôte a coupé le chat de ${cible.pseudo}.` : `L'hôte a rendu le chat à ${cible.pseudo}.`);
  }

  /** Exclu, on repart à l'accueil avec le mot de l'hôte, et le salon reste fermé à l'origine de sa connexion. */
  private exclure(salon: Salon, cible: Humain): void {
    salon.exclus.add(cible.origine);
    if (cible.connexion) this.erreur(cible.connexion, EXCLU_DU_SALON);
    this.sortir(salon, cible, `L'hôte a exclu ${cible.pseudo}.`);
  }

  private origineDe(connexion: string): string {
    return this.options.origine?.(connexion) ?? connexion;
  }

  /**
   * Plus aucun humain ne joue (partis, ou absents depuis assez longtemps pour qu'un bot tienne leur siège) alors que
   * quelqu'un attend la partie suivante : la partie des bots s'arrête là, et le salon est à ceux qui attendent.
   */
  private rendreAuxPresents(salon: Salon): void {
    const room = salon.room;
    if (salon.etat !== 'en_jeu' || !room) return;
    const assis = salon.humains.filter((h) => h.siegeJeu !== null);
    if (assis.some((h) => h.connexion || !room.takenOver.has(h.siegeJeu as number))) return;
    if (!salon.humains.some((h) => h.siegeJeu === null && h.connexion)) return;
    this.options.evenement?.({ type: 'partie_abandonnee', publique: this.entreInconnus(salon), room });
    room.destroy();
    salon.etat = 'fini';
    salon.classement = null;
    for (const absent of assis) this.oublier(salon, absent);
    this.diffuser(salon);
  }

  private retirer(salon: Salon, humain: Humain, annonce = `${humain.pseudo} quitte le salon.`): void {
    this.oublier(salon, humain);
    if (salon.humains.length === 0) {
      this.supprimer(salon);
      return;
    }
    this.diffuser(salon);
    this.annoncer(salon, annonce);
  }

  /** L'hôte est toujours le premier de la liste : s'il part, le suivant prend sa place. */
  private oublier(salon: Salon, humain: Humain): void {
    if (humain.graceAttente !== null) this.options.clock.clearTimeout(humain.graceAttente);
    humain.graceAttente = null;
    if (humain.connexion) this.parConnexion.delete(humain.connexion);
    this.parJeton.delete(humain.jeton);
    salon.humains = salon.humains.filter((h) => h !== humain);
  }

  private supprimer(salon: Salon, abandon = true): void {
    if (abandon && salon.etat === 'en_jeu' && salon.room) this.options.evenement?.({ type: 'partie_abandonnee', publique: this.entreInconnus(salon), room: salon.room });
    salon.room?.destroy();
    this.annulerAbandon(salon);
    this.annulerRemise(salon);
    for (const humain of [...salon.humains]) this.oublier(salon, humain);
    this.salons.delete(salon.code);
  }

  private annulerRemise(salon: Salon): void {
    if (salon.remise !== null) this.options.clock.clearTimeout(salon.remise);
    salon.remise = null;
  }

  private surveillerAbandon(salon: Salon): void {
    if (salon.humains.some((h) => h.connexion)) return;
    this.annulerAbandon(salon);
    if (salon.humains.length === 0 && salon.etat === 'en_jeu') {
      this.supprimer(salon);
      return;
    }
    salon.abandon = this.options.clock.setTimeout(() => this.supprimer(salon), ABANDON_MS);
  }

  private annulerAbandon(salon: Salon): void {
    if (salon.abandon !== null) this.options.clock.clearTimeout(salon.abandon);
    salon.abandon = null;
  }

  private ajouter(salon: Salon, connexion: string, pseudo: string, joueur: string | null = null): Humain {
    const humain: Humain = {
      pseudo: this.pseudoLibre(salon, nettoyerPseudo(pseudo)),
      jeton: this.nouveauJeton(),
      connexion,
      siegeJeu: null,
      graceAttente: null,
      joueur,
      origine: this.origineDe(connexion),
      muet: false,
      ecrits: [],
    };
    salon.humains.push(humain);
    const place = { salon, humain };
    this.parJeton.set(humain.jeton, place);
    this.parConnexion.set(connexion, place);
    return humain;
  }

  /** Ce pseudo, ou le même numéroté s'il est pris dans le salon ; `sauf` : celui qui se renomme ne se gêne pas lui-même. */
  private pseudoLibre(salon: Salon, pseudo: string, sauf: Humain | null = null): string {
    const pris = new Set(salon.humains.filter((h) => h !== sauf).map((h) => h.pseudo));
    if (!pris.has(pseudo)) return pseudo;
    for (let n = 2; ; n++) {
      const essai = `${pseudo.slice(0, LONGUEUR_PSEUDO - 3)} ${n}`;
      if (!pris.has(essai)) return essai;
    }
  }

  private optionsValides(options: OptionsSalon): OptionsSalon {
    const contexte = options.contexte === RANDOM_CONTEXT || CONTEXTS.some((c) => c.id === options.contexte) ? options.contexte : undefined;
    const table = Number.isInteger(options.table) ? Math.min(SIEGES, Math.max(TABLE_MIN, options.table as number)) : undefined;
    const nomPublic = nettoyerNomDeSalon(options.nomPublic);
    return {
      // Le nombre de bots se déduit des présents au lancement, et de la taille de la table.
      bots: 0,
      niveauBots: TOUS_NIVEAUX.includes(options.niveauBots) ? options.niveauBots : 'moyen',
      // Entre inconnus, le minuteur est toujours là : personne n'attend un absent.
      minuteur: options.minuteur || nomPublic !== undefined,
      ...(contexte ? { contexte } : {}),
      ...(table !== undefined ? { table } : {}),
      ...(nomPublic !== undefined ? { nomPublic } : {}),
    };
  }

  /**
   * Une ligne de chat pour tout le salon. Du texte seulement, que le client affiche sans
   * l'interpréter ; trop vite, elle est ignorée, sans message d'erreur qui encombrerait l'écran.
   */
  private discuter(salon: Salon, humain: Humain, connexion: string, brut: string): void {
    if (humain.muet) {
      this.erreur(connexion, CHAT_COUPE);
      return;
    }
    // Les retours à la ligne deviennent des espaces avant qu'on retire le reste : « la\ntable » reste deux mots.
    const texte = brut.replace(/\s+/gu, ' ').replace(/[\p{C}]/gu, '').replace(/ {2,}/g, ' ').trim().slice(0, CHAT_LONGUEUR);
    if (!texte) return;
    const maintenant = this.options.clock.now();
    humain.ecrits = humain.ecrits.filter((t) => maintenant - t < CHAT_FENETRE_MS);
    if (humain.ecrits.length >= CHAT_RAFALE) return;
    humain.ecrits.push(maintenant);
    const enJeu = salon.etat !== 'attente' && salon.sieges.length > 0;
    const message: MessageChat = {
      id: salon.prochainMessage++,
      pseudo: humain.pseudo,
      siege: enJeu ? (humain.siegeJeu ?? -1) : salon.humains.indexOf(humain),
      texte,
    };
    this.ecrire(salon, message);
  }

  /**
   * Un joueur change de pseudo depuis le salon, pour qui y est entré sans en choisir. Pas à table en pleine partie :
   * les noms de la table tiennent jusqu'à la fin. Le salon l'annonce, sauf pour un joueur au chat coupé, et pas plus
   * souvent qu'il ne laisse écrire.
   */
  private renommer(salon: Salon, humain: Humain, connexion: string, brut: string): void {
    if (salon.etat === 'en_jeu' && humain.siegeJeu !== null) {
      this.erreur(connexion, 'On ne change pas de pseudo en pleine partie.');
      return;
    }
    const ancien = humain.pseudo;
    const propre = nettoyerPseudo(brut);
    if (propre === ancien) return;
    const maintenant = this.options.clock.now();
    humain.ecrits = humain.ecrits.filter((t) => maintenant - t < CHAT_FENETRE_MS);
    if (humain.ecrits.length >= CHAT_RAFALE) return;
    humain.ecrits.push(maintenant);
    humain.pseudo = this.pseudoLibre(salon, propre, humain);
    this.diffuser(salon);
    if (!humain.muet) this.annoncer(salon, `${ancien} s'appelle maintenant ${humain.pseudo}.`);
  }

  /** Une ligne que le salon dit lui-même : qui entre, qui part. Ceux qui jouent la voient passer près du chat. */
  private annoncer(salon: Salon, texte: string): void {
    this.ecrire(salon, { id: salon.prochainMessage++, pseudo: '', siege: -1, texte, annonce: true });
  }

  private ecrire(salon: Salon, message: MessageChat): void {
    salon.chat = [...salon.chat, message].slice(-CHAT_HISTORIQUE);
    for (const h of salon.humains) if (h.connexion) this.options.send(h.connexion, { type: 'chat', messages: [message] });
  }

  private envoyerHistorique(salon: Salon, connexion: string): void {
    this.options.send(connexion, { type: 'chat', messages: salon.chat, historique: true });
  }

  private envoyerAuSiege(salon: Salon, siege: number, message: ServerMessage): void {
    const humain = salon.humains.find((h) => h.siegeJeu === siege);
    if (humain?.connexion) this.options.send(humain.connexion, message);
  }

  private diffuser(salon: Salon): void {
    for (const humain of salon.humains) {
      if (humain.connexion) {
        this.options.send(humain.connexion, { type: 'salon', salon: this.vue(salon, humain), jeton: humain.jeton });
      }
    }
  }

  /** Le MMR d'un humain qui en a un, à montrer à la table : il n'en a pas tant qu'il n'a pas joué contre un autre. */
  private cote(humain: Humain | undefined): { mmr?: number } {
    const mmr = humain?.joueur ? this.mmr.lire(humain.joueur) : undefined;
    return mmr === undefined ? {} : { mmr };
  }

  private vue(salon: Salon, humain: Humain): VueSalon {
    const enJeu = salon.etat === 'en_jeu' && salon.sieges.length > 0;
    const joueurs = enJeu
      ? salon.sieges.map((seat, siege) => {
          const h = salon.humains.find((x) => x.siegeJeu === siege);
          // Un joueur parti est remplacé par un bot pour tout le monde.
          return { siege, pseudo: seat.pseudo, bot: seat.level !== null || !h, connecte: seat.level === null ? Boolean(h?.connexion) : true, ...this.cote(seat.level === null ? h : undefined) };
        })
      : this.composerTable(salon).map((seat, siege) => ({
          siege,
          pseudo: seat.pseudo,
          bot: seat.level !== null,
          connecte: seat.level === null ? Boolean(salon.humains[siege]?.connexion) : true,
          ...this.cote(seat.level === null ? salon.humains[siege] : undefined),
        }));
    const siege = enJeu ? (humain.siegeJeu ?? -1) : salon.humains.indexOf(humain);
    // Entrés pendant la partie : ils n'y ont pas de siège, et joueront la suivante.
    const enAttente = enJeu ? salon.humains.filter((h) => h.siegeJeu === null).map((h) => h.pseudo) : [];
    const muets = salon.humains.filter((h) => h.muet).map((h) => h.pseudo);
    return {
      code: salon.code,
      siege,
      moi: humain.pseudo,
      hote: enJeu ? (salon.humains[0]?.siegeJeu ?? -1) : 0,
      estHote: !salon.classee && salon.humains[0] === humain,
      etat: salon.etat,
      options: salon.options,
      joueurs,
      ...(enAttente.length > 0 ? { enAttente } : {}),
      ...(muets.length > 0 ? { muets } : {}),
      ...(salon.classee ? { classee: true } : {}),
    };
  }

  // ---- La file publique ----

  private entrerDansFile(connexion: string, pseudo: string, joueur: string): void {
    this.quitter(connexion);
    const deja = this.file.get(connexion);
    if (!deja && this.file.size >= MAX_FILE) {
      this.erreur(connexion, 'La file est pleine. Réessayez dans un instant.');
      return;
    }
    let depuis = deja?.depuis ?? this.options.clock.now();
    // Le même joueur dans un autre onglet : le nouvel onglet prend sa place, et son ancienneté.
    for (const autre of [...this.file.values()]) {
      if (autre.joueur !== joueur || autre.connexion === connexion) continue;
      depuis = Math.min(depuis, autre.depuis);
      this.file.delete(autre.connexion);
      this.options.send(autre.connexion, { type: 'file', file: null });
    }
    this.file.set(connexion, {
      connexion,
      pseudo: nettoyerPseudo(pseudo),
      joueur,
      mmr: this.mmr.lire(joueur) ?? MMR_DEPART,
      depuis,
      vote: deja?.vote ?? false,
    });
    this.evaluerFile();
  }

  private voter(connexion: string, oui: boolean): void {
    const attendant = this.file.get(connexion);
    if (!attendant) {
      this.erreur(connexion, 'Vous n\'êtes pas dans la file.');
      return;
    }
    attendant.vote = oui;
    this.evaluerFile();
  }

  /** Quitter la file retire aussi son vote. */
  private sortirDeFile(connexion: string): void {
    if (!this.file.delete(connexion)) return;
    this.options.send(connexion, { type: 'file', file: null });
    this.evaluerFile();
  }

  /**
   * Recompose les tables et lance celles qui sont prêtes : 8 joueurs, ou une majorité
   * stricte qui a voté « Lancer avec des bots ». Puis chacun voit sa table.
   */
  private evaluerFile(): void {
    const maintenant = this.options.clock.now();
    for (;;) {
      const groupes = formerGroupes([...this.file.values()], maintenant, SIEGES);
      const prete = groupes.find((g) => g.length === SIEGES || g.filter((e) => e.vote).length >= majorite(g.length));
      if (prete) {
        this.lancerTableClassee(prete);
        continue;
      }
      for (const groupe of groupes) {
        for (const moi of groupe) {
          this.options.send(moi.connexion, {
            type: 'file',
            file: {
              mmr: moi.mmr,
              attente_ms: maintenant - moi.depuis,
              groupe: groupe.map((e) => ({ pseudo: e.pseudo, vote: e.vote, moi: e === moi })),
              vote: moi.vote,
              majorite: majorite(groupe.length),
              en_file: this.file.size,
            },
          });
        }
      }
      break;
    }
    this.planifierTicFile();
  }

  private planifierTicFile(): void {
    if (this.file.size === 0) {
      if (this.ticFile !== null) this.options.clock.clearTimeout(this.ticFile);
      this.ticFile = null;
      return;
    }
    if (this.ticFile !== null) return;
    this.ticFile = this.options.clock.setTimeout(() => {
      this.ticFile = null;
      this.evaluerFile();
    }, TIC_FILE_MS);
  }

  private lancerTableClassee(groupe: EnFile[]): void {
    for (const e of groupe) {
      this.file.delete(e.connexion);
      this.options.send(e.connexion, { type: 'file', file: null });
    }
    const moyenne = groupe.reduce((somme, e) => somme + e.mmr, 0) / groupe.length;
    const salon: Salon = {
      code: this.nouveauCode(),
      creeA: this.options.clock.now(),
      humains: [],
      // Entre inconnus, le minuteur est toujours là.
      options: { bots: 0, niveauBots: niveauDesBots(moyenne), minuteur: true },
      etat: 'attente',
      room: null,
      sieges: [],
      abandon: null,
      remise: null,
      classement: null,
      classee: true,
      cotes: sansCotes(),
      exclus: new Set(),
      chat: [],
      prochainMessage: 1,
    };
    this.salons.set(salon.code, salon);
    for (const e of groupe) this.ajouter(salon, e.connexion, e.pseudo, e.joueur);
    this.demarrer(salon);
  }

  /**
   * Les humains seulement, comparés deux à deux. Les bots ne font ni gagner ni perdre : seul humain classé à sa
   * table, on n'a rien à compter.
   */
  private compterMmr(salon: Salon, classement: Classement): void {
    const table = salon.cotes;
    const sieges = [...table.joueurs.entries()];
    if (sieges.length < 2) return;
    // Le MMR du moment, pas celui du lancement : le joueur a pu jouer ailleurs entre-temps.
    const avant = sieges.map(([, joueur]) => this.mmr.lire(joueur) ?? MMR_DEPART);
    const places = sieges.map(([siege]) => classement.find((r) => r.seat === siege)?.place ?? SIEGES);
    const variations = variationsMmr(sieges.map((_, i) => ({ mmr: avant[i], place: places[i] })));
    sieges.forEach(([siege, joueur], i) => {
      const apres = appliquerVariation(avant[i], variations[i]);
      // Écrit même inchangé : une première partie à égalité classe quand même son joueur, à son MMR de départ.
      this.mmr.ecrire(joueur, apres);
      table.resultats.set(siege, { avant: avant[i], apres });
      this.envoyerAuSiege(salon, siege, { type: 'mmr', avant: avant[i], apres });
    });
  }

  private erreur(connexion: string, erreur: string): void {
    this.options.send(connexion, { type: 'erreur', erreur });
  }

  private nouveauCode(): string {
    const octets = this.options.octets ?? octetsCrypto;
    for (;;) {
      const code = [...octets(LONGUEUR_CODE)].map((b) => ALPHABET_CODE[b % ALPHABET_CODE.length]).join('');
      if (!this.salons.has(code)) return code;
    }
  }

  private nouveauJeton(): string {
    const octets = this.options.octets ?? octetsCrypto;
    return [...octets(OCTETS_JETON)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
