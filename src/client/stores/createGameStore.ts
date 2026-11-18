import { computed, ref, shallowRef } from 'vue';
import type { ConnectionStatus, ConnectionWatch } from '#src/client/services/connectionStatus.ts';
import { EndOfTurnPlayback } from '#src/client/stores/createEndOfTurnPlayback.ts';
import { hostQuote } from '#src/client/tools/hostQuote.ts';
import { roomHumans } from '#src/client/tools/roomHumans.ts';
import { seatNames } from '#src/client/tools/seatNames.ts';
import { spectatorView } from '#src/client/tools/spectatorView.ts';
import type { CombatView, PlayerView } from '#src/engine/game.ts';
import type { PlayerAction } from '#src/engine/types.ts';
import { CHAT_LONGUEUR, EXCLU_DU_SALON, PARTIE_DISPARUE, PARTIE_PLANTEE } from '#src/protocol/messages.ts';
import type { Classement, MessageChat, OptionsSalon, ServerMessage, VueFile, VueSalon } from '#src/protocol/messages.ts';
import type { Transport } from '#src/protocol/transport.ts';
import { heardVoices } from '#src/client/stores/heardVoices.ts';

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

/** `watching`: out of the game, the recruitment table of the survivor followed. */
export type GameScreen = 'loading' | 'queue' | 'waiting' | 'hero' | 'recruit' | 'watching' | 'combat' | 'eliminated' | 'end';

/** A game between humans changes the rating: before and after, sent with the ranking. */
export interface MmrChange {
  avant: number;
  apres: number;
}

/**
 * A local game may refuse a gesture before it leaves: the tutorial, on rails. The reason is told to the player, and
 * nothing is sent.
 */
/** The buttons of the host's desk that do nothing for now. */
export interface DeskLocks {
  upgrade: boolean;
  roll: boolean;
  freeze: boolean;
}

export interface ActionGuard {
  refusal(action: PlayerAction | 'pret'): string | null;
}

/** Everything the screens know about the game. It alone talks to the transport. */

