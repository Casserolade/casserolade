import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { GAME_ICONS } from '#src/client/const/gameIcons.ts';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import { DRIP_PADDING, comebackHaloTexture, dripTexture, immunityBubbleTexture, lecternTexture, sashTexture, toxicGlowTexture } from '#src/client/pixi/keywordTextures.ts';
import { MEDALLION_MARGIN, MEDALLION_RESOLUTION } from '#src/client/pixi/medallionCanvas.ts';
import { medallionMarks } from '#src/client/tools/medallionMarks.ts';
import type { Effect, Keyword } from '#src/engine/types.ts';

const { width: W, height: H } = MEDALLION_LAYOUT;
const CX = W / 2;
const CY = H / 2;
/** The slime of the Polémique (`.slime`): three drops under the portrait, their left edge, height and delay. */
const DRIPS = [{ x: 37, height: 34, delay: -0.4 }, { x: 70, height: 44, delay: -1.1 }, { x: 100, height: 34, delay: -1.6 }];
const DRIP = { top: H - 48, period: 1.9 };
/** The sashes of the Cumul (`.sash.one`, `.sash.two`): how far around the frame, and one turn in seconds (negative: backwards). */
const SASHES = [{ x: 14, y: 14, turn: 1.3 }, { x: 22, y: 6, turn: -1.7 }];
/** The sparkles around a golden frame (`.twinkles`), in the frame's units, with their delay. */
const TWINKLES = [{ x: 4, y: 64, delay: -0.6 }, { x: W + 6, y: 120, delay: -1.2 }, { x: 22, y: H + 2, delay: -1.8 }];
const MARK = { size: 21, gap: 3, padX: 7, padY: 3, bottom: H + 12 };

type Animation = (time: number) => void;

/** An icon of the game (GAME_ICONS), filled, with its dark edge, centred on its position. */
function icon(name: keyof typeof GAME_ICONS, size: number, fill: string, edge: string): Graphics {
  const shape = new Graphics().svg(`<svg viewBox="0 0 24 24"><path d="${GAME_ICONS[name]}" fill="${fill}" stroke="${edge}" stroke-width="1.4" stroke-linejoin="round"/></svg>`);
  shape.scale.set(size / 24);
  shape.pivot.set(12, 12);
  return shape;
}

/** A texture of medallionTextures.ts over the medallion's units, centred so that it can turn and breathe in place. */
function centered(texture: Texture): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set((MEDALLION_MARGIN + CX) / (W + 2 * MEDALLION_MARGIN), (MEDALLION_MARGIN + CY) / (H + 2 * MEDALLION_MARGIN));
  sprite.scale.set(1 / MEDALLION_RESOLUTION);
  sprite.position.set(CX, CY);
  return sprite;
}

/**
 * Everything around a combat medallion but its frame and its puppet, drawn and moving as MedallionToken.vue draws
 * it on the table: behind it, the lectern, the halo and the green glow; over it, the slime, the bubble, the sashes,
 * the badges, the golden crown and sparkles, and the marks of what its card hides.
 */
export class MedallionDecor {
  readonly back = new Container();
  readonly front = new Container();
  private animations: Animation[] = [];
  private readonly mic: Texture | null;
  private readonly golden: boolean;

  constructor(options: { mic: Texture | null; golden: boolean }) {
    this.mic = options.mic;
    this.golden = options.golden;
  }

  /** Redrawn whenever the keywords change: an Immunité lost, a Polémique spent. */
  show(keywords: Keyword[], effects: Effect[]): void {
    for (const layer of [this.back, this.front]) layer.removeChildren().forEach((child) => child.destroy());
    this.animations = [];
    const has = (keyword: Keyword) => keywords.includes(keyword);
    if (has('porte_parole')) this.addLectern();
    if (has('retour')) this.addHalo();
    if (has('polemique')) this.addSlime();
    if (this.golden) this.addGoldenDecor();
    if (has('immunite')) this.addBubble();
    if (has('cumul')) this.addSashes();
    if (has('retour')) this.addComebackBadge();
    if (has('vedette')) this.addStar();
    this.addMarks(effects);
  }

  update(time: number): void {
    for (const animate of this.animations) animate(time);
  }

  private addLectern(): void {
    const lectern = new Sprite(lecternTexture());
    lectern.scale.set(1 / MEDALLION_RESOLUTION);
    lectern.position.set(-MEDALLION_MARGIN, -MEDALLION_MARGIN);
    this.back.addChild(lectern);
    if (!this.mic) return;
    const mic = new Sprite(this.mic);
    mic.anchor.set(0.5, 0);
    mic.width = 34;
    mic.scale.y = mic.scale.x;
    mic.position.set(CX, -13);
    this.back.addChild(mic);
  }

  private addHalo(): void {
    const halo = centered(comebackHaloTexture());
    this.back.addChild(halo);
    this.animations.push((time) => {
      const wave = (1 - Math.cos((time / 2.2) * Math.PI * 2)) / 2;
      halo.scale.set((1 + 0.04 * wave) / MEDALLION_RESOLUTION);
      halo.alpha = 1 - 0.25 * wave;
    });
  }

