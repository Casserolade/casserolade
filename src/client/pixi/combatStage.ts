import 'pixi.js/unsafe-eval';
import { Application, Assets, Container, TextureSource } from 'pixi.js';
import { TRIGGER_LABELS } from '#src/client/const/effectLabels.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { KEYWORD_RULES } from '#src/client/const/keywordRules.ts';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { KillingBlowFx, SheetFrames } from '#src/client/pixi/deaths/deathScene.ts';
import { playDeath } from '#src/client/pixi/deaths/playDeath.ts';
import { loadCombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import type { CombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import { sparkBurst } from '#src/client/pixi/particleBursts.ts';
import { StageFx } from '#src/client/pixi/stageFx.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';
import { combatLayout } from '#src/client/tools/combatLayout.ts';
import { compactStat } from '#src/client/tools/compactStat.ts';
import type { DeathKind } from '#src/client/tools/deathKind.ts';
import { deathPlayed } from '#src/client/tools/deathPlayed.ts';
import { hitStopSeconds } from '#src/client/tools/hitStopSeconds.ts';
import { hitStrength } from '#src/client/tools/hitStrength.ts';
import { hitTrauma } from '#src/client/tools/hitTrauma.ts';
import { orderWithCorpses } from '#src/client/tools/orderWithCorpses.ts';
import type { DeathPlan } from '#src/client/tools/planDeaths.ts';
import { statsChangeLabel } from '#src/client/tools/statsChangeLabel.ts';
import type { CombatSides } from '#src/engine/replay.ts';
import type { CombatEvent, CombatUnit } from '#src/engine/types.ts';

const GAIN_COLOR = '#7dff9e';
const INFO_COLOR = '#ffd84a';
const DAMAGE_COLOR = '#ff5a5a';
const GAIN_LIGHT = '#ffe680';
const SHIELD_SPARKS = ['#ffffff', '#bff0ff', '#7fd8ff'];
/** A blow this hard bends the table under a small shock ring. */
const RINGING_STRENGTH = 1.6;
/** Where a blow lands: this share of the medallion's width from its center, toward the one who struck. */
const CONTACT_REACH = 0.42;
/** The damage badge: its size from the blow's strength, how long it stays; a killing blow's sits above its victim. */
const BADGE = { scale: 0.55, perStrength: 0.15, seconds: 0.85, lethalSeconds: 0.6, lethalLift: 0.62, smallest: 0.5 };
/** These deaths play where the politician stood: its place in the row waits for them. */
const IN_PLACE: ReadonlySet<DeathKind> = new Set(['burn', 'tv-off', 'light']);
/** The finale's slow motion, in milliseconds of the combat at normal speed: the result waits for it. */
const FINALE_HOLD_MS = 1100;
const NO_PLAN: DeathPlan = { kind: 'eject', finale: false };

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
 * after that event. Effects overlap the next events and are pushed by the combat's speed; StageFx makes every blow felt.
 */
export class CombatStage {
  private readonly app = new Application();
  private readonly options: CombatStageOptions;
  private readonly cardLayer = new Container();
  private fx!: StageFx;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly cards = new Map<number, CombatCard>();
  /** Dead, still playing their death where they stood: their place in the row waits. */
  private readonly corpses = new Set<number>();
  /** The last blow each one took: where it came from and how hard, for the death that may follow. */
  private readonly lastBlows = new Map<number, KillingBlowFx>();
  /** The attack playing now: its two blows fly from one to the other. */
  private exchange: { from: number; to: number } | null = null;
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

  destroy(): void {
    this.isDestroyed = true;
    this.resizeObserver?.disconnect();
    // Still starting (the player left a combat that was loading): start() destroys the app itself once
    // it is ready. Destroying it twice throws inside PixiJS.
    if (this.isStarted) {
      this.fx.destroy();
      this.app.destroy({ removeView: true }, { children: true });
    }
  }

  private playEvent(event: CombatEvent): void {
    switch (event.e) {
      case 'attaque':
        this.playAttack(event.from, event.to);
        return;
      case 'degats':
        this.playHit(event.uid, event.value);
        return;
      case 'immunite':
        this.playShieldBreak(event.uid);
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
        this.playFall(event.uid, event.revient);
        return;
      case 'retour':
        this.cards.get(event.uid)?.comeBack();
        this.options.playSound('discover');
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

  private playAttack(from: number, to: number): void {
    const attacker = this.cards.get(from);
    const target = this.cards.get(to);
    if (!attacker || !target) return;
    this.exchange = { from, to };
    this.cardLayer.addChild(attacker.view);
    attacker.attack(target);
    this.options.playSound('lunge');
  }

  /**
   * A blow lands: the stage freezes on the contact (hit-stop), the medallion blinks white and is knocked back, sparks
   * fly from the contact, its damage pops on a red splat and bounces; the harder, the more the camera shakes.
   */
  private playHit(uid: number, value: number): void {
    const card = this.cards.get(uid);
    if (!card) return;
    const strength = hitStrength(value, card.hp);
    const { x: dirX, y: dirY } = this.blowDirection(card);
    this.lastBlows.set(uid, { dirX, dirY, strength });
    card.takeHit(dirX, dirY, strength);
    this.fx.clock.freeze(hitStopSeconds(strength));
    this.fx.addShake(hitTrauma(strength));
    const reach = MEDALLION_LAYOUT.width * card.scale * CONTACT_REACH;
    const contactX = card.centerX() - dirX * reach;
    const contactY = card.centerY() - dirY * reach;
    if (!this.reducedMotion) {
      this.fx.impacts.add(contactX, contactY, strength * 0.7, card.scale);
      this.fx.lights.hit(contactX, contactY, strength, card.scale);
      sparkBurst(this.fx.particles, contactX, contactY, dirX, dirY, strength, undefined, undefined, card.scale);
      if (strength >= RINGING_STRENGTH) this.fx.shockwave(contactX, contactY, 0.45 * card.scale);
    }
    // A killing blow's badge sits above its victim and goes sooner: the death is what counts.
    const lethal = value >= card.hp;
    const badgeY = card.centerY() - (lethal ? MEDALLION_LAYOUT.height * card.scale * BADGE.lethalLift : 6);
    const badgeScale = (BADGE.scale + strength * BADGE.perStrength) * Math.max(BADGE.smallest, card.scale);
    this.fx.badges.add(`−${compactStat(value)}`, card.centerX(), badgeY, badgeScale, lethal ? BADGE.lethalSeconds : BADGE.seconds);
    this.options.playSound('hit', strength);
  }

  /** An Immunité breaks: a blue flash, the bubble bursting into shards of light. */
  private playShieldBreak(uid: number): void {
    const card = this.cards.get(uid);
    if (!card) return;
    card.playEffect('immunite');
    const { x: dirX, y: dirY } = this.blowDirection(card);
    if (!this.reducedMotion) {
      this.fx.lights.shield(card.centerX(), card.centerY(), card.scale);
      sparkBurst(this.fx.particles, card.centerX(), card.centerY(), dirX, dirY, 1.4, Math.PI, SHIELD_SPARKS, card.scale);
    }
    this.fx.clock.freeze(0.05);
    this.fx.addShake(0.15);
    this.float(uid, KEYWORD_RULES.immunite.label, INFO_COLOR);
    this.options.playSound('clang', 0.6);
  }

  /**
   * A politician falls. One that comes back is dazed by its birds; any other dies its own death (planDeaths): thrown
   * out, broken, blown up, burnt, off the air… The death owns the medallion from now on. The finale plays in slow
   * motion, and the journal waits for it.
   */
  private playFall(uid: number, comesBack: boolean): void {
    const card = this.cards.get(uid);
    if (!card) return;
    if (comesBack) {
      this.options.playSound('fall', 0.5);
      this.lightAt(uid, (x, y) => this.fx.lights.death(x, y, card.scale * 0.7));
      card.showBirds();
      return;
    }
    const plan = this.options.deaths.get(uid) ?? NO_PLAN;
    const blow = this.lastBlows.get(uid) ?? { dirX: 0, dirY: this.isOwn(uid) ? 1 : -1, strength: 1 };
    if (plan.finale) {
      this.fx.finale(card.centerX(), card.centerY());
      this.options.holdPlayback?.(FINALE_HOLD_MS / this.options.speed());
    }
    this.cards.delete(uid);
    const kind = deathPlayed(plan.kind, this.reducedMotion, this.app.renderer.name === 'webgl');
    if (IN_PLACE.has(kind)) this.corpses.add(uid);
    else this.fx.deathLayer.addChild(card.view);
    const death = playDeath(kind, card, this.fx.scene, blow);
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

  /** Where the blow on this medallion comes from: the other one of the attack playing now, or straight across. */
  private blowDirection(card: CombatCard): { x: number; y: number } {
    const exchange = this.exchange;
    const otherUid = exchange?.to === card.uid ? exchange.from : exchange?.from === card.uid ? exchange.to : null;
    const other = otherUid === null ? undefined : this.cards.get(otherUid);
    if (!other) return { x: 0, y: this.isOwn(card.uid) ? 1 : -1 };
    const dx = card.centerX() - other.centerX();
    const dy = card.centerY() - other.centerY();
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  }

  private isOwn(uid: number): boolean {
    return this.order[this.options.side].includes(uid);
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
