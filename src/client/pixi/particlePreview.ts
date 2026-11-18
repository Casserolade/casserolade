import { Application, Container } from 'pixi.js';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { CombatCard } from '#src/client/pixi/combatCard.ts';
import { playDeath } from '#src/client/pixi/deaths/playDeath.ts';
import { genkidama } from '#src/client/pixi/genkidama.ts';
import { heroStrike } from '#src/client/pixi/heroStrike.ts';
import { loadCombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import type { CombatTextures } from '#src/client/pixi/loadCombatTextures.ts';
import { ballotBurst, chipBurst, coinShower, smokePuff, sparkBurst, tractRain } from '#src/client/pixi/particleBursts.ts';
import { StageFx } from '#src/client/pixi/stageFx.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';
import type { DeathKind } from '#src/client/tools/deathKind.ts';
import type { CombatUnit } from '#src/engine/types.ts';

export type PreviewEffect = 'ballots' | 'sparks' | 'coins' | 'chips' | 'smoke' | 'tracts' | 'strike' | 'genkidama';

/** The politician that dies for the preview, and the blow that takes it. */
const VICTIM = 'macron';
const KILLING_BLOW = { dirX: 0.5, dirY: -1, strength: 1.6 };

export interface ParticlePreviewOptions {
  manifest: GameManifest;
  playSound: (name: SynthName, strength?: number) => void;
  /** A big shock: the set around the stage flickers with it. */
  onShock: (strength: number) => void;
}

/**
 * A bare stage for the preview page: the combat's effects alone (StageFx, without a single medallion), over whatever
 * is behind, so that each one can be looked at without playing a combat. It owns its PixiJS application: `destroy`
 * gives everything back.
 */
export class ParticlePreview {
  private readonly app = new Application();
  private readonly options: ParticlePreviewOptions;
  private fx: StageFx | null = null;
  private textures: CombatTextures | null = null;
  private isDestroyed = false;
  private nextUid = 1;

  constructor(options: ParticlePreviewOptions) {
    this.options = options;
  }

  async start(host: HTMLElement): Promise<void> {
    await this.app.init({ preference: 'webgl', resizeTo: host, autoDensity: true, resolution: Math.min(window.devicePixelRatio, 2), backgroundAlpha: 0, antialias: true });
    if (this.isDestroyed) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }
    host.appendChild(this.app.canvas);
    const textures = await loadCombatTextures(this.options.manifest, [VICTIM]);
    this.textures = textures;
    const fx = new StageFx(new Container(), {
      renderer: this.app.renderer,
      reducedMotion: false,
      screen: () => this.app.renderer.screen,
      sheet: (name) => {
        const frames = textures.effects[name];
        const art = this.options.manifest.effets[name];
        return frames && art ? { frames, art } : null;
      },
      sound: this.options.playSound,
      onShock: this.options.onShock,
    });
    this.fx = fx;
    this.app.stage.addChild(fx.view);
    this.app.ticker.add((ticker) => fx.update(ticker.deltaMS / 1000, 1));
  }

  /** One effect: a burst in the middle of the stage, or a blow thrown at the top of it, where a rival's portrait is. */
  play(kind: PreviewEffect): void {
    const fx = this.fx;
    if (!fx) return;
    const { width, height } = this.app.renderer.screen;
    const middle = { x: width / 2, y: height * 0.55 };
    const rival = { x: width / 2, y: height * 0.09 };
    const scale = Math.min(width / 1920, height / 1080);
    fx.setScale(scale);
    if (kind === 'ballots') ballotBurst(fx.particles, middle.x, middle.y, 2, scale * 1.4);
    else if (kind === 'sparks') sparkBurst(fx.particles, middle.x, middle.y, 0, -1, 1.6, Math.PI, undefined, scale * 1.4);
    else if (kind === 'coins') coinShower(fx.particles, middle.x, middle.y, 14, scale * 1.4);
    else if (kind === 'chips') chipBurst(fx.particles, middle.x, middle.y, 14, '#d8b450', 1.4, scale * 1.4);
    else if (kind === 'smoke') smokePuff(fx.particles, middle.x, middle.y, 8, undefined, 90 * scale * 1.4);
    else if (kind === 'tracts') tractRain(fx.particles, width, 46, scale * 1.4);
    else if (kind === 'strike') {
      const sources = [0.3, 0.4, 0.5, 0.6, 0.7].map((share) => ({ x: width * share, y: height * 0.62, scale }));
      fx.play(heroStrike(fx, sources, rival, '#ffd84a', this.options.playSound));
    } else fx.play(genkidama(fx, { x: width / 2, y: height * 0.47 }, rival, '#ffd84a', scale, this.options.playSound));
  }

  /** A politician stands in the middle of the stage, then dies the way asked: each death of the game, at a click. */
  die(kind: DeathKind): void {
    const { fx, textures } = this;
    if (!fx || !textures) return;
    const { width, height } = this.app.renderer.screen;
    const scale = Math.min(width / 1920, height / 1080);
    fx.setScale(scale);
    const unit: CombatUnit = {
      uid: this.nextUid++, cardId: VICTIM, name: 'Emmanuel Macron', camp: 'macronie', tier: 6, atk: 8, hp: 8, keywords: [],
      golden: kind === 'gold', token: kind === 'pop', noAttack: false, casseroles: [], effects: kind === 'tv-off' ? [{ when: 'celebration', to: 'soi', do: 'buff', atk: 1, hp: 1 }] : [], bonus: 0, gains: [],
    };
    const card = new CombatCard(unit, this.options.manifest, textures);
    card.moveTo(width / 2, height * 0.5, scale);
    card.jumpToTarget();
    // As on the real stage: the death owns the medallion from now on, and draws it in its own layer.
    fx.deathLayer.addChild(card.view);
    fx.play(playDeath(kind, card, fx.scene, KILLING_BLOW));
  }

  destroy(): void {
    this.isDestroyed = true;
    if (!this.fx) return;
    this.fx.destroy();
    this.app.destroy({ removeView: true }, { children: true });
  }
}
