import 'pixi.js/unsafe-eval';
import { Application, Assets, Container, TextureSource } from 'pixi.js';
import { TRIGGER_LABELS } from '#src/client/const/effectLabels.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { KEYWORD_RULES } from '#src/client/const/keywordRules.ts';
import { CombatCard } from '#src/client/pixi/combatCard.ts';
import { FloaterLayer } from '#src/client/pixi/floaterLayer.ts';
import { ImpactLayer } from '#src/client/pixi/impactLayer.ts';
import { LightLayer } from '#src/client/pixi/lightLayer.ts';
import { loadCombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import type { CombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';
import { combatLayout } from '#src/client/tools/combatLayout.ts';
import { hitStrength } from '#src/client/tools/hitStrength.ts';
import { orderWithCorpses } from '#src/client/tools/orderWithCorpses.ts';
import { statsChangeLabel } from '#src/client/tools/statsChangeLabel.ts';
import type { CombatSides } from '#src/engine/replay.ts';
import type { CombatEvent, CombatUnit } from '#src/engine/types.ts';

const POLEMIQUE_SECONDS = 1.5;
/** A critical kill goes out in a bigger light, with a jolt of the stage: no object falls on a politician. */
const CRITICAL_LIGHT_SCALE = 1.8;
const CRITICAL_SHAKE = { seconds: 0.32, amplitude: 12 };
const DAMAGE_COLOR = '#ff5a5a';
const GAIN_COLOR = '#7dff9e';
const INFO_COLOR = '#ffd84a';
const GAIN_LIGHT = '#ffe680';
/** A hit this hard shakes the whole table for a moment. */
const SHAKE_FROM_DAMAGE = 6;
const SHAKE_SECONDS = 0.28;
const MAX_SHAKE_PX = 14;

export interface CombatStageOptions {
  host: HTMLElement;
  manifest: GameManifest;
  /** The side the player sits on: it is drawn at the bottom. */
  side: 0 | 1;
  characterIds: string[];
  /** The units killed by a critical hit: they go out in a bigger light. */
  criticalKills: Set<number>;
  speed: () => number;
  playSound: (name: SynthName, strength?: number) => void;
}

/**
 * The combat, drawn with PixiJS. It only reads the journal: every event comes from CombatPlayback,
 * with the state after that event. Effects overlap the next events and are pushed by the combat's speed.
 */
export class CombatStage {
  private readonly app = new Application();
  private readonly options: CombatStageOptions;
  private readonly cardLayer = new Container();
  private readonly floaters = new FloaterLayer();
  private readonly impacts = new ImpactLayer();
  private readonly lights = new LightLayer();
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private shake = { left: 0, amplitude: 0 };
  private readonly cards = new Map<number, CombatCard>();
  private readonly corpses = new Set<number>();
  private readonly polemiqueVictims = new Set<number>();
  private readonly pendingRemovals = new Set<number>();
  private order: [number[], number[]] = [[], []];
  private sides: CombatSides = [[], []];
  private textures!: CombatTextures;
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;
  private isStarted = false;

  constructor(options: CombatStageOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    const { host, manifest, characterIds } = this.options;
    TextureSource.defaultOptions.autoGenerateMipmaps = true;
    Assets.setPreferences({ preferWorkers: false });
    await this.app.init({
      preference: 'webgl',
      resizeTo: host,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      backgroundAlpha: 0,
      antialias: true,
    });
    this.textures = await loadCombatTextures(manifest, characterIds);
    await loadFonts();
    if (this.isDestroyed) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }
    host.append(this.app.canvas);
    this.app.stage.addChild(this.cardLayer, this.impacts.view, this.lights.view, this.floaters.view);
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS / 1000));
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(host);
    this.isStarted = true;
    this.handleResize();
  }

  /** Plays one event of the journal. `sides` is the state right after it. */
  handleEvent(event: CombatEvent, sides: CombatSides): void {
    this.sides = sides;
    this.playEvent(event);
    this.showUnits(sides);
    this.placeCards(false);
  }

  /** The player skipped: straight to the final state, nothing left playing. */
  jumpTo(sides: CombatSides): void {
    if (!this.isStarted) return;
    this.sides = sides;
    this.corpses.clear();
    this.pendingRemovals.clear();
    this.cards.forEach((card) => card.destroy());
    this.cards.clear();
    this.order = [[], []];
    this.showUnits(sides);
    this.placeCards(true);
  }

  /** Where a unit stands on the canvas, its center: the bubble of the one who celebrates goes there. */
  unitPosition(uid: number): { x: number; y: number; top: number } | null {
    const card = this.cards.get(uid);
    if (!card || this.corpses.has(uid)) return null;
    return { x: card.centerX(), y: card.centerY(), top: card.view.y };
  }

  /** The survivor who celebrates the victory: big, talking, for as long as its line lasts. */
  celebrate(uid: number, seconds: number): void {
    const card = this.cards.get(uid);
    if (!card) return;
    this.cardLayer.addChild(card.view);
    card.celebrate(seconds);
  }

  destroy(): void {
    this.isDestroyed = true;
    this.resizeObserver?.disconnect();
    // Still starting (the player left a combat that was loading): start() destroys the app itself once
    // it is ready. Destroying it twice throws inside PixiJS.
    if (this.isStarted) {
      this.lights.destroy();
      this.app.destroy({ removeView: true }, { children: true });
    }
  }

  private playEvent(event: CombatEvent): void {
    switch (event.e) {
      case 'debut':
        return;
      case 'attaque':
        this.playAttack(event.from, event.to);
        return;
      case 'degats':
        this.playHit(event.uid, event.value);
        return;
      case 'immunite':
        this.cards.get(event.uid)?.playEffect('immunite');
        this.lightAt(event.uid, (x, y) => this.lights.shield(x, y));
        this.float(event.uid, KEYWORD_RULES.immunite.label, INFO_COLOR);
        this.options.playSound('clang', 0.6);
        return;
      case 'resiste':
        this.cards.get(event.uid)?.playEffect('immunite');
        this.float(event.uid, 'Résiste !', INFO_COLOR);
        this.options.playSound('clang', 0.6);
        return;
      case 'polemique':
        this.polemiqueVictims.add(event.uid);
        this.cards.get(event.uid)?.playEffect('polemique');
        return;
      case 'stats':
        this.floatStatsChange(event.uid, event.atk, event.hp);
        return;
      case 'mot_cle':
        this.float(event.uid, `${event.gain ? '+' : '−'} ${KEYWORD_RULES[event.keyword].label}`, INFO_COLOR);
        return;
      case 'effet':
        this.cards.get(event.uid)?.talk();
        this.float(event.uid, `${TRIGGER_LABELS[event.when]} !`, INFO_COLOR);
        return;
      case 'mort':
        this.playDeath(event.uid, event.revient);
        return;
      case 'retour':
        this.cards.get(event.uid)?.comeBack();
        this.options.playSound('discover');
        return;
      case 'penalite':
        this.float(event.uid, `−${event.value} sondages`, DAMAGE_COLOR);
        return;
      case 'exil':
        this.removeCard(event.uid);
        return;
      default:
    }
  }

  private playAttack(from: number, to: number): void {
    const attacker = this.cards.get(from);
    const target = this.cards.get(to);
    if (!attacker || !target) return;
    this.cardLayer.addChild(attacker.view);
    attacker.attack(target);
    this.options.playSound('lunge');
  }

  /** A manga flash on the one hit, its number popping out, a padded punch; the hardest blows shake the table. */
  private playHit(uid: number, value: number): void {
    const card = this.cards.get(uid);
    if (!card) return;
    const strength = hitStrength(value, card.hp);
    card.takeHit();
    if (!this.reducedMotion) {
      this.impacts.add(card.centerX(), card.centerY() - 10, strength * 0.7);
      this.lights.hit(card.centerX(), card.centerY() - 10, strength);
    }
    this.floaters.add(`−${value}`, DAMAGE_COLOR, card.centerX(), card.centerY(), 'damage', 0.8 + strength * 0.25);
    this.options.playSound('hit', strength);
    if (value >= SHAKE_FROM_DAMAGE && !this.reducedMotion) this.shake = { left: SHAKE_SECONDS, amplitude: Math.min(MAX_SHAKE_PX, 4 + value) };
  }

  /**
   * A politician goes out in light, a bigger one after a critical hit. Nothing falls on a politician
   * (decision of 3 November 2026): a comeback is dazed by its birds, a Polémique victim is squashed flat.
   */
  private playDeath(uid: number, comesBack: boolean): void {
    const card = this.cards.get(uid);
    if (!card) return;
    this.cardLayer.addChild(card.view);
    const critical = this.options.criticalKills.has(uid);
    if (!this.reducedMotion) {
      this.lights.death(card.centerX(), card.centerY(), card.view.scale.x * (critical ? CRITICAL_LIGHT_SCALE : 1));
      if (critical) this.shake = { left: CRITICAL_SHAKE.seconds, amplitude: CRITICAL_SHAKE.amplitude };
    }
    if (comesBack) {
      this.options.playSound('fall', 0.5);
      card.showBirds();
      return;
    }
    this.corpses.add(uid);
    if (this.polemiqueVictims.delete(uid)) {
      card.flatten();
      this.options.playSound('scandal');
      card.after(POLEMIQUE_SECONDS, () => this.removeCard(uid));
      return;
    }
    this.options.playSound('fall', critical ? 0.9 : 0.5);
    card.dissolve(() => this.removeCard(uid));
  }

  /** Effects call this from inside a card's update: the card goes away once the tick is over. */
  private removeCard(uid: number): void {
    this.pendingRemovals.add(uid);
  }

  private removePendingCards(): void {
    this.pendingRemovals.forEach((uid) => this.destroyCard(uid));
    this.pendingRemovals.clear();
  }

  private destroyCard(uid: number): void {
    this.corpses.delete(uid);
    this.cards.get(uid)?.destroy();
    this.cards.delete(uid);
    this.order = [this.order[0].filter((other) => other !== uid), this.order[1].filter((other) => other !== uid)];
    this.placeCards(false);
  }

  private floatStatsChange(uid: number, atk: number, hp: number): void {
    const card = this.cards.get(uid);
    const label = card && statsChangeLabel(card.atk, card.hp, atk, hp);
    if (!label) return;
    this.float(uid, label, GAIN_COLOR);
    if (atk >= (card?.atk ?? 0) && hp >= (card?.hp ?? 0)) this.lightAt(uid, (x, y) => this.lights.gain(x, y, GAIN_LIGHT));
  }

  /** A light on a card, unless the player asked for less motion. */
  private lightAt(uid: number, play: (x: number, y: number) => void): void {
    const card = this.cards.get(uid);
    if (card && !this.reducedMotion) play(card.centerX(), card.centerY());
  }

  private float(uid: number, label: string, color: string): void {
    const card = this.cards.get(uid);
    if (!card) return;
    this.floaters.add(label, color, card.centerX(), card.centerY());
  }

  /** Creates the units that just appeared, and refreshes every number and keyword. */
  private showUnits(sides: CombatSides): void {
    for (const unit of [...sides[0], ...sides[1]]) this.showUnit(unit);
    this.order = [
      orderWithCorpses(this.order[0], sides[0].map((unit) => unit.uid), this.corpses),
      orderWithCorpses(this.order[1], sides[1].map((unit) => unit.uid), this.corpses),
    ];
  }

  private showUnit(unit: CombatUnit): void {
    const existing = this.cards.get(unit.uid);
    if (existing) {
      existing.show(unit);
      return;
    }
    const card = new CombatCard(unit, this.options.manifest, this.textures);
    this.cards.set(unit.uid, card);
    this.cardLayer.addChild(card.view);
  }

  private placeCards(jump: boolean): void {
    const ownOrder = this.order[this.options.side];
    const enemyOrder = this.order[this.options.side === 0 ? 1 : 0];
    // The screen in CSS pixels, as the DOM table is laid out. (renderer.width is already in CSS pixels in
    // PixiJS 8: dividing it by the resolution shrank the table toward the top left on any screen with a
    // device pixel ratio above 1.)
    const { screen } = this.app.renderer;
    const layout = combatLayout(screen.width, screen.height, enemyOrder.length, ownOrder.length);
    const place = (uid: number, position: { x: number; y: number }) => {
      const card = this.cards.get(uid);
      if (!card) return;
      card.moveTo(position.x, position.y, layout.scale);
      if (jump) card.jumpToTarget();
    };
    enemyOrder.forEach((uid, index) => place(uid, layout.enemy[index]));
    ownOrder.forEach((uid, index) => place(uid, layout.own[index]));
  }

  private handleResize(): void {
    this.app.resize();
    this.placeCards(true);
  }

  private update(realDeltaSeconds: number): void {
    const deltaSeconds = realDeltaSeconds * this.options.speed();
    this.cards.forEach((card) => card.update(deltaSeconds, realDeltaSeconds));
    this.removePendingCards();
    this.impacts.update(deltaSeconds);
    this.lights.update(deltaSeconds);
    this.floaters.update(deltaSeconds);
    this.updateShake(deltaSeconds);
  }

  /** The table trembles, less and less, then stands still exactly where it was. */
  private updateShake(deltaSeconds: number): void {
    if (this.shake.left <= 0) return;
    this.shake.left = Math.max(0, this.shake.left - deltaSeconds);
    const amplitude = this.shake.amplitude * (this.shake.left / SHAKE_SECONDS);
    this.app.stage.position.set((Math.random() * 2 - 1) * amplitude, (Math.random() * 2 - 1) * amplitude);
  }

}

async function loadFonts(): Promise<void> {
  await Promise.all(['800 40px "Alegreya Sans SC"', '700 28px "Alegreya Sans"', '72px Bangers'].map((font) => document.fonts.load(font)));
}