  private addSlime(): void {
    this.back.addChild(centered(toxicGlowTexture()));
    for (const drip of DRIPS) {
      const drop = new Sprite(dripTexture(drip.height));
      drop.scale.set(1 / MEDALLION_RESOLUTION);
      drop.pivot.set(DRIP_PADDING * MEDALLION_RESOLUTION, DRIP_PADDING * MEDALLION_RESOLUTION);
      this.front.addChild(drop);
      this.animations.push((time) => {
        const t = (((time - drip.delay) % DRIP.period) + DRIP.period) % DRIP.period / DRIP.period;
        const [stretch, fall, alpha] = t < 0.7 ? [0.4 + (0.85 * t) / 0.7, (6 * t) / 0.7, Math.min(1, t / 0.2)] : [1.25 - (0.65 * (t - 0.7)) / 0.3, 6 + (18 * (t - 0.7)) / 0.3, 1 - (t - 0.7) / 0.3];
        drop.position.set(drip.x, DRIP.top + fall);
        drop.scale.y = stretch / MEDALLION_RESOLUTION;
        drop.alpha = alpha;
      });
    }
  }

  private addGoldenDecor(): void {
    for (const twinkle of TWINKLES) {
      const sparkle = icon('sparkle', 18, '#fff6c4', '#ffd84a');
      sparkle.position.set(twinkle.x, twinkle.y);
      this.front.addChild(sparkle);
      this.animations.push((time) => {
        const wave = (1 - Math.cos(((time - twinkle.delay) / 1.8) * Math.PI * 2)) / 2;
        sparkle.alpha = wave;
        sparkle.scale.set(((0.4 + 0.7 * wave) * 18) / 24);
        sparkle.rotation = (wave * Math.PI) / 4;
      });
    }
    const crown = icon('crown', 40, '#ffd84a', '#5a3a00');
    crown.position.set(W + 2, 6);
    crown.rotation = 0.38;
    this.front.addChild(crown);
  }

  private addBubble(): void {
    const bubble = centered(immunityBubbleTexture());
    this.front.addChild(bubble);
    this.animations.push((time) => {
      const wave = (1 - Math.cos((time / 2.4) * Math.PI * 2)) / 2;
      bubble.scale.set((1 + 0.03 * wave) / MEDALLION_RESOLUTION);
      bubble.alpha = 1 - 0.1 * wave;
    });
  }

  private addSashes(): void {
    for (const sash of SASHES) {
      const band = centered(sashTexture(sash.x, sash.y));
      this.front.addChild(band);
      this.animations.push((time) => (band.rotation = ((time / sash.turn) % 1) * Math.PI * 2));
    }
  }

  /** The « comes back once » badge, top left of the frame (`.comeback`): a blue disc and its U-turn arrow. */
  private addComebackBadge(): void {
    const badge = new Container();
    const disc = new Graphics().circle(0, 0, 20).fill('#2a7fe0').stroke({ width: 3, color: '#0c2a55' });
    disc.circle(-4, -5, 11).fill({ color: '#8fd0ff', alpha: 0.55 });
    badge.addChild(disc, icon('comeback', 24, '#ffffff', '#0c2a55'));
    badge.position.set(12, 22);
    this.front.addChild(badge);
  }

  /** The Vedette's star over its head (`.star`), bobbing. */
  private addStar(): void {
    const star = icon('star', 40, '#ffd84a', '#3a2a00');
    this.front.addChild(star);
    this.animations.push((time) => {
      const wave = (1 - Math.cos((time / 1.8) * Math.PI * 2)) / 2;
      star.position.set(CX, -10 - 5 * wave);
      star.rotation = (12 * wave * Math.PI) / 180;
      star.scale.set(((1 + 0.08 * wave) * 40) / 24);
    });
  }

  /** The small icons under the medallion (`.marks`): what happens at its death, what it reacts to, its Revanche. */
  private addMarks(effects: Effect[]): void {
    const marks = medallionMarks(effects);
    const icons: Container[] = [];
    if (marks.heritage) icons.push(icon('skull', MARK.size, '#e9e4d6', '#14110c'));
    if (marks.triggered) icons.push(icon('bolt', MARK.size, '#ffd23a', '#14110c'));
    if (marks.revanche !== null) {
      const revanche = new Container();
      const sword = icon('sword', MARK.size, '#ff8a6a', '#14110c');
      const count = new Text({ text: String(marks.revanche), style: { fontFamily: 'Bangers', fontSize: 22, fill: '#ff8a6a' } });
      count.anchor.set(0, 0.5);
      count.position.set(MARK.size / 2, 0);
      revanche.addChild(sword, count);
      icons.push(revanche);
    }
    if (marks.celebration) icons.push(icon('confetti', MARK.size, '#ff6ad5', '#14110c'));
    if (marks.reponse) icons.push(icon('speech', MARK.size, '#7fd0ff', '#14110c'));
    if (icons.length === 0) return;
    const widths = icons.map((item) => (item.children.length > 1 ? MARK.size + 14 : MARK.size));
    const inner = widths.reduce((sum, w) => sum + w, 0) + MARK.gap * (icons.length - 1);
    const [pillW, pillH] = [inner + 2 * MARK.padX, MARK.size + 2 * MARK.padY];
    const pill = new Container();
    pill.addChild(new Graphics().roundRect(-pillW / 2, -pillH, pillW, pillH, pillH / 2).fill({ color: '#0e101a', alpha: 0.92 }).stroke({ width: 2, color: '#8a92a4' }));
    let x = -inner / 2;
    icons.forEach((item, index) => {
      item.position.set(x + MARK.size / 2, -pillH / 2);
      pill.addChild(item);
      x += widths[index] + MARK.gap;
    });
    pill.position.set(CX, MARK.bottom);
    this.front.addChild(pill);
  }
}
