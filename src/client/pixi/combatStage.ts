import 'pixi.js/unsafe-eval';
import { Application, Assets, Container, TextureSource } from 'pixi.js';
import { TRIGGER_LABELS } from '#src/client/const/effectLabels.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { KEYWORD_RULES } from '#src/client/const/keywordRules.ts';
import { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { SheetFrames } from '#src/client/pixi/deaths/deathScene.ts';
import { playDeath } from '#src/client/pixi/deaths/playDeath.ts';
import { STRIKE_LANDS_MS, heroStrike } from '#src/client/pixi/heroStrike.ts';
import type { StrikeTarget } from '#src/client/pixi/heroStrike.ts';
import { loadCombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import type { CombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import { StageBlows } from '#src/client/pixi/stageBlows.ts';
import { StageFx } from '#src/client/pixi/stageFx.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';
import { combatLayout } from '#src/client/tools/combatLayout.ts';
import type { DeathKind } from '#src/client/tools/deathKind.ts';
import { deathPlayed } from '#src/client/tools/deathPlayed.ts';
import { orderWithCorpses } from '#src/client/tools/orderWithCorpses.ts';
import type { DeathPlan } from '#src/client/tools/planDeaths.ts';
import { statsChangeLabel } from '#src/client/tools/statsChangeLabel.ts';
import type { CombatSides } from '#src/engine/replay.ts';
import type { CombatEvent, CombatUnit } from '#src/engine/types.ts';

const GAIN_COLOR = '#7dff9e';
const INFO_COLOR = '#ffd84a';
const REBIRTH_COLOR = '#8fd8ff';
const SWEEP_COLOR = '#ffb05a';
const DAMAGE_COLOR = '#ff5a5a';
const GAIN_LIGHT = '#ffe680';
/** These deaths play where the politician stood: its place in the row waits for them. */
const IN_PLACE: ReadonlySet<DeathKind> = new Set(['burn', 'tv-off', 'light']);
/** The finale's slow motion, in milliseconds of the combat at normal speed: the result waits for it. */
const FINALE_HOLD_MS = 1100;
const NO_PLAN: DeathPlan = { kind: 'eject', finale: false };
/** The comets of the strike on the beaten hero: gold when you strike, red when you are struck. */
const STRIKE_COLORS = { own: '#ffd84a', enemy: '#ff4a3a' };

export interface CombatStageOptions {
  host: HTMLElement;
  manifest: GameManifest;
  /** The side the player sits on: it is drawn at the bottom. */
  side: 0 | 1;
  characterIds: string[];
  /** How each politician dies (planDeaths), by uid. */
  deaths: Map<number, DeathPlan>;
  speed: () => number;
  playSound: (name: SynthName, strength?: number) => void;
  /** Where the medallions stand: the computer's table (combatLayout), or the phone held upright. */
  layout?: typeof combatLayout;
  /** The combat's finale plays in slow motion: the journal waits this long before going on. */
  holdPlayback?: (ms: number) => void;
  /** A big shock: the TV set around the stage flickers with it (0.45 to 1). */
  onShock?: (strength: number) => void;
}

/**
 * The combat, drawn with PixiJS. It only reads the journal: every event comes from CombatPlayback, with the state
 * after that event. Effects overlap the next events and are pushed by the combat's speed; StageFx makes every blow
 * felt, StageBlows plays the attacks, and each death plays its own way (deaths/).
 */
export class CombatStage {
  private readonly app = new Application();
  private readonly options: CombatStageOptions;
  private readonly cardLayer = new Container();
  private fx!: StageFx;
  private blows!: StageBlows;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly cards = new Map<number, CombatCard>();
  /** Dead, still playing their death where they stood: their place in the row waits. */
  private readonly corpses = new Set<number>();
  private order: [number[], number[]] = [[], []];
  /** The medallions' scale on the stage (1 on a computer's 1080p table, about a third on a phone): every effect follows it. */
  private fxScale = 1;
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
    this.fx = new StageFx(this.cardLayer, {
      renderer: this.app.renderer,
      reducedMotion: this.reducedMotion,
      screen: () => this.app.renderer.screen,
      sheet: (name) => this.sheet(name),
      sound: this.options.playSound,
      onShock: this.options.onShock,
    });
    this.blows = new StageBlows({
      fx: this.fx,
      reducedMotion: this.reducedMotion,
      playSound: this.options.playSound,
      cardOf: (uid) => this.cards.get(uid),
      isOwn: (uid) => this.order[this.options.side].includes(uid),
    });
    host.append(this.app.canvas);
    this.app.stage.addChild(this.fx.view);
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS / 1000));
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(host);
    this.isStarted = true;
    this.handleResize();
  }

  /** Plays one event of the journal. `sides` is the state right after it. */
  handleEvent(event: CombatEvent, sides: CombatSides): void {
    this.playEvent(event);
    this.showUnits(sides);
    this.placeCards(false);
    // A reincarnation only has its card once the units are shown.
    if (event.e === 'retour') this.playRebirth(event.unit.uid);
  }

  /** The player skipped: straight to the final state, nothing left playing. */
  jumpTo(sides: CombatSides): void {
    if (!this.isStarted) return;
    this.fx.clear();
    this.corpses.clear();
    this.cards.forEach((card) => card.destroy());
    this.cards.clear();
    this.order = [[], []];
    this.showUnits(sides);
    this.placeCards(true);
  }

  /** Where a unit stands on the canvas, its center: the bubble of the one who celebrates goes there. */
  unitPosition(uid: number): { x: number; y: number; top: number } | null {
    const card = this.cards.get(uid);
    if (!card) return null;
    return { x: card.centerX(), y: card.centerY(), top: card.view.y };
  }

  /** The survivor who celebrates the victory: big, talking, for as long as its line lasts. */
  celebrate(uid: number, seconds: number): void {
    const card = this.cards.get(uid);
    if (!card) return;
    this.cardLayer.addChild(card.view);
    card.celebrate(seconds);
  }

  /** The player passed the line: whoever celebrates is back in its row. */
  endCelebration(): void {
    this.cards.forEach((card) => card.stopCelebrating());
  }

  /**
   * The winners strike the beaten hero (`target`, its portrait's middle on the page): a comet from each survivor of
   * the winning side (`own`: the player's). Returns how long until the first one lands, in page milliseconds, 0 when
   * nobody is left to strike or the player asked for less motion.
   */
  strike(winner: 'own' | 'enemy', target: StrikeTarget): number {
    if (!this.isStarted || this.reducedMotion) return 0;
    const side = winner === 'own' ? this.options.side : this.options.side === 0 ? 1 : 0;
    const sources = this.order[side].flatMap((uid) => {
      const card = this.cards.get(uid);
      return card ? [{ x: card.centerX(), y: card.centerY(), scale: card.scale }] : [];
    });
    if (sources.length === 0) return 0;
    const color = winner === 'own' ? STRIKE_COLORS.own : STRIKE_COLORS.enemy;
    this.fx.play(heroStrike(this.fx, sources, target, color, this.options.playSound));
    return STRIKE_LANDS_MS / this.options.speed();
  }

  destroy(): void {
    this.isDestroyed = true;
    this.resizeObserver?.disconnect();
    // Still starting (the player left a combat that was loading): start() destroys the app itself once
    // it is ready. Destroying it twice throws inside PixiJS.
    // The renderer goes first: the effects' own textures are destroyed once nothing can still be bound to them.
    if (this.isStarted) {
      this.app.destroy({ removeView: true }, { children: true });
      this.fx.destroy();
    }
  }

  private playEvent(event: CombatEvent): void {
    switch (event.e) {
      case 'attaque':
        this.playAttack(event.from, event.to);
        return;
      case 'degats':
        this.withCard(event.uid, (card) => this.blows.hit(card, event.value));
        return;
      case 'immunite':
        this.withCard(event.uid, (card) => this.blows.shieldBreak(card));
        this.float(event.uid, KEYWORD_RULES.immunite.label, INFO_COLOR);
        return;
      case 'resiste':
        this.cards.get(event.uid)?.playEffect('immunite');
        this.float(event.uid, 'Résiste !', INFO_COLOR);
        this.options.playSound('clang', 0.6);
        return;
      case 'polemique':
        this.cards.get(event.uid)?.playEffect('polemique');
        this.lightAt(event.uid, (x, y) => this.fx.lights.gain(x, y, '#9dff5a', this.fxScale));
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
        this.playFall(event.uid);
        return;
      case 'penalite':
        this.float(event.uid, `−${event.value} sondages`, DAMAGE_COLOR);
        return;
      case 'exil':
        this.cards.get(event.uid)?.destroy();
        this.cards.delete(event.uid);
        return;
      default:
    }
  }

  private withCard(uid: number, play: (card: CombatCard) => void): void {
    const card = this.cards.get(uid);
    if (card) play(card);
  }

  private playAttack(from: number, to: number): void {
    const attacker = this.cards.get(from);
    const target = this.cards.get(to);
    if (!attacker || !target) return;
    this.cardLayer.addChild(attacker.view);
    this.blows.attack(attacker, target);
    // The Coup de balai hits the target's neighbours too: their blows follow in the journal, the sweep is named here.
    if (attacker.hasKeyword('balai')) this.float(to, `${KEYWORD_RULES.balai.label} !`, SWEEP_COLOR);
  }

  /**
   * A Retour en politique: the politician died for good, its Héritage played, and its reincarnation comes down in a
   * blue light where it fell, with its name on it.
   */
  private playRebirth(uid: number): void {
    const card = this.cards.get(uid);
    if (!card) return;
    card.reincarnate();
    this.options.playSound('discover');
    this.float(uid, KEYWORD_RULES.retour.label, REBIRTH_COLOR);
    this.lightAt(uid, (x, y) => this.fx.lights.rebirth(x, y, card.scale));
  }

  /**
   * A politician falls and dies its own death (planDeaths): thrown out, broken, blown up, burnt, off the air… Even a
   * Retour en politique: its reincarnation is a new medallion. The death owns the medallion from now on. The finale
   * plays in slow motion, and the journal waits for it.
   */
  private playFall(uid: number): void {
    const card = this.cards.get(uid);
    if (!card) return;
    const plan = this.options.deaths.get(uid) ?? NO_PLAN;
    if (plan.finale) {
      this.fx.finale(card.centerX(), card.centerY());
      this.options.holdPlayback?.(FINALE_HOLD_MS / this.options.speed());
    }
    this.cards.delete(uid);
    const kind = deathPlayed(plan.kind, this.reducedMotion, this.app.renderer.name === 'webgl');
    if (IN_PLACE.has(kind)) this.corpses.add(uid);
    else this.fx.deathLayer.addChild(card.view);
    const death = playDeath(kind, card, this.fx.scene, this.blows.lastBlow(uid));
    this.fx.play({
      update: (deltaSeconds) => death.update(deltaSeconds),
      destroy: () => {
        death.destroy();
        this.freePlace(uid);
      },
    });
  }

  /** A death that played where its politician stood is over: the row closes up. */
  private freePlace(uid: number): void {
    if (!this.corpses.delete(uid) || this.isDestroyed) return;
    this.order = [this.order[0].filter((other) => other !== uid), this.order[1].filter((other) => other !== uid)];
    this.placeCards(false);
  }

  private floatStatsChange(uid: number, atk: number, hp: number): void {
    const card = this.cards.get(uid);
    const label = card && statsChangeLabel(card.atk, card.hp, atk, hp);
    if (!label) return;
    this.float(uid, label, GAIN_COLOR);
    if (atk >= (card?.atk ?? 0) && hp >= (card?.hp ?? 0)) this.lightAt(uid, (x, y) => this.fx.lights.gain(x, y, GAIN_LIGHT, this.fxScale));
  }

  /** A light on a card, unless the player asked for less motion. */
  private lightAt(uid: number, play: (x: number, y: number) => void): void {
    const card = this.cards.get(uid);
    if (card && !this.reducedMotion) play(card.centerX(), card.centerY());
  }

  private float(uid: number, label: string, color: string): void {
    const card = this.cards.get(uid);
    if (!card) return;
    this.fx.floaters.add(label, color, card.centerX(), card.centerY());
  }

  private sheet(name: string): SheetFrames | null {
    const frames = this.textures.effects[name];
    const art = this.options.manifest.effets[name];
    return frames && art ? { frames, art } : null;
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
    const layout = (this.options.layout ?? combatLayout)(screen.width, screen.height, enemyOrder.length, ownOrder.length);
    this.fxScale = layout.scale;
    this.fx.setScale(layout.scale);
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
    const deltaSeconds = this.fx.update(realDeltaSeconds, this.options.speed());
    this.cards.forEach((card) => card.update(deltaSeconds, realDeltaSeconds));
  }
}

async function loadFonts(): Promise<void> {
  await Promise.all(['800 40px "Alegreya Sans SC"', '700 28px "Alegreya Sans"', '72px Bangers'].map((font) => document.fonts.load(font, 'Bangers 0123456789')));
}