export function createGameStore(transport: Transport & Partial<ConnectionWatch> & Partial<ActionGuard>) {
  // A new game: no voice heard yet (a voice is never heard twice in the same game).
  heardVoices.forget();
  const view = shallowRef<PlayerView | null>(null);
  const combat = shallowRef<CombatView | null>(null);
  /** The end of turn playing on the recruitment table, before its combat opens. */
  const endOfTurn = shallowRef<EndOfTurnPlayback | null>(null);
  /** The view the combat started from: what the combat shows does not move when the next round's view comes in. */
  const combatView = shallowRef<PlayerView | null>(null);
  /** Out of the game, the survivor followed (`suivre`): its recruitment and each of its combats are shown live. */
  const following = ref<number | null>(null);
  /** The followed survivor's recruitment table, as that survivor sees it (`suivi`). */
  const followedView = shallowRef<PlayerView | null>(null);
  /** The table to watch now: the followed survivor's, while it recruits. */
  const watched = computed(() => (following.value !== null && followedView.value?.phase === 'recrutement' ? followedView.value : null));
  /** The combat on screen is the followed survivor's, not ours: its seat. */
  const spectating = ref<number | null>(null);
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
  /** Why « Prêt » is refused for now (the tutorial: budget left, a lesson waiting); null when it may go. */
  const readyRefusal = computed(() => (view.value ? (transport.refusal?.('pret') ?? null) : null));
  /** Gestures refused before they left: the tutorial's guide shakes at each one. */
  const refusals = ref(0);
  /** The desk's gestures the guard refuses for now (the tutorial's rails): their buttons go dull, like one that costs too much. */
  const deskLocks = computed<DeskLocks>(() => {
    // A survivor's table, only watched: nothing of its desk is ours to press.
    if (watched.value) return { upgrade: true, roll: true, freeze: true };
    const locked = (action: PlayerAction) => view.value !== null && (transport.refusal?.(action) ?? null) !== null;
    return { upgrade: locked({ t: 'upgrade' }), roll: locked({ t: 'roll' }), freeze: locked({ t: 'freeze' }) };
  });
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
  /** Each seat named: the hero, and online the pseudo. */
  const names = computed(() => seatNames(view.value?.table ?? [], room.value));
  /**
   * At least two people to talk, at the table or waiting for the next game: a room alone with bots, or a solo game,
   * has no chat.
   */
  const canChat = computed(() => roomHumans(room.value) > 1 || chat.value.length > 0);
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
  /** The end of turn playing is the followed survivor's, on its table: it stops with the following. */
  let watchedEndOfTurn = false;
  let eliminationShown = false;

  const screen = computed<GameScreen>(() => {
    if (combat.value) return 'combat';
    if (ranking.value) return eliminationHold.value && view.value && !view.value.alive ? 'eliminated' : 'end';
    if (queueing.value && !room.value) return 'queue';
    // The room between two games; or its game is on without us: we came in since, and wait there for the next one.
    if (room.value && (room.value.etat !== 'en_jeu' || room.value.siege < 0)) return 'waiting';
    if (!view.value) return 'loading';
    if (!view.value.alive) return watched.value ? 'watching' : 'eliminated';
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
    if (!ranking.value && !hasMovedOn(shown.round)) return;
    clearTimeout(combatTimer);
    dropCombat();
  }

  /**
   * What comes after the combat of this round is there: our next round or our fall; for a survivor still followed,
   * its next recruitment table, so that its old one never shows in between.
   */
  function hasMovedOn(round: number): boolean {
    if (spectating.value !== null && following.value !== null) return (followedView.value?.round ?? -1) > round;
    const next = view.value;
    return next !== null && (next.round > round || !next.alive);
  }

  function dropCombat(): void {
    // The followed table this combat came from is over: it never shows again.
    if (combat.value && followedView.value && followedView.value.round <= combat.value.round) followedView.value = null;
    combat.value = null;
    combatView.value = null;
    spectating.value = null;
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
    // A survivor who falls out is no longer followed: the server stops too.
    if (following.value !== null && !next.table.some((row) => row.seat === following.value && row.alive)) stopFollowing();
    view.value = next;
    deadline.value = timeLeft === null ? null : Date.now() + timeLeft;
  }

  /** Out of the game, the followed survivor's recruitment table, live: its shop, its hand, its choices, as it sees them. */
  function receiveFollowed(seat: number, next: PlayerView, timeLeft: number | null): void {
    const own = view.value;
    if (!own || own.alive || following.value !== seat) return;
    followedView.value = next;
    deadline.value = timeLeft === null ? null : Date.now() + timeLeft;
  }

  /** Nobody is followed any more: the table watched goes, with the end of turn playing on it. */
  function stopFollowing(): void {
    following.value = null;
    followedView.value = null;
    if (!watchedEndOfTurn) return;
    watchedEndOfTurn = false;
    endOfTurn.value?.destroy();
    endOfTurn.value = null;
  }

  function receiveCombat(next: CombatView): void {
    // Sent again after a reconnection: the one on screen, or one already watched, is not replayed.
    if (next.round === seenCombatRound || next.round === combat.value?.round || next.round === endOfTurnRound) return;
    const recruiting = view.value?.phase === 'recrutement' && view.value.round === next.round;
    if (next.endOfTurn.length === 0 || !recruiting) {
      showCombat(next);
      return;
    }
    watchedEndOfTurn = false;
    playEndOfTurn(next, () => showCombat(next));
  }

  /** The end of turn plays on the table first (the recruitment's last view is the board before it), then `show` opens its combat. */
  function playEndOfTurn(next: CombatView, show: () => void): void {
    endOfTurnRound = next.round;
    hasEndedRecruitment.value = true;
    const playback = new EndOfTurnPlayback(next.endOfTurn, () => {
      if (endOfTurn.value !== playback) return;
      endOfTurn.value = null;
      show();
    });
    endOfTurn.value = playback;
    playback.start();
  }

  function showCombat(next: CombatView): void {
    combatSeen = false;
    spectating.value = null;
    combatView.value = view.value;
    combat.value = next;
  }

  /**
   * Out of the game, the followed survivor's combat, live: shown from its side, with its hero and its polls. Its end
   * of turn plays first on its table, when that table is the one on screen. A combat of ours still on screen (the one
   * that eliminated us) is not cut; the same one sent again is not replayed.
   */
  function receiveSpectacle(seat: number, next: CombatView): void {
    const own = view.value;
    if (!own || own.alive) return;
    following.value = seat;
    if (combat.value && (spectating.value === null || (spectating.value === seat && combat.value.round === next.round))) return;
    if (watchedEndOfTurn && next.round === endOfTurnRound) return;
    const table = watched.value?.seat === seat && watched.value.round === next.round ? watched.value : null;
    const show = () => showFollowedCombat(seat, next, table ?? spectatorView(own, seat));
    // Its table is not on screen (followed since the combats began, or its last combat still plays): the combat comes at once.
    if (!table || combat.value || next.endOfTurn.length === 0) {
      show();
      return;
    }
    watchedEndOfTurn = true;
    playEndOfTurn(next, show);
  }

  /** `from`: the survivor's own table when it was on screen, or ours wearing its seat. */
  function showFollowedCombat(seat: number, next: CombatView, from: PlayerView): void {
    watchedEndOfTurn = false;
    clearTimeout(combatTimer);
    combatSeen = false;
    spectating.value = seat;
    combatView.value = from;
    combat.value = next;
  }

  /**
   * Out of the game, follow a survivor, or nobody (null). Its table shows as soon as the server sends it: its
   * recruitment, then its combat.
   */
  function follow(seat: number | null): void {
    stopFollowing();
    following.value = seat;
    transport.send({ type: 'suivre', siege: seat });
  }

  function resetGame(): void {
    heardVoices.forget();
    endOfTurn.value?.destroy();
    endOfTurn.value = null;
    endOfTurnRound = -1;
    view.value = null;
    dropCombat();
    stopFollowing();
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
    // A bug stopped this game only, or the host put us out of the room: back home, with what the server said.
    if (text === PARTIE_PLANTEE || text === EXCLU_DU_SALON) {
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
      case 'spectacle':
        receiveSpectacle(message.siege, message.combat);
        break;
      case 'suivi':
        receiveFollowed(message.siege, message.vue, message.reste_ms);
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

  /** The guard refuses this gesture: the player is told why, and it does not leave. */
  function refuse(action: PlayerAction | 'pret'): boolean {
    const reason = transport.refusal?.(action) ?? null;
    if (!reason) return false;
    showNotice(reason);
    refusals.value++;
    return true;
  }

  /** Sends the action. False when it did not leave: no connection, or refused on the spot. */
  function act(action: PlayerAction): boolean {
    // Out of the game, the table on screen is a survivor's: nothing on it is ours to play.
    if (view.value && !view.value.alive) return false;
    // Sent now, it would be played later on a table that has moved on: the player is told instead.
    if (connection.value !== 'open') {
      showNotice(RECONNECTING_NOTICE);
      return false;
    }
    if (refuse(action)) return false;
    updateHostLine(action);
    transport.send({ type: 'action', seq: nextSeq++, action });
    return true;
  }

  function endRecruitment(): void {
    if (refuse('pret')) return;
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
      dropCombat();
      noteElimination();
    }, COMBAT_HOLD_MS);
    releaseCombat();
    noteElimination();
  }

  /** `playerId`, here and to walk into a room: the browser's anonymous id, by which the server rates this player. */
  function createRoom(pseudo: string, options: OptionsSalon, playerId?: string): void {
    transport.send({ type: 'creer_salon', pseudo, options, ...(playerId ? { joueur: playerId } : {}) });
  }

  function joinRoom(code: string, pseudo: string, playerId?: string): void {
    transport.send({ type: 'rejoindre', code, pseudo, ...(playerId ? { joueur: playerId } : {}) });
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

  /** A new pseudo for oneself, from inside the room: for whoever walked in without choosing one. */
  function renameSelf(pseudo: string): void {
    transport.send({ type: 'renommer', pseudo });
  }

  /** The host mutes a player's chat, or gives it back: at any time, in the room or in a game. */
  function mutePlayer(pseudo: string, muted: boolean): void {
    transport.send({ type: 'muet', pseudo, oui: muted });
  }

  /** The host puts a player out of the room, for good. */
  function kickPlayer(pseudo: string): void {
    transport.send({ type: 'exclure', pseudo });
  }

  function updateRoomSettings(options: OptionsSalon): void {
    transport.send({ type: 'regler_salon', options });
  }

  /**
   * After a game, back to the room: who is still there, who came in since, the chat, and for the host the settings
   * and the next game. The ranking is left behind.
   */
  function backToRoom(): void {
    if (!room.value || room.value.etat === 'en_jeu') return;
    resetGame();
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
    room, roomGone, refused, connection, connectionLost, retry, createRoom, joinRoom, launchRoom, updateRoomSettings, renameSelf, mutePlayer, kickPlayer,
    queue, queueing, queueLost, queueLostReason, queueSeenAt, mmrChange, joinQueue, voteQueue, chat, canChat, sendChat,
    names, following, spectating, watched, follow,
    view, combat, combatView, endOfTurn, ranking, showRanking, backToRoom, notice, hostLine, hostLineCount, deadline, hasEndedRecruitment, readyRefusal, deskLocks, refusals, screen, act, endRecruitment, closeCombat, leave,
  };
}

export type GameStore = ReturnType<typeof createGameStore>;
