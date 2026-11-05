import { computed, ref, shallowRef } from 'vue';
import type { ConnectionStatus, ConnectionWatch } from '#src/client/services/connectionStatus.ts';
import { EndOfTurnPlayback } from '#src/client/stores/createEndOfTurnPlayback.ts';
import { hostQuote } from '#src/client/tools/hostQuote.ts';
import type { CombatView, PlayerView } from '#src/engine/game.ts';
import type { PlayerAction } from '#src/engine/types.ts';
import { CHAT_LONGUEUR, PARTIE_DISPARUE, PARTIE_PLANTEE } from '#src/protocol/messages.ts';
import type { Classement, MessageChat, OptionsSalon, ServerMessage, VueFile, VueSalon } from '#src/protocol/messages.ts';
import type { Transport } from '#src/protocol/transport.ts';

const NOTICE_MS = 3500;
/** The queue said goodbye: a table follows at once, or another tab took the place. */
const QUEUE_LOST_MS = 2000;
/** Out of the game while the ranking is already known (solo, last two players): the elimination is still shown this long. */
const ELIMINATED_MS = 6000;
/** After « vu », the combat stays on screen until the next round comes. Past this, it gives way anyway. */
const COMBAT_HOLD_MS = 40_000;
export const RECONNECTING_NOTICE = 'Connexion perdue : reconnexion en cours…';
/** Chat lines kept on screen: the server keeps its own last 50 for whoever comes back. */
const CHAT_KEEP = 100;

export type GameScreen = 'loading' | 'queue' | 'waiting' | 'hero' | 'recruit' | 'combat' | 'eliminated' | 'end';

/** A public game changes the MMR: before and after, sent with the ranking. */
export interface MmrChange {
  avant: number;
  apres: number;
}

