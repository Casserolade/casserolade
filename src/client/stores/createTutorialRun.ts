import { shallowRef } from 'vue';
import { createLocalTransport } from '#src/client/services/createLocalTransport.ts';
import { animateurFor } from '#src/data/animateurs.ts';
import type { ActionGuard } from '#src/client/stores/createGameStore.ts';
import { TUTORIEL } from '#src/data/histoire/tutoriel.ts';
import { PLATEAUX, SECOND_TOUR } from '#src/data/plateaux.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { PlayerAction } from '#src/engine/types.ts';
import type { ResultatCombat } from '#src/histoire/campagne.ts';
import { composerTutoriel, creerGuide, refusTutoriel } from '#src/histoire/tutoriel.ts';
import type { Consigne } from '#src/histoire/tutoriel.ts';
import type { ClientMessage, ServerMessage } from '#src/protocol/messages.ts';
import type { Transport } from '#src/protocol/transport.ts';
import { generateSeed } from '#src/server/generateSeed.ts';

const HUMAN_SEAT = 0;
/** The step that says everything was seen: the tutorial counts as done once it shows. */
const LAST_STEP = 'victoire';

/**
 * One run of the tutorial: a local game with a scripted shop, between the game store and the room.
 * It forwards every message and, from the player's view only, keeps the one instruction to show:
 * the round's first lesson not done yet, or a reminder. Nothing to click to make it go: doing it is enough.
 * It is on rails: the store asks it first, and a gesture the instruction does not allow never leaves.
 */
export class TutorialRun implements Transport, ActionGuard {
  readonly step = shallowRef<Consigne | null>(null);
  /** Every step was seen: the career comes next. */
  readonly learned = shallowRef(false);
  /** The human's final place, once the game is over. */
  readonly place = shallowRef<number | null>(null);
  private readonly guide = creerGuide();
  /** The last view shown to the player: the rails read it. */
  private readonly view = shallowRef<PlayerView | null>(null);
  private readonly inner: Transport;
  private readonly plateau = PLATEAUX.find((p) => p.id === TUTORIEL.plateau) ?? SECOND_TOUR;
  private pendingCombat: ResultatCombat | undefined;
  private listener: (message: ServerMessage) => void = () => {};

  constructor(seed = generateSeed()) {
    const table = composerTutoriel(seed);
    this.inner = createLocalTransport({
      pseudo: 'Vous',
      botLevel: 'facile',
      seed,
      seats: table.sieges.map((seat, index) => ({ pseudo: index === HUMAN_SEAT ? 'Vous' : `Bot ${index}`, level: seat.level })),
      game: table.game,
    });
    this.inner.onMessage((message) => this.receive(message));
  }

  send(message: ClientMessage): void {
    this.inner.send(message);
  }

  onMessage(listener: (message: ServerMessage) => void): void {
    this.listener = listener;
  }

  onClose(listener: () => void): void {
    this.inner.onClose(listener);
  }

  close(): void {
    this.inner.close();
  }

  refusal(action: PlayerAction | 'pret'): string | null {
    const view = this.view.value;
    return view && view.phase === 'recrutement' ? refusTutoriel(this.step.value, view, action) : null;
  }

  private receive(message: ServerMessage): void {
    if (message.type === 'vue') {
      // One TV set for the whole lesson: France 3, where everyone starts.
      const vue: PlayerView = { ...message.vue, plateau: this.plateau, animateur: animateurFor(this.plateau.id) };
      this.follow(vue);
      this.listener({ ...message, vue });
      return;
    }
    if (message.type === 'combat') {
      const { winner, side } = message.combat;
      this.pendingCombat = { gagne: winner === side, perdu: winner !== null && winner !== side };
    }
    if (message.type === 'fin') {
      this.place.value = message.classement.find((row) => row.seat === HUMAN_SEAT)?.place ?? message.classement.length;
      this.step.value = null;
    }
    this.listener(message);
  }

  private follow(view: PlayerView): void {
    const next = this.guide.observer(view, this.pendingCombat);
    this.pendingCombat = undefined;
    this.view.value = view;
    this.step.value = next;
    if (next.cle === LAST_STEP) this.learned.value = true;
  }
}
