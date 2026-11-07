import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Renderer, Texture } from 'pixi.js';
import { CARD_LAYOUT } from '#src/client/const/cardLayout.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import { CardMotion } from '#src/client/pixi/cardMotion.ts';
import { celebrationSpotlight } from '#src/client/pixi/celebrationSpotlight.ts';
import { CharacterRig } from '#src/client/pixi/characterRig.ts';
import { NUMBER_STYLE } from '#src/client/pixi/createCardDecor.ts';
import { hangingPans } from '#src/client/pixi/hangingPans.ts';
import type { CombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import { MedallionDecor } from '#src/client/pixi/medallionDecor.ts';
import { MEDALLION_MARGIN, MEDALLION_RESOLUTION } from '#src/client/pixi/medallionCanvas.ts';
import { medallionFrameTexture } from '#src/client/pixi/medallionFrameTexture.ts';
import { SheetEffect } from '#src/client/pixi/sheetEffect.ts';
import { campArtKey } from '#src/client/tools/campArtKey.ts';
import { compactStat } from '#src/client/tools/compactStat.ts';
import { healthTone } from '#src/client/tools/healthTone.ts';
import { otherFaces } from '#src/client/tools/otherFaces.ts';
import { statFontScale } from '#src/client/tools/statFontScale.ts';
import { statTones } from '#src/client/tools/statTone.ts';
import type { CombatUnit, Keyword } from '#src/engine/types.ts';

const { width: W, height: H, ring: RING, figureScale, figureX, figureY, statSize } = MEDALLION_LAYOUT;
const CX = W / 2;
const CY = H / 2;
/** Death gags and the Retour are drawn on the ground, under the medallion, wider than it. */
const GROUND_EFFECT_WIDTH = 250;
const GROUND_Y = H + 4;
const BIRDS_WIDTH = 190;
const TONE_COLORS = { base: '#ffffff', up: '#7dff9e', down: '#ff7b7b' } as const;
/** A stat's number in its badge, at full size: as `.stat` in MedallionToken.vue. */
const STAT_FONT = { size: 40, stroke: 6 };
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
/** A blow whitens the medallion for a blink, and knocks it back: pixels a second, plus as much again per strength. */
const HIT_FLASH_SECONDS = 0.11;
const KNOCK = { push: 260, perStrength: 220 };
/** A blow squashes the medallion for a moment, more for a harder one. */
const SQUASH = { seconds: 0.25, base: 0.1, perStrength: 0.05 };

interface RunningEffect {
  effect: SheetEffect;
  onFinished: (() => void) | null;
}

/** Past 999 the number is written short (3k), smaller when it is long: the same as on the table. */
function showStat(text: Text, value: number): void {
  const label = compactStat(value);
  if (text.text === label) return;
  const scale = statFontScale(label);
  text.text = label;
  text.style.fontSize = STAT_FONT.size * scale;
  text.style.stroke = { color: '#111111', width: STAT_FONT.stroke * scale };
}

/** A texture of medallionTextures.ts, placed over the medallion's own units. */
function medallionSprite(texture: Texture): Sprite {
  const sprite = new Sprite(texture);
  sprite.scale.set(1 / MEDALLION_RESOLUTION);
  sprite.position.set(-MEDALLION_MARGIN, -MEDALLION_MARGIN);
  return sprite;
}

function createStat(texture: CombatTextures['attack'], x: number, y: number): Text {
  const holder = new Container();
  holder.position.set(x, y);
  if (texture) {
    const medal = new Sprite(texture);
    medal.anchor.set(0.5);
    medal.setSize(statSize, statSize);
    holder.addChild(medal);
  }
  const text = new Text({ text: '', style: { ...NUMBER_STYLE, fontSize: STAT_FONT.size, stroke: { color: '#111111', width: STAT_FONT.stroke } } });
  text.anchor.set(0.5);
  text.y = -2;
  holder.addChild(text);
  return text;
}

/** One unit on the combat stage: the same medallion as on the board, with its puppet and the effects playing on it. */
export class CombatCard {
  readonly view = new Container();
  readonly uid: number;
  readonly golden: boolean;
  /** Its camp's colour: the chips of a broken frame. */
  readonly color: string;
  atk: number;
  hp: number;
  /** The most health it had in this combat: below it, it is wounded, and its number turns red. */
  private maxHp = 0;
  private readonly cardId: string;
  private readonly rig: CharacterRig;
  private readonly body = new Container();
  private readonly motion: CardMotion;
  /** Lectern, halo, bubble, sashes, badges and marks: the same as on the table (MedallionToken.vue). */
  private readonly decor: MedallionDecor;
  private readonly effectLayer = new Container();
  private readonly attackText: Text;
  private readonly healthText: Text;
  private readonly manifest: GameManifest;
  private readonly textures: CombatTextures;
  private keywords: Keyword[] | null = null;
  private readonly pans: Container[];
  private running: RunningEffect[] = [];
  private delayed: { left: number; callback: () => void }[] = [];
  private birds: SheetEffect | null = null;
  /** Going out in light: how far along, and what to do once gone. */
  private fading: { left: number; onFinished: () => void } | null = null;
  private readonly wash = new Graphics();
  /** The blink of white on a blow. */
  private readonly flash = new Graphics();
  private flashLeft = 0;
  /** The light on the one who celebrates: a beam from above and a glow around it, while it speaks. */
  private spotlight: Graphics | null = null;
  private pose = 0;
  private squash = 0;
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
    this.color = manifest.camps[campKey]?.couleur ?? '#8c8574';
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
    const frame = medallionSprite(medallionFrameTexture({ color: this.color, golden: unit.golden, bothSides: unit.keywords.includes('ni_droite_ni_gauche') }));
    const ovalInset = unit.golden ? GOLDEN_OVAL_INSET : RING;
    const mask = new Graphics().ellipse(CX, CY, W / 2 - ovalInset, H / 2 - ovalInset).fill('#ffffff');
    const figure = new Container();
    figure.scale.set(figureScale);
    figure.position.set(figureX * figureScale, figureY * figureScale);
    figure.addChild(this.rig.view);
    figure.mask = mask;

    this.attackText = createStat(textures.attack, statSize / 2 - 12, H - statSize / 2 + 6);
    this.healthText = createStat(textures.health, W - statSize / 2 + 12, H - statSize / 2 + 6);
    this.decor = new MedallionDecor({ mic: textures.mic, golden: unit.golden });
    const { row, pans } = hangingPans(unit.casseroles, textures);
    this.pans = pans;
    this.flash.ellipse(CX, CY, W / 2 - 4, H / 2 - 4).fill('#ffffff');
    this.flash.blendMode = 'add';
    this.flash.alpha = 0;
    this.body.addChild(this.decor.back, frame, figure, mask, this.decor.front, row, this.flash);
    this.body.pivot.set(CX, H);
    this.body.position.set(CX, H);
    this.view.addChild(this.body, this.attackText.parent as Container, this.healthText.parent as Container, this.effectLayer);
    this.motion = new CardMotion(this.view, this.body);
    this.show(unit);
  }

  /** Numbers and keywords as the journal has them now. */
  show(unit: CombatUnit): void {
    this.atk = unit.atk;
    this.hp = unit.hp;
    this.maxHp = Math.max(this.maxHp, unit.hp);
    showStat(this.attackText, unit.atk);
    showStat(this.healthText, Math.max(0, unit.hp));
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
    this.motion.moveTo(x, y, scale);
  }

  jumpToTarget(): void {
    this.motion.jumpToTarget();
  }

  centerX(): number {
    return this.motion.center(W, H).x;
  }

  centerY(): number {
    return this.motion.center(W, H).y;
  }

  /** Its size on the stage, for a death that plays over it. */
  get scale(): number {
    return this.motion.scale;
  }

  /** The whole medallion winds up, dashes at its target and comes back, the puppet screaming. */
  attack(target: CombatCard): void {
    this.motion.lungeBy(target.centerX() - this.centerX(), target.centerY() - this.centerY());
    this.rig.talk(0.4);
  }

  /**
   * Hit from (`dirX`, `dirY`), as hard as `strength` (hitStrength): it blinks white, is knocked back and squashed, its
   * face winces, and one time in two it spins round like a slapped cut-out, then it is itself again.
   */
  takeHit(dirX: number, dirY: number, strength: number): void {
    this.rig.showFace('aie', HIT_FACE_SECONDS);
    if (Math.random() < TURN_ON_HIT_CHANCE) this.rig.turnAround(HIT_FACE_SECONDS);
    // Drawn crossed eyes only for a cut-out without a wincing face of its own: over a real face, they spoil it.
    if (!this.rig.hasFace('aie')) this.rig.flashEyes('croix', 1);
    this.rig.showStars(1.2);
    this.rig.play('hit');
    this.pose = SQUASH.seconds;
    this.squash = SQUASH.base + SQUASH.perStrength * strength;
    this.flashLeft = HIT_FLASH_SECONDS;
    this.motion.knock(dirX, dirY, KNOCK.push + KNOCK.perStrength * strength);
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
      this.spotlight = celebrationSpotlight();
      this.view.addChildAt(this.spotlight, 0);
    }
    this.spotlight.visible = true;
  }

  /** Its line was passed: back in its row at once, with its own face, the right way round. */
  stopCelebrating(): void {
    if (this.pose >= 0) return;
    this.pose = -0.0001;
    this.rig.settle();
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
    this.knockOut();
    this.fading = { left: DISSOLVE_SECONDS, onFinished };
    this.wash.clear().ellipse(CX, CY, W / 2, H / 2).fill('#fff6d8');
    this.wash.blendMode = 'add';
    this.wash.alpha = 0;
    this.body.addChild(this.wash);
  }

  /** Out cold: crossed eyes for good, its wincing face, the dazed pose. */
  knockOut(): void {
    this.rig.holdEyes('croix');
    this.rig.showFace('aie', 5);
    this.rig.play('hit');
  }

  /**
   * A death takes it over: its row no longer moves it, and it turns about its own center from now on (its position is
   * then its center's).
   */
  detach(): void {
    this.motion.detach();
    const scale = this.view.scale.x;
    this.view.pivot.set(CX, CY);
    this.view.position.set(this.view.x + CX * scale, this.view.y + CY * scale);
  }

  /** Turned edge-on by `angle`: a medallion tumbling through the air, seen from the front. */
  tumble(angle: number): void {
    this.body.scale.x = Math.cos(angle);
  }

  /**
   * Its picture as it is now, for the pieces it breaks into: the texture, and where its top left corner sits in the
   * medallion's own units.
   */
  snapshot(renderer: Renderer): { texture: Texture; x: number; y: number } {
    const bounds = this.view.getLocalBounds();
    const texture = renderer.generateTexture({ target: this.view, resolution: Math.min(2, renderer.resolution) });
    return { texture, x: bounds.x, y: bounds.y };
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
    this.flashLeft = Math.max(0, this.flashLeft - deltaSeconds);
    this.flash.alpha = (this.flashLeft / HIT_FLASH_SECONDS) * 0.85;
    this.motion.update(realDeltaSeconds, deltaSeconds);
  }

  destroy(): void {
    this.running.forEach(({ effect }) => effect.destroy());
    this.view.destroy({ children: true });
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

  /** A hit squashes the medallion for a moment; a celebration makes it big. */
  private updatePose(deltaSeconds: number): void {
    if (this.pose > 0) {
      this.pose = Math.max(0, this.pose - deltaSeconds);
      const squash = Math.sin((this.pose / SQUASH.seconds) * Math.PI) * this.squash;
      this.body.scale.set(1 + squash, 1 - squash);
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
}