/** Everything the screens know about the game. It alone talks to the transport. */
export function createGameStore(transport: Transport & Partial<ConnectionWatch>) {
  const view = shallowRef<PlayerView | null>(null);
  const combat = shallowRef<CombatView | null>(null);
  /** The end of turn playing on the recruitment table, before its combat opens. */
  const endOfTurn = shallowRef<EndOfTurnPlayback | null>(null);
  /** The view the combat started from: what the combat shows does not move when the next round's view comes in. */
  const combatView = shallowRef<PlayerView | null>(null);
  const ranking = shallowRef<Classement | null>(null);
  const room = shallowRef<VueSalon | null>(null);
  /** The saved seat points to a room that no longer exists. */
  const roomGone = ref(false);
  /** A request that opens nothing was refused (unknown room code, full room…): the player goes back with this. */
  const refused = ref<string | null>(null);
  /** The online connection: dropped, it says so at once and keeps trying. */
  const connection = ref<ConnectionStatus>('open');
  /** It has been trying for a while: the failure screen, with « Réessayer ». */
  const connectionLost = computed(() => connection.value === 'lost');
  const notice = ref<string | null>(null);
  const hostLine = ref<string | null>(null);
  /** Counts the host's lines: the same line said twice is still said twice. */
  const hostLineCount = ref(0);
  const deadline = ref<number | null>(null);
  const hasEndedRecruitment = ref(false);
  /** The public queue as the server last showed it; null before its first answer. */
  const queue = shallowRef<VueFile | null>(null);
  /** In the public queue, or on the way there. */
  const queueing = ref(false);
  /** The queue let go without seating us: the same player entered it from another tab, or it refused us. */
  const queueLost = ref(false);
  /** What the server said when it refused the entry; null when the queue went silent. */
  const queueLostReason = ref<string | null>(null);
  /** When the last queue view arrived: the time waited goes on from there. */
  const queueSeenAt = ref(0);
  const mmrChange = shallowRef<MmrChange | null>(null);
  /** The room's chat, oldest first. */
  const chat = shallowRef<MessageChat[]>([]);
  /** At least two people to talk: a room alone with bots, or a solo game, has no chat. */
  const canChat = computed(() => (room.value?.joueurs.filter((player) => !player.bot).length ?? 0) > 1 || chat.value.length > 0);
  /** The eliminated screen is shown, for a while, before a ranking already known. */
  const eliminationHold = ref(false);
  let nextSeq = 1;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let queueLostTimer: ReturnType<typeof setTimeout> | undefined;
  let eliminationTimer: ReturnType<typeof setTimeout> | undefined;
  let combatTimer: ReturnType<typeof setTimeout> | undefined;
  /** Said by the host once the server has accepted the action, not before. */
  let pendingHostLine: string | null = null;
  /** How many lines the host has said at the desk: each gesture brings the next of its real quotes. */
  let hostTurn = 0;
  /** The player watched this combat to the end: it gives way as soon as the next round is there. */
  let combatSeen = false;
  /** The round of the last combat watched: a reconnection sends it again, it is not played twice. */
  let seenCombatRound = -1;
  /** The round whose end of turn is playing or has played: its combat comes once, after it. */
  let endOfTurnRound = -1;
  let eliminationShown = false;

  const screen = computed<GameScreen>(() => {
    if (combat.value) return 'combat';
    if (ranking.value) return eliminationHold.value && view.value && !view.value.alive ? 'eliminated' : 'end';
    if (queueing.value && !room.value) return 'queue';
    if (room.value && room.value.etat !== 'en_jeu') return 'waiting';
    if (!view.value) return 'loading';
    if (!view.value.alive) return 'eliminated';
    return view.value.phase === 'choix_heros' ? 'hero' : 'recruit';
  });

  function showNotice(text: string): void {
    notice.value = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (notice.value = null), NOTICE_MS);
  }

  /** The combat, once watched, gives way to what came after it: the next round, the elimination, the ranking. */
  function releaseCombat(): void {
    const shown = combat.value;
    if (!shown || !combatSeen) return;
    const next = view.value;
    if (!ranking.value && (!next || (next.round <= shown.round && next.alive))) return;
    clearTimeout(combatTimer);
    combat.value = null;
    combatView.value = null;
  }

  /** The eliminated screen shows once the combat that eliminated is over; a ranking already there waits behind it. */
  function noteElimination(): void {
    if (eliminationShown || combat.value || !view.value || view.value.alive) return;
    eliminationShown = true;
    eliminationHold.value = true;
    eliminationTimer = setTimeout(() => (eliminationHold.value = false), ELIMINATED_MS);
  }

  function receiveView(next: PlayerView, timeLeft: number | null): void {
    if (view.value && next.round !== view.value.round) {
      hostLine.value = null;
      hasEndedRecruitment.value = false;
    }
    if (pendingHostLine) {
      hostLine.value = pendingHostLine;
      hostLineCount.value++;
    }
    pendingHostLine = null;
    view.value = next;
    deadline.value = timeLeft === null ? null : Date.now() + timeLeft;
  }

  function receiveCombat(next: CombatView): void {
    // Sent again after a reconnection: the one on screen, or one already watched, is not replayed.
    if (next.round === seenCombatRound || next.round === combat.value?.round || next.round === endOfTurnRound) return;
    const recruiting = view.value?.phase === 'recrutement' && view.value.round === next.round;
    if (next.endOfTurn.length === 0 || !recruiting) {
      showCombat(next);
      return;
    }
    // The end of turn plays on the table first: the recruitment's last view is the board before it.
    endOfTurnRound = next.round;
    hasEndedRecruitment.value = true;
    const playback = new EndOfTurnPlayback(next.endOfTurn, () => {
      if (endOfTurn.value !== playback) return;
      endOfTurn.value = null;
      showCombat(next);
    });
    endOfTurn.value = playback;
    playback.start();
  }

  function showCombat(next: CombatView): void {
    combatSeen = false;
    combatView.value = view.value;
    combat.value = next;
  }

  function resetGame(): void {
    endOfTurn.value?.destroy();
    endOfTurn.value = null;
    endOfTurnRound = -1;
    view.value = null;
    combat.value = null;
    combatView.value = null;
    ranking.value = null;
    combatSeen = false;
    seenCombatRound = -1;
    eliminationShown = false;
    eliminationHold.value = false;
    clearTimeout(eliminationTimer);
    clearTimeout(combatTimer);
  }

  function receiveRoom(next: VueSalon): void {
    queueing.value = false;
    queue.value = null;
    clearTimeout(queueLostTimer);
    if (next.etat === 'en_jeu' && room.value?.etat !== 'en_jeu') resetGame();
    // Another room: its chat is not this one.
    if (room.value && room.value.code !== next.code) chat.value = [];
    room.value = next;
  }

  function receiveError(text: string): void {
    pendingHostLine = null;
    if (text === PARTIE_DISPARUE) {
      roomGone.value = true;
      return;
    }
    // A bug stopped this game only: back home, with the server's apology.
    if (text === PARTIE_PLANTEE) {
      refused.value = text;
      return;
    }
    // A full queue refuses the entry: the queue screen says why, and offers to try again.
    if (queueing.value && !queue.value) {
      queueLost.value = true;
      queueLostReason.value = text;
      return;
    }
    // Nothing opened yet (no room, no game): the request itself was refused.
    if (!room.value && !view.value && !queueing.value) {
      refused.value = text;
      return;
    }
    showNotice(text);
  }

  function receive(message: ServerMessage): void {
    switch (message.type) {
      case 'vue':
        receiveView(message.vue, message.reste_ms);
        break;
      case 'combat':
        receiveCombat(message.combat);
        break;
      case 'fin':
        ranking.value = message.classement;
        break;
      case 'erreur':
        receiveError(message.erreur);
        break;
      case 'refus':
        pendingHostLine = null;
        showNotice(message.erreur);
        break;
      case 'salon':
        receiveRoom(message.salon);
        break;
      case 'file':
        receiveQueue(message.file);
        break;
      case 'mmr':
        mmrChange.value = { avant: message.avant, apres: message.apres };
        break;
      case 'chat':
        receiveChat(message.messages, message.historique === true);
        break;
    }
    releaseCombat();
    noteElimination();
  }

  /** The history replaces what the client had; a new line is added once, even if it comes twice. */
  function receiveChat(messages: MessageChat[], history: boolean): void {
    if (history) {
      chat.value = messages.slice(-CHAT_KEEP);
      return;
    }
    const known = new Set(chat.value.map((line) => line.id));
    const fresh = messages.filter((line) => !known.has(line.id));
    if (fresh.length > 0) chat.value = [...chat.value, ...fresh].slice(-CHAT_KEEP);
  }

  /** Sent as typed: the server cleans it, and everyone, the writer included, sees it when it comes back. */
  function sendChat(text: string): void {
    const line = text.trim().slice(0, CHAT_LONGUEUR);
    if (line) transport.send({ type: 'chat', texte: line });
  }

  function receiveQueue(next: VueFile | null): void {
    clearTimeout(queueLostTimer);
    queue.value = next;
    if (next) {
      queueing.value = true;
      queueLost.value = false;
      queueLostReason.value = null;
      queueSeenAt.value = Date.now();
    } else if (queueing.value) {
      // A table that starts sends its room right after: only a silence means the place is gone.
      queueLostTimer = setTimeout(() => (queueLost.value = queueing.value && !room.value), QUEUE_LOST_MS);
    }
  }

  /** The host reacts to the gestures that matter, once the server has accepted them: its real words first, its stock line otherwise. */
  function updateHostLine(action: PlayerAction): void {
    const host = view.value?.animateur;
    if (!host) return;
    if (action.t === 'buy') pendingHostLine = hostQuote(host.id, 'achat', hostTurn++) ?? host.repliques.achat;
    else if (action.t === 'roll') pendingHostLine = hostQuote(host.id, 'actualiser', hostTurn++) ?? host.repliques.actualiser;
    else if (action.t === 'upgrade') pendingHostLine = hostQuote(host.id, 'echelon', hostTurn++);
  }

  function act(action: PlayerAction): void {
    // Sent now, it would be played later on a table that has moved on: the player is told instead.
    if (connection.value !== 'open') {
      showNotice(RECONNECTING_NOTICE);
      return;
    }
    updateHostLine(action);
    transport.send({ type: 'action', seq: nextSeq++, action });
  }

  function endRecruitment(): void {
    hasEndedRecruitment.value = true;
    transport.send({ type: 'pret' });
  }

  /**
   * The player has seen the combat: the server may go on. The combat stays on screen until the next
   * round is there, so that the old recruitment never shows in between.
   */
  function closeCombat(): void {
    const shown = combat.value;
    if (!shown || combatSeen) return;
    combatSeen = true;
    seenCombatRound = shown.round;
    transport.send({ type: 'vu' });
    combatTimer = setTimeout(() => {
      if (combat.value !== shown) return;
      combat.value = null;
      combatView.value = null;
      noteElimination();
    }, COMBAT_HOLD_MS);
    releaseCombat();
    noteElimination();
  }

  function createRoom(pseudo: string, options: OptionsSalon): void {
    transport.send({ type: 'creer_salon', pseudo, options });
  }

  function joinRoom(code: string, pseudo: string): void {
    transport.send({ type: 'rejoindre', code, pseudo });
  }

  /** Into the public queue: from the home screen, or back from the end of a public game. */
  function joinQueue(pseudo: string, playerId: string): void {
    room.value = null;
    chat.value = [];
    resetGame();
    mmrChange.value = null;
    queue.value = null;
    queueLost.value = false;
    queueLostReason.value = null;
    queueing.value = true;
    transport.send({ type: 'file_rejoindre', pseudo, joueur: playerId });
  }

  /** « Lancer avec des bots »: shown at once, confirmed by the next view of the queue. */
  function voteQueue(yes: boolean): void {
    const current = queue.value;
    if (current) queue.value = { ...current, vote: yes, groupe: current.groupe.map((seat) => (seat.moi ? { ...seat, vote: yes } : seat)) };
    transport.send({ type: 'file_vote', oui: yes });
  }

  function launchRoom(): void {
    transport.send({ type: 'lancer' });
  }

  function updateRoomSettings(options: OptionsSalon): void {
    transport.send({ type: 'regler_salon', options });
  }

  /** The player does not wait for the end of the eliminated screen: the ranking, already known, comes now. */
  function showRanking(): void {
    clearTimeout(eliminationTimer);
    eliminationHold.value = false;
  }

  /** The connection is down: try again now. */
  function retry(): void {
    transport.retry?.();
  }

  /** Also forgets the saved seat: without it, the next visit would try to take it back. */
  function leave(): void {
    clearTimeout(noticeTimer);
    clearTimeout(queueLostTimer);
    clearTimeout(eliminationTimer);
    clearTimeout(combatTimer);
    endOfTurn.value?.destroy();
    queueing.value = false;
    transport.send({ type: 'quitter' });
    transport.close();
  }

  transport.onMessage(receive);
  transport.onClose(() => {});
  transport.onStatus?.((status) => (connection.value = status));

  return {
    room, roomGone, refused, connection, connectionLost, retry, createRoom, joinRoom, launchRoom, updateRoomSettings,
    queue, queueing, queueLost, queueLostReason, queueSeenAt, mmrChange, joinQueue, voteQueue, chat, canChat, sendChat,
    view, combat, combatView, endOfTurn, ranking, showRanking, notice, hostLine, hostLineCount, deadline, hasEndedRecruitment, screen, act, endRecruitment, closeCombat, leave,
  };
}

export type GameStore = ReturnType<typeof createGameStore>;
