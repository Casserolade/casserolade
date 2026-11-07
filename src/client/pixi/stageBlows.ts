import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { KillingBlowFx } from '#src/client/pixi/deaths/deathScene.ts';
import { dashLines, sparkBurst } from '#src/client/pixi/particleBursts.ts';
import type { StageFx } from '#src/client/pixi/stageFx.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';
import { compactStat } from '#src/client/tools/compactStat.ts';
import { hitStopSeconds } from '#src/client/tools/hitStopSeconds.ts';
import { hitStrength } from '#src/client/tools/hitStrength.ts';
import { hitTrauma } from '#src/client/tools/hitTrauma.ts';

const SHIELD_SPARKS = ['#ffffff', '#bff0ff', '#7fd8ff'];
/** A blow this hard bends the table under a small shock ring. */
const RINGING_STRENGTH = 1.6;
/** Where a blow lands: this share of the medallion's width from its center, toward the one who struck. */
const CONTACT_REACH = 0.42;
/** The damage badge: its size from the blow's strength, how long it stays; a killing blow's sits above its victim. */
const BADGE = { scale: 0.55, perStrength: 0.15, seconds: 0.85, lethalSeconds: 0.6, lethalLift: 0.62, smallest: 0.5 };

export interface StageBlowsOptions {
  fx: StageFx;
  reducedMotion: boolean;
  playSound: (name: SynthName, strength?: number) => void;
  /** The medallion of a unit still standing on the stage. */
  cardOf: (uid: number) => CombatCard | undefined;
  /** Whether a unit sits on the player's side, at the bottom. */
  isOwn: (uid: number) => boolean;
}

/**
 * The attacks and the blows of the combat, felt like a pinball: the lunge and its speed lines, then at the contact a
 * hit-stop, a blink, a knock back, sparks, a bouncing damage badge and the camera's shake. It remembers where each blow
 * came from, for the death that may follow.
 */
export class StageBlows {
  private readonly options: StageBlowsOptions;
  /** The attack playing now: its two blows fly from one to the other. */
  private exchange: { from: number; to: number } | null = null;
  private readonly lastBlows = new Map<number, KillingBlowFx>();

  constructor(options: StageBlowsOptions) {
    this.options = options;
  }

  attack(attacker: CombatCard, target: CombatCard): void {
    this.exchange = { from: attacker.uid, to: target.uid };
    attacker.attack(target);
    if (!this.options.reducedMotion) {
      const dx = target.centerX() - attacker.centerX();
      const dy = target.centerY() - attacker.centerY();
      const length = Math.hypot(dx, dy) || 1;
      dashLines(this.options.fx.particles, attacker.centerX(), attacker.centerY(), dx / length, dy / length, attacker.scale);
    }
    this.options.playSound('lunge');
  }

  /**
   * A blow lands: the stage freezes on the contact (hit-stop), the medallion blinks white and is knocked back, sparks
   * fly from the contact, its damage pops on a red splat and bounces; the harder, the more the camera shakes.
   */
  hit(card: CombatCard, value: number): void {
    const { fx, reducedMotion } = this.options;
    const strength = hitStrength(value, card.hp);
    const { x: dirX, y: dirY } = this.direction(card);
    this.lastBlows.set(card.uid, { dirX, dirY, strength });
    card.takeHit(dirX, dirY, strength);
    fx.clock.freeze(hitStopSeconds(strength));
    fx.addShake(hitTrauma(strength));
    const reach = MEDALLION_LAYOUT.width * card.scale * CONTACT_REACH;
    const contactX = card.centerX() - dirX * reach;
    const contactY = card.centerY() - dirY * reach;
    if (!reducedMotion) {
      fx.impacts.add(contactX, contactY, strength * 0.7, card.scale);
      fx.lights.hit(contactX, contactY, strength, card.scale);
      sparkBurst(fx.particles, contactX, contactY, dirX, dirY, strength, undefined, undefined, card.scale);
      if (strength >= RINGING_STRENGTH) fx.shockwave(contactX, contactY, 0.45 * card.scale);
    }
    // A killing blow's badge sits above its victim and goes sooner: the death is what counts.
    const lethal = value >= card.hp;
    const badgeY = card.centerY() - (lethal ? MEDALLION_LAYOUT.height * card.scale * BADGE.lethalLift : 6);
    const badgeScale = (BADGE.scale + strength * BADGE.perStrength) * Math.max(BADGE.smallest, card.scale);
    fx.badges.add(`−${compactStat(value)}`, card.centerX(), badgeY, badgeScale, lethal ? BADGE.lethalSeconds : BADGE.seconds);
    this.options.playSound('hit', strength);
  }

  /** An Immunité breaks: a blue flash, the bubble bursting into shards of light. */
  shieldBreak(card: CombatCard): void {
    const { fx, reducedMotion } = this.options;
    card.playEffect('immunite');
    const { x: dirX, y: dirY } = this.direction(card);
    if (!reducedMotion) {
      fx.lights.shield(card.centerX(), card.centerY(), card.scale);
      sparkBurst(fx.particles, card.centerX(), card.centerY(), dirX, dirY, 1.4, Math.PI, SHIELD_SPARKS, card.scale);
    }
    fx.clock.freeze(0.05);
    fx.addShake(0.15);
    this.options.playSound('clang', 0.6);
  }

  /** The last blow a unit took, or a straight one across the table when it took none (an effect killed it). */
  lastBlow(uid: number): KillingBlowFx {
    return this.lastBlows.get(uid) ?? { dirX: 0, dirY: this.options.isOwn(uid) ? 1 : -1, strength: 1 };
  }

  /** Where the blow on this medallion comes from: the other one of the attack playing now, or straight across. */
  private direction(card: CombatCard): { x: number; y: number } {
    const exchange = this.exchange;
    const otherUid = exchange?.to === card.uid ? exchange.from : exchange?.from === card.uid ? exchange.to : null;
    const other = otherUid === null ? undefined : this.options.cardOf(otherUid);
    if (!other) return { x: 0, y: this.options.isOwn(card.uid) ? 1 : -1 };
    const dx = card.centerX() - other.centerX();
    const dy = card.centerY() - other.centerY();
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  }
}
