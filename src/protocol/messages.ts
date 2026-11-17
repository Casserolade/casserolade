import type { BotLevel } from '../bots/bots.ts';
import type { CombatView, PlayerView } from '../engine/game.ts';
import type { PlayerAction } from '../engine/types.ts';

/** The answer to `reprendre` when the room is gone: the client forgets its token. */
export const PARTIE_DISPARUE = 'Cette partie n\'existe plus.';
/** The host put this player out of the room: back to the home page with this, and the room stays closed to them. */
export const EXCLU_DU_SALON = 'L\'hôte vous a exclu de ce salon.';
/** What a muted player is told when they write: the line is not said. */
export const CHAT_COUPE = 'L\'hôte a coupé votre chat.';
/** Un bug a arrêté cette partie seule (room.ts) : le joueur revient à l'accueil avec ce message. */
export const PARTIE_PLANTEE = 'Un bug a interrompu la partie. Il est enregistré pour être corrigé : toutes nos excuses !';

/** Room settings chosen by the host. */
export interface OptionsSalon {
  /** Bots added to fill the table. */
  bots: number;
  niveauBots: BotLevel;
  /** Context id; the engine's default when absent. */
  contexte?: string;
  /** False: no timers, to take one's time in solo. */
  minuteur: boolean;
  /**
   * How many sit at the table, 2 to 8, humans first: bots take the empty seats. 8 when absent. Like a Battlegrounds
   * private lobby, two friends can play head to head, with or without bots.
   */
  table?: number;
  /**
   * The name of a public room: the home page lists it under this name, and anyone may walk in. Absent: a private
   * room, by link or code only. The host may open or close its room while it waits.
   */
  nomPublic?: string;
}

export interface VueSalon {
  code: string;
  /** The seat that receives this view; -1 for whoever came in during a game, and waits for the next one. */
  siege: number;
  /** The pseudo of whoever receives this view, as the room knows it: its own lines of chat carry it. */
  moi: string;
  /** The host's seat; -1 when the host came in during the game, and has no seat in it. */
  hote: number;
  /** Whoever receives this view is the host: it settles and launches, and may mute or put out anyone, at any time. */
  estHote: boolean;
  etat: 'attente' | 'en_jeu' | 'fini';
  options: OptionsSalon;
  /** `mmr`: the rating of a human who has one, from its games against other humans; a bot has none, a newcomer neither. */
  joueurs: { siege: number; pseudo: string; bot: boolean; connecte: boolean; mmr?: number }[];
  /** During a game, the pseudos of those who came in since: no seat in it, they talk with the table and play the next. */
  enAttente?: string[];
  /** The pseudos the host muted: what they write in the chat is not said, until the host gives it back. */
  muets?: string[];
  /** A table formed by the ranked queue: it counts for MMR and does not restart. */
  classee?: boolean;
}

/** What a player in the public queue sees. */
export interface VueFile {
  /** Your MMR, 1000 at first. */
  mmr: number;
  attente_ms: number;
  /** The table you would sit at right now, you included. */
  groupe: { pseudo: string; vote: boolean; moi: boolean }[];
  /** Your vote for « Lancer avec des bots ». */
  vote: boolean;
  /** Yes votes needed to start with bots: a strict majority of the group. */
  majorite: number;
  /** Everyone waiting, all groups together. */
  en_file: number;
}

export type Classement = { seat: number; pseudo: string; heroId: string; place: number }[];

/** The longest chat line, in characters. */
export const CHAT_LONGUEUR = 200;

/** A chat line, as everyone in the room sees it, before and during the game. */
export interface MessageChat {
  /** Increasing within a room: the client keeps the order and drops a line it already has. */
  id: number;
  pseudo: string;
  /** The writer's seat: in the game once it started, in the room before. -1 if none. */
  siege: number;
  texte: string;
  /** A line the room says itself (who comes in, who leaves): nobody wrote it, `pseudo` is empty. */
  annonce?: true;
}

export type ClientMessage =
  | { type: 'action'; seq: number; action: PlayerAction }
  /** End of recruitment for this seat. */
  | { type: 'pret' }
  /** The client finished showing the combat. The server does not wait past its own timer. */
  | { type: 'vu' }
  /**
   * `joueur`, here and to walk into a room: the anonymous id the browser keeps, by which the server finds this
   * player's rating. A game of a room counts for it as soon as two humans play. Without it, the player is not rated.
   */
  | { type: 'creer_salon'; pseudo: string; options: OptionsSalon; joueur?: string }
  | { type: 'rejoindre'; code: string; pseudo: string; joueur?: string }
  | { type: 'lancer' }
  /** Host only, before the game starts. */
  | { type: 'regler_salon'; options: OptionsSalon }
  /** Leaving on purpose: the seat is freed, or held by a bot until the end of the game. */
  | { type: 'quitter' }
  | { type: 'reprendre'; jeton: string }
  /**
   * Enter the public queue. `joueur`: the anonymous id the browser keeps (localStorage),
   * the only way the server recognizes a player and their MMR. No account.
   */
  | { type: 'file_rejoindre'; pseudo: string; joueur: string }
  /** « Lancer avec des bots »: yes or no, changeable while waiting. `quitter` leaves the queue. */
  | { type: 'file_vote'; oui: boolean }
  /** A line for everyone in the room, in the waiting room and during the game. */
  | { type: 'chat'; texte: string }
  /**
   * A new pseudo for oneself, from inside the room: for whoever walked in without choosing one. Not for a player
   * seated in a game: the table keeps its names until the end.
   */
  | { type: 'renommer'; pseudo: string }
  /** Host only, at any time: mutes this player's chat, or gives it back. The player is named by its pseudo in the room. */
  | { type: 'muet'; pseudo: string; oui: boolean }
  /**
   * Host only, at any time: puts this player out of the room, for good. In a game, a bot holds the seat until the
   * end, as when a player leaves.
   */
  | { type: 'exclure'; pseudo: string }
  /**
   * Out of the game, follow a survivor: each of its combats is shown live (`spectacle`), from now on. Null stops.
   * The follower's « vu » counts like a player's: the round waits for it, up to the combat's own timer.
   */
  | { type: 'suivre'; siege: number | null };

export type ServerMessage =
  /** `reste_ms`: time left in the current phase, null without a timer. */
  | { type: 'vue'; vue: PlayerView; reste_ms: number | null }
  | { type: 'refus'; seq: number; erreur: string }
  | { type: 'combat'; combat: CombatView }
  | { type: 'salon'; salon: VueSalon; jeton: string }
  /** A request that belongs to no game action failed: bad code, full room. */
  | { type: 'erreur'; erreur: string }
  | { type: 'fin'; classement: Classement }
  /** The public queue as this player sees it. Null: out of the queue, or the table just started. */
  | { type: 'file'; file: VueFile | null }
  /** After a public game, sent along with `fin`. */
  | { type: 'mmr'; avant: number; apres: number }
  /** The combat of the survivor this eliminated player follows (`suivre`), seen from that survivor's side. */
  | { type: 'spectacle'; siege: number; combat: CombatView }
  /** New chat lines. `historique`: the room's last lines, sent on arrival or return, which replace the client's. */
  | { type: 'chat'; messages: MessageChat[]; historique?: boolean };
