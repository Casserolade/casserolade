import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { CARD_LAYOUT } from '#src/client/const/cardLayout.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import { CharacterRig } from '#src/client/pixi/characterRig.ts';
import { MedallionDecor } from '#src/client/pixi/medallionDecor.ts';
import { MEDALLION_MARGIN, MEDALLION_RESOLUTION } from '#src/client/pixi/medallionCanvas.ts';
import { medallionFrameTexture } from '#src/client/pixi/medallionFrameTexture.ts';
import type { Texture } from 'pixi.js';
import { NUMBER_STYLE } from '#src/client/pixi/createCardDecor.ts';
import type { CombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import { SheetEffect } from '#src/client/pixi/sheetEffect.ts';
import { campArtKey } from '#src/client/tools/campArtKey.ts';
import { otherFaces } from '#src/client/tools/otherFaces.ts';
import { healthTone } from '#src/client/tools/healthTone.ts';
import { statTones } from '#src/client/tools/statTone.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import type { CombatUnit, Keyword } from '#src/engine/types.ts';

const { width: W, height: H, ring: RING, figureScale, figureX, figureY, statSize } = MEDALLION_LAYOUT;
const CX = W / 2;
const CY = H / 2;
/** Death gags and the Retour are drawn on the ground, under the medallion, wider than it. */
const GROUND_EFFECT_WIDTH = 250;
const GROUND_Y = H + 4;
const BIRDS_WIDTH = 190;
const SLIDE_PER_SECOND = 9;
const TONE_COLORS = { base: '#ffffff', up: '#7dff9e', down: '#ff7b7b' } as const;
/** The lunge of an attack, in seconds: wind up, dash, back. The hit lands between dash and back. */
const LUNGE = { windUp: 0.1, dash: 0.14, back: 0.2, reach: 0.82 };
/** The medallion leans back as it winds up, into the blow as it dashes, in radians. */
const LEAN = { back: 0.1, forward: 0.18, across: 250 };
/** The casseroles hang under the medallion, as on the table. */
const PAN = { size: 34, gap: 2, top: 8, string: 12 };
/** The one who celebrates rises this high, in medallion units, under a spotlight. */
const CELEBRATION_LIFT = 34;
/** Going out in light, in combat seconds. */
const DISSOLVE_SECONDS = 0.75;
/** A hit shows its wincing face this long, in combat seconds, when it has one. */
const HIT_FACE_SECONDS = 0.7;
/** A hit spins it round one time in two: the cut-out does not always land the same way. */
const TURN_ON_HIT_CHANCE = 0.5;
/** A golden medallion's oval sits deeper in its thicker frame (`.golden .oval` in MedallionToken.vue). */
const GOLDEN_OVAL_INSET = 9;

interface RunningEffect {
  effect: SheetEffect;
  onFinished: (() => void) | null;
}

/** A texture of medallionTextures.ts, placed over the medallion's own units. */
function medallionSprite(texture: Texture): Sprite {
  const sprite = new Sprite(texture);
  sprite.scale.set(1 / MEDALLION_RESOLUTION);
  sprite.position.set(-MEDALLION_MARGIN, -MEDALLION_MARGIN);
  return sprite;
}

/** One unit on the combat stage: the same medallion as on the board, with its puppet and the effects playing on it. */
export class CombatCard {
  readonly view = new Container();
  readonly uid: number;
  atk: number;
  hp: number;
  /** The most health it had in this combat: below it, it is wounded, and its number turns red. */
  private maxHp = 0;
  private readonly cardId: string;
  private readonly golden: boolean;
  private readonly rig: CharacterRig;
  private readonly body = new Container();
  /** Lectern, halo, bubble, sashes, badges and marks: the same as on the table (MedallionToken.vue). */
  private readonly decor: MedallionDecor;
  private readonly effectLayer = new Container();
  private readonly attackText: Text;
  private readonly healthText: Text;
  private readonly manifest: GameManifest;
  private readonly textures: CombatTextures;
  private keywords: Keyword[] | null = null;
  private pans: Container[] = [];
  private running: RunningEffect[] = [];
  private delayed: { left: number; callback: () => void }[] = [];
  private birds: SheetEffect | null = null;
  /** Going out in light: how far along, and what to do once gone. */
  private fading: { left: number; onFinished: () => void } | null = null;
  private readonly wash = new Graphics();
  /** The light on the one who celebrates: a beam from above and a glow around it, while it speaks. */
  private spotlight: Graphics | null = null;
  private targetX = 0;
  private targetY = 0;
  private targetScale = 1;
  private isPlaced = false;
  private lunge: { time: number; dx: number; dy: number } | null = null;
  private pose = 0;
  private time = Math.random() * 10;

  constructor(unit: CombatUnit, manifest: GameManifest, textures: CombatTextures) {
    this.uid = unit.uid;
    this.cardId = unit.cardId;
    this.golden = unit.golden;
    this.atk = unit.atk;
    this.hp = unit.hp;
    this.manifest = manifest;
    this.textures = textures;
    const campKey = campArtKey(unit.camp);
    const color = manifest.camps[campKey]?.couleur ?? '#8c8574';
    const character = textures.characters[unit.cardId];
    this.rig = new CharacterRig({
      art: character ? manifest.personnages[unit.cardId] : null,
      name: unit.name,
      head: character?.head ?? null,
      jaw: character?.jaw ?? null,
      faces: character ? otherFaces(manifest.personnages[unit.cardId], character.faces) : {},
      body: textures.bodies[campKey] ?? null,
      eyes: textures.eyes,
      star: textures.star,
      plaster: textures.plaster,
    });
    this.rig.setHome(CARD_LAYOUT.feetX, CARD_LAYOUT.feetY);
    if (unit.scandal) this.rig.restOn('choc');

    // The same medallion as on the table (MedallionToken.vue): frame, oval and rays come from one texture.
    const frame = medallionSprite(medallionFrameTexture({ color, golden: unit.golden, bothSides: unit.keywords.includes('ni_droite_ni_gauche') }));
    const ovalInset = unit.golden ? GOLDEN_OVAL_INSET : RING;
    const mask = new Graphics().ellipse(CX, CY, W / 2 - ovalInset, H / 2 - ovalInset).fill('#ffffff');
    const figure = new Container();
    figure.scale.set(figureScale);
    figure.position.set(figureX * figureScale, figureY * figureScale);
    figure.addChild(this.rig.view);
    figure.mask = mask;

    this.attackText = this.createStat(textures.attack, statSize / 2 - 12, H - statSize / 2 + 6);
    this.healthText = this.createStat(textures.health, W - statSize / 2 + 12, H - statSize / 2 + 6);
    this.decor = new MedallionDecor({ mic: textures.mic, golden: unit.golden });
    this.body.addChild(this.decor.back, frame, figure, mask, this.decor.front, this.createPans(unit.casseroles, textures));
    this.body.pivot.set(CX, H);
    this.body.position.set(CX, H);
    this.view.addChild(this.body, this.attackText.parent as Container, this.healthText.parent as Container, this.effectLayer);
    this.show(unit);
  }

  /** Its casseroles, each on its string, swinging a little: the same as on the table. */
  private createPans(casseroles: string[], textures: CombatTextures): Container {
    const row = new Container();
    const span = casseroles.length * PAN.size + Math.max(0, casseroles.length - 1) * PAN.gap;
    casseroles.forEach((id, index) => {
      const texture = textures.pans[CASSEROLE_BY_ID[id]?.kind ?? 'affaire'];
      if (!texture) return;
      const pan = new Container();
      pan.position.set(CX - span / 2 + index * (PAN.size + PAN.gap) + PAN.size / 2, H + PAN.top);
      const string = new Graphics().moveTo(0, -PAN.string).lineTo(0, 2).stroke({ color: '#cccccc', width: 1 });
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 0);
      sprite.setSize(PAN.size, PAN.size);
      pan.addChild(string, sprite);
      this.pans.push(pan);
      row.addChild(pan);
    });
    return row;
  }

  private createStat(texture: CombatTextures['attack'], x: number, y: number): Text {
    const holder = new Container();
    holder.position.set(x, y);
    if (texture) {
      const medal = new Sprite(texture);
      medal.anchor.set(0.5);
      medal.setSize(statSize, statSize);
      holder.addChild(medal);
    }
    const text = new Text({ text: '', style: { ...NUMBER_STYLE, fontSize: 40, stroke: { color: '#111111', width: 6 } } });
    text.anchor.set(0.5);
    text.y = -2;
    holder.addChild(text);
    return text;
  }

  /** Numbers and keywords as the journal has them now. */
  show(unit: CombatUnit): void {
    this.atk = unit.atk;
    this.hp = unit.hp;
    this.maxHp = Math.max(this.maxHp, unit.hp);
    this.attackText.text = String(unit.atk);
    this.healthText.text = String(Math.max(0, unit.hp));
    const tones = statTones(this.cardId, this.golden, unit.atk, unit.hp);
    this.attackText.style.fill = TONE_COLORS[tones.atk];
    this.healthText.style.fill = TONE_COLORS[healthTone(tones.hp, unit.hp, this.maxHp)];
    if (this.keywords === null || unit.keywords.join() !== this.keywords.join()) {
      this.keywords = [...unit.keywords];
      this.decor.show(this.keywords, unit.effects);
    }
  }

  /** The medallion slides there. The first time, it just appears there. */
  moveTo(x: number, y: number, scale: number): void {
    this.targetX = x;
    this.targetY = y;
    this.targetScale = scale;
    if (!this.isPlaced) this.jumpToTarget();
    this.isPlaced = true;
  }

  jumpToTarget(): void {
    this.view.position.set(this.targetX, this.targetY);
    this.view.scale.set(this.targetScale);
  }

  centerX(): number {
    return this.targetX + (W * this.targetScale) / 2;
  }

  centerY(): number {
    return this.targetY + (H * this.targetScale) / 2;
  }

  /** The whole medallion winds up, dashes at its target and comes back, the puppet screaming. */
  attack(target: CombatCard): void {
    this.lunge = { time: 0, dx: target.centerX() - this.centerX(), dy: target.centerY() - this.centerY() };
    this.rig.talk(0.4);
  }

  /** Hit: its face winces, and one time in two it spins round like a slapped cut-out, then it is itself again. */
  takeHit(): void {
    this.rig.showFace('aie', HIT_FACE_SECONDS);
    if (Math.random() < TURN_ON_HIT_CHANCE) this.rig.turnAround(HIT_FACE_SECONDS);
    // Drawn crossed eyes only for a cut-out without a wincing face of its own: over a real face, they spoil it.
    if (!this.rig.hasFace('aie')) this.rig.flashEyes('croix', 1);
    this.rig.showStars(1.2);
    this.rig.play('hit');
    this.pose = 0.25;
  }

  talk(seconds = 0.5): void {
    this.rig.talk(seconds);
  }

  /** The one who celebrates: it rises into a spotlight, grows, talks, and stays up for the length of its line. */
  celebrate(seconds: number): void {
    this.rig.showFace('rire', seconds);
    this.rig.turnAround(seconds);
    this.rig.talk(seconds);
    this.pose = -seconds;
    if (!this.spotlight) {
      this.spotlight = new Graphics()
        .poly([CX - 26, -260, CX + 26, -260, CX + W * 0.78, H + 10, CX - W * 0.78, H + 10]).fill({ color: '#fff3c4', alpha: 0.16 })
        .ellipse(CX, CY, W * 0.78, H * 0.74).fill({ color: '#ffd84a', alpha: 0.12 })
        .ellipse(CX, CY, W * 0.66, H * 0.63).fill({ color: '#ffd84a', alpha: 0.16 })
        .ellipse(CX, CY, W * 0.56, H * 0.54).fill({ color: '#fff0a0', alpha: 0.22 })
        .ellipse(CX, H + 12, W * 0.6, 16).fill({ color: '#fff3c4', alpha: 0.3 });
      this.view.addChildAt(this.spotlight, 0);
    }
    this.spotlight.visible = true;
  }

  /** Plays a ground effect once. Without its images, the impact and the end still happen. */
  playEffect(name: string, onImpact: (() => void) | null = null, onFinished: (() => void) | null = null): void {
    const frames = this.textures.effects[name];
    const art = this.manifest.effets[name];
    if (!frames || !art) {
      onImpact?.();
      onFinished?.();
      return;
    }
    const effect = new SheetEffect(frames, art, GROUND_EFFECT_WIDTH, onImpact);
    effect.view.position.set(CX, GROUND_Y);
    this.effectLayer.addChild(effect.view);
    this.running.push({ effect, onFinished });
  }

  /** Calls back later, in combat time. */
  after(seconds: number, callback: () => void): void {
    this.delayed.push({ left: seconds, callback });
  }

  /** Goes out in light: the medallion whitens, rises a little and fades away. */
  dissolve(onFinished: () => void): void {
    this.rig.holdEyes('croix');
    this.rig.play('hit');
    this.fading = { left: DISSOLVE_SECONDS, onFinished };
    this.wash.clear().ellipse(CX, CY, W / 2, H / 2).fill('#fff6d8');
    this.wash.blendMode = 'add';
    this.wash.alpha = 0;
    this.body.addChild(this.wash);
  }

  /** Flat under the hammer, cross-eyed. */
  flatten(): void {
    this.rig.holdEyes('croix');
    this.rig.play('flattened');
    this.body.scale.set(1.15, 0.45);
  }

  showBirds(): void {
    const frames = this.textures.effects.oiseaux;
    const art = this.manifest.effets.oiseaux;
    if (!frames || !art || this.birds) return;
    this.birds = new SheetEffect(frames, art, BIRDS_WIDTH);
    this.birds.view.position.set(CX, 30);
    this.effectLayer.addChild(this.birds.view);
  }

  /** Gets back up, limping, with a plaster on the head for the rest of the combat. */
  comeBack(): void {
    this.birds?.destroy();
    this.birds = null;
    this.body.scale.set(1);
    this.rig.holdEyes('normal');
    this.rig.setPlasterVisible(true);
    this.rig.play('comeback');
    this.playEffect('retour');
  }

  update(deltaSeconds: number, realDeltaSeconds: number): void {
    this.time += deltaSeconds;
    this.rig.update(deltaSeconds);
    this.birds?.update(deltaSeconds);
    this.running = this.running.filter((entry) => this.updateEffect(entry, deltaSeconds));
    this.delayed = this.delayed.filter((entry) => this.updateDelayed(entry, deltaSeconds));
    this.updatePose(deltaSeconds);
    this.updateFading(deltaSeconds);
    this.slide(realDeltaSeconds, deltaSeconds);
  }

  private updateFading(deltaSeconds: number): void {
    if (!this.fading) return;
    this.fading.left = Math.max(0, this.fading.left - deltaSeconds);
    const progress = 1 - this.fading.left / DISSOLVE_SECONDS;
    this.wash.alpha = Math.min(1, progress * 2.5) * 0.55;
    this.body.scale.set(1 + progress * 0.12);
    this.body.y = H - progress * 26;
    this.view.alpha = progress < 0.4 ? 1 : 1 - (progress - 0.4) / 0.6;
    if (this.fading.left > 0) return;
    const { onFinished } = this.fading;
    this.fading = null;
    onFinished();
  }

  destroy(): void {
    this.running.forEach(({ effect }) => effect.destroy());
    this.view.destroy({ children: true });
  }

  /** A hit squashes the medallion for a moment; a celebration makes it big. */
  private updatePose(deltaSeconds: number): void {
    if (this.pose > 0) {
      this.pose = Math.max(0, this.pose - deltaSeconds);
      const squash = Math.sin((this.pose / 0.25) * Math.PI) * 0.12;
      if (this.body.scale.y > 0.5) this.body.scale.set(1 + squash, 1 - squash);
    } else if (this.pose < 0) {
      this.pose = Math.min(0, this.pose + deltaSeconds);
      const celebrating = this.pose < 0;
      const grow = celebrating ? 1.3 + Math.sin(this.time * 9) * 0.04 : 1;
      this.body.scale.set(grow);
      // It rises smoothly, and is back in its row as soon as its line ends.
      this.body.y = celebrating ? this.body.y + (H - CELEBRATION_LIFT - this.body.y) * Math.min(1, deltaSeconds * 10) : H;
      if (this.spotlight) {
        this.spotlight.visible = celebrating;
        this.spotlight.alpha = 0.85 + Math.sin(this.time * 6) * 0.15;
      }
    }
    this.decor.update(this.time);
    this.pans.forEach((pan, index) => (pan.rotation = Math.sin(this.time * 2.8 + index * 1.7) * 0.18));
  }

  private updateEffect({ effect, onFinished }: RunningEffect, deltaSeconds: number): boolean {
    if (!effect.update(deltaSeconds)) return true;
    effect.destroy();
    onFinished?.();
    return false;
  }

  private updateDelayed(entry: { left: number; callback: () => void }, deltaSeconds: number): boolean {
    entry.left -= deltaSeconds;
    if (entry.left > 0) return true;
    entry.callback();
    return false;
  }

  /** Where the lunge is, as a fraction of the way to the target (negative: winding up). */
  private lungeProgress(deltaSeconds: number): number {
    if (!this.lunge) return 0;
    this.lunge.time += deltaSeconds;
    const { windUp, dash, back, reach } = LUNGE;
    const t = this.lunge.time;
    if (t < windUp) return -0.08 * (t / windUp);
    if (t < windUp + dash) return -0.08 + (reach + 0.08) * ((t - windUp) / dash) ** 2;
    if (t < windUp + dash + back) return reach * (1 - (t - windUp - dash) / back);
    this.lunge = null;
    return 0;
  }

  /** Slides in real time; the lunge follows the combat's speed. */
  private slide(realDeltaSeconds: number, deltaSeconds: number): void {
    const progress = Math.min(1, realDeltaSeconds * SLIDE_PER_SECOND);
    this.view.scale.set(this.view.scale.x + (this.targetScale - this.view.scale.x) * progress);
    const lunge = this.lunge;
    const fraction = this.lungeProgress(deltaSeconds);
    const offsetX = lunge ? lunge.dx * fraction : 0;
    const offsetY = lunge ? lunge.dy * fraction : 0;
    if (lunge) {
      this.view.position.set(this.targetX + offsetX, this.targetY + offsetY);
      const side = Math.max(-1, Math.min(1, lunge.dx / LEAN.across));
      this.body.rotation = fraction < 0 ? side * LEAN.back * (fraction / 0.08) : side * LEAN.forward * Math.min(1, fraction / 0.4);
      return;
    }
    this.body.rotation = 0;
    this.view.x += (this.targetX - this.view.x) * progress;
    this.view.y += (this.targetY - this.view.y) * progress;
  }
}
