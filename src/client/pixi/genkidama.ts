import { Container, Sprite } from 'pixi.js';
import { GENKIDAMA } from '#src/client/const/genkidama.ts';
import type { StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import type { StrikeTarget } from '#src/client/pixi/heroStrike.ts';
import { ballotBurst, sparkBurst } from '#src/client/pixi/particleBursts.ts';
import type { StageFx } from '#src/client/pixi/stageFx.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';

/** The ball at full charge, in pixels, for a 1080p table: its glow, its white heart, the ring around it. */
const BALL = { glow: 430, heart: 190, ring: 330 };
/** The votes that feed it: a ballot leaves the edge of the set this often and takes this long to reach the ball. */
const VOTES = { every: 0.016, flight: 0.46, reach: 1050 };
/** It trembles more and more as it charges: a small shake this often. */
const TREMBLE = { every: 0.12, least: 0.05, most: 0.3 };

interface Vote {
  sprite: Sprite;
  fromX: number;
  fromY: number;
  spin: number;
  age: number;
}

function ballSprite(fx: StageFx, tint: string, size: number): Sprite {
  const sprite = new Sprite(fx.particles.textures.ember);
  sprite.anchor.set(0.5);
  sprite.blendMode = 'add';
  sprite.tint = tint;
  sprite.setSize(size, size);
  return sprite;
}

/**
 * The blow that eliminates a hero: the whole set gives its votes. Ballots fly in from every edge and feed a ball of
 * light that swells over the table (`from`), trembling harder and harder; then it is thrown at the beaten hero's
 * portrait (`target`) and bursts there: a flash, a shock wave, sparks and a storm of ballots. `color` is the winner's;
 * `scale` the table's (1 at 1080p). `onImpact` is called when it lands.
 */
export function genkidama(
  fx: StageFx,
  from: { x: number; y: number },
  target: StrikeTarget,
  color: string,
  scale: number,
  playSound: (name: SynthName, strength?: number) => void,
  onImpact?: () => void,
): StageEffect {
  const view = new Container();
  const votes = new Container();
  const glow = ballSprite(fx, color, BALL.glow * scale);
  const ring = ballSprite(fx, '#ffffff', BALL.ring * scale);
  const heart = ballSprite(fx, '#ffffff', BALL.heart * scale);
  const ball = new Container();
  ball.addChild(glow, ring, heart);
  ball.position.set(from.x, from.y);
  ball.scale.set(0);
  view.addChild(votes, ball);
  fx.deathLayer.addChild(view);
  let flying: Vote[] = [];
  let age = 0;
  let sinceVote = 0;
  let sinceTremble = 0;
  let landed = false;
  playSound('charge');

  function sendVote(): void {
    const angle = Math.random() * Math.PI * 2;
    const sprite = new Sprite(fx.particles.textures.ballot);
    sprite.anchor.set(0.5);
    sprite.rotation = Math.random() * Math.PI * 2;
    votes.addChild(sprite);
    flying.push({ sprite, fromX: from.x + Math.cos(angle) * VOTES.reach * scale, fromY: from.y + Math.sin(angle) * VOTES.reach * 0.6 * scale, spin: (Math.random() - 0.5) * 14, age: 0 });
  }

  function moveVotes(deltaSeconds: number): void {
    flying = flying.filter((vote) => {
      vote.age += deltaSeconds;
      const t = vote.age / VOTES.flight;
      if (t >= 1) {
        vote.sprite.destroy();
        return false;
      }
      // Drawn in faster and faster, and smaller as it is swallowed.
      const along = t * t;
      vote.sprite.position.set(vote.fromX + (ball.x - vote.fromX) * along, vote.fromY + (ball.y - vote.fromY) * along);
      vote.sprite.rotation += vote.spin * deltaSeconds;
      vote.sprite.setSize(44 * scale * (1 - along * 0.7), 35 * scale * (1 - along * 0.7));
      vote.sprite.alpha = Math.min(1, t * 6);
      return true;
    });
  }

  function charge(deltaSeconds: number): void {
    const progress = Math.min(1, age / GENKIDAMA.charge);
    sinceVote += deltaSeconds;
    while (sinceVote >= VOTES.every && progress < 0.92) {
      sinceVote -= VOTES.every;
      sendVote();
    }
    sinceTremble += deltaSeconds;
    if (sinceTremble >= TREMBLE.every) {
      sinceTremble = 0;
      fx.addShake(TREMBLE.least + (TREMBLE.most - TREMBLE.least) * progress);
    }
    // It swells fast, then throbs at full size: the last votes come in.
    const swell = 1 - (1 - progress) ** 2;
    ball.scale.set(swell * (1 + 0.06 * Math.sin(age * 38)));
    ring.rotation = age * 5;
    ring.alpha = 0.35 + 0.25 * Math.sin(age * 24);
  }

  function fly(): void {
    const t = Math.min(1, (age - GENKIDAMA.charge) / GENKIDAMA.flight);
    const along = t * t * t;
    // A wind-up first: it pulls back a little before it is thrown.
    const pull = Math.sin(Math.min(1, t * 3) * Math.PI) * 0.06;
    const x = from.x + (target.x - from.x) * (along - pull);
    const y = from.y + (target.y - from.y) * (along - pull);
    ball.position.set(x, y);
    ball.scale.set(1 - along * 0.35);
    fx.particles.spawn({ texture: 'ember', x, y, vx: 0, vy: 0, life: 0.3, size: [BALL.heart * 0.9 * scale, 6], alpha: [0.7, 0], additive: true, color });
    if (t >= 1) land();
  }

  function land(): void {
    landed = true;
    ball.visible = false;
    fx.finale(target.x, target.y);
    fx.lights.hit(target.x, target.y, 2.6, scale * 2.2);
    // The biggest star of the game: the same manga burst as every blow, several times its size.
    fx.impacts.add(target.x, target.y, 3, scale * 3.2);
    fx.shockwave(target.x, target.y, 1.8);
    sparkBurst(fx.particles, target.x, target.y, 0, 1, 2.4, Math.PI, ['#ffffff', color, '#fff3a0'], scale * 1.3);
    for (let wave = 0; wave < 3; wave++) ballotBurst(fx.particles, target.x, target.y, 2, scale * 1.2);
    playSound('blast');
    onImpact?.();
  }

  return {
    update(deltaSeconds) {
      age += deltaSeconds;
      moveVotes(deltaSeconds);
      if (age < GENKIDAMA.charge) charge(deltaSeconds);
      else if (!landed) fly();
      return age < GENKIDAMA.charge + GENKIDAMA.flight + GENKIDAMA.settle;
    },
    destroy() {
      view.destroy({ children: true });
    },
  };
}
