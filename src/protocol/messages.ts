import type { BotLevel } from '../bots/bots.ts';
import type { CombatView, PlayerView } from '../engine/game.ts';
import type { PlayerAction } from '../engine/types.ts';

/** The answer to `reprendre` when the room is gone: the client forgets its token. */
export const PARTIE_DISPARUE = 'Cette partie n\'existe plus.';
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
}

export interface VueSalon {
  code: string;
  /** The seat that receives this view. */
  siege: number;
  hote: number;
  etat: 'attente' | 'en_jeu' | 'fini';
  options: OptionsSalon;
  joueurs: { siege: number; pseudo: string; bot: boolean; connecte: boolean }[];
  /** A table formed by the public queue: it counts for MMR and does not restart. */
  publique?: boolean;
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
}

export type ClientMessage =
  | { type: 'action'; seq: number; action: PlayerAction }
  /** End of recruitment for this seat. */
  | { type: 'pret' }
  /** The client finished showing the combat. The server does not wait past its own timer. */
  | { type: 'vu' }
  | { type: 'creer_salon'; pseudo: string; options: OptionsSalon }
  | { type: 'rejoindre'; code: string; pseudo: string }
  | { type: 'lancer' }
  /** Host only, before the game starts. */
  | { type: 'regler_salon'; options: OptionsSalon }
  /** Leaving on purpose: the seat is freed, or held by a bot until the end of the game. */
  | { type: 'quitter' }
  | { type: 'reprendre'; jeton: string }
  /**
   * Enter the public queue. `joueur`: an anonymous id the browser keeps (localStorage),
   * the only way the server recognizes a player and their MMR. No account.
   */
  | { type: 'file_rejoindre'; pseudo: string; joueur: string }
  /** « Lancer avec des bots »: yes or no, changeable while waiting. `quitter` leaves the queue. */
  | { type: 'file_vote'; oui: boolean }
  /** A line for everyone in the room, in the waiting room and during the game. */
  | { type: 'chat'; texte: string };

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
  /** New chat lines. `historique`: the room's last lines, sent on arrival or return, which replace the client's. */
  | { type: 'chat'; messages: MessageChat[]; historique?: boolean };
