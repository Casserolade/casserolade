import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import { burnDeath } from '#src/client/pixi/deaths/burnDeath.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { ejectDeath } from '#src/client/pixi/deaths/ejectDeath.ts';
import { explodeDeath } from '#src/client/pixi/deaths/explodeDeath.ts';
import { goldDeath } from '#src/client/pixi/deaths/goldDeath.ts';
import { lightDeath } from '#src/client/pixi/deaths/lightDeath.ts';
import { popDeath } from '#src/client/pixi/deaths/popDeath.ts';
import { shatterDeath } from '#src/client/pixi/deaths/shatterDeath.ts';
import { tvOffDeath } from '#src/client/pixi/deaths/tvOffDeath.ts';
import type { DeathKind } from '#src/client/tools/deathKind.ts';

type Death = (card: CombatCard, scene: DeathScene, blow: KillingBlowFx) => StageEffect;

/** Each kind of death (deathKind.ts), and how it plays. */
const DEATHS: Record<DeathKind, Death> = {
  eject: ejectDeath,
  shatter: shatterDeath,
  explode: explodeDeath,
  burn: burnDeath,
  gold: goldDeath,
  'tv-off': tvOffDeath,
  pop: popDeath,
  light: lightDeath,
};

/** Plays a politician's death (deathPlayed.ts says which). It owns the card from now on, and destroys it once over. */
export function playDeath(kind: DeathKind, card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  return DEATHS[kind](card, scene, blow);
}
