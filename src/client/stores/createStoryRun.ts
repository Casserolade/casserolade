import { shallowRef } from 'vue';
import { createLocalTransport } from '#src/client/services/createLocalTransport.ts';
import { storyLineDelayMs } from '#src/client/tools/storyLineDelayMs.ts';
import { animateurFor } from '#src/data/animateurs.ts';
import type { Chapitre, Ligne } from '#src/data/histoire/chapitres.ts';
import { PLATEAUX, SECOND_TOUR } from '#src/data/plateaux.ts';
import type { Plateau } from '#src/data/plateaux.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { composerTable, creerSuivi, plateauDuChapitre } from '#src/histoire/campagne.ts';
import type { Bilan, ResultatCombat } from '#src/histoire/campagne.ts';
import type { ClientMessage, ServerMessage } from '#src/protocol/messages.ts';
import type { Transport } from '#src/protocol/transport.ts';
import { generateSeed } from '#src/server/generateSeed.ts';

const HUMAN_SEAT = 0;

function findPlateau(id: string): Plateau {
  return PLATEAUX.find((plateau) => plateau.id === id) ?? SECOND_TOUR;
}

/**
 * One attempt at a chapter. It sits between the game store and the local game: it forwards every
 * message, follows what the player does from their view only, and queues what the story has to say.
 */
export class StoryRun implements Transport {
  /** The line on screen. It stays until the next one has waited its reading time: nothing to click. */
  readonly currentLine = shallowRef<Ligne | null>(null);
  readonly bilan = shallowRef<Bilan | null>(null);
  readonly bossId: string | null;
  private readonly chapter: Chapitre;
  private readonly tracker;
  private readonly inner: Transport;
  private lastView: PlayerView | null = null;
  private pendingCombat: ResultatCombat | undefined;
  private readonly waitingLines: Ligne[] = [];
  private lineTimer = 0;
  private listener: (message: ServerMessage) => void = () => {};

  constructor(chapter: Chapitre, heroId: string, campaignBossId: string) {
    this.chapter = chapter;
    this.tracker = creerSuivi(chapter);
    const seed = generateSeed();
    const table = composerTable(chapter, heroId, seed, campaignBossId);
    this.bossId = table.bossId;
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
    window.clearTimeout(this.lineTimer);
    this.inner.close();
  }

  private receive(message: ServerMessage): void {
    if (message.type === 'vue') {
      const vue = this.onChapterSet(message.vue);
      this.followView(vue);
      this.listener({ ...message, vue });
      return;
    }
    if (message.type === 'combat') {
      const { winner, side } = message.combat;
      this.pendingCombat = { gagne: winner === side, perdu: winner !== null && winner !== side };
    }
    if (message.type === 'fin' && this.lastView) {
      const place = message.classement.find((row) => row.seat === HUMAN_SEAT)?.place ?? message.classement.length;
      this.bilan.value = this.tracker.conclure(this.lastView, place);
    }
    this.listener(message);
  }

  /** A chapter has its own TV sets: the ones of the free game follow the round number. */
  private onChapterSet(view: PlayerView): PlayerView {
    const plateau = findPlateau(plateauDuChapitre(this.chapter, view.round));
    return { ...view, plateau, animateur: animateurFor(plateau.id) };
  }

  private followView(view: PlayerView): void {
    this.lastView = view;
    const said = this.tracker.observer(view, this.pendingCombat);
    this.pendingCombat = undefined;
    this.waitingLines.push(...said);
    if (this.lineTimer === 0) this.showNextLine();
  }

  private showNextLine(): void {
    const next = this.waitingLines.shift();
    this.lineTimer = 0;
    if (!next) return;
    this.currentLine.value = next;
    this.lineTimer = window.setTimeout(() => this.showNextLine(), storyLineDelayMs(next.texte));
  }
}
