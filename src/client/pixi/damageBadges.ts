import { Container, Graphics, Text } from 'pixi.js';
import { NUMBER_STYLE } from '#src/client/pixi/createCardDecor.ts';
import { elasticPop } from '#src/client/tools/elasticPop.ts';

/** How long a badge takes to pop in, and to go away. */
const BADGE = { pop: 0.3, out: 0.16 };
/** It hops twice, the second hop smaller: the number bounces on the medallion. */
const HOP = { height: 26, period: 0.22, damping: 5, until: 0.44 };
const SPLAT = { radius: 44, spikes: 12, color: '#e3262e', rim: '#ffd84a', ink: '#111111' };
/** Two badges this close and this young: the new one steps aside instead of covering the other. */
const CROWD = { distance: 70, seconds: 0.5, step: 46 };

interface Badge {
  view: Container;
  age: number;
  seconds: number;
  scale: number;
  y: number;
  x: number;
}

/** The red splat of a blow, ragged, with a yellow rim: Hearthstone's damage star, manga style. */
function drawSplat(radius: number): Graphics {
  const points: number[] = [];
  for (let index = 0; index < SPLAT.spikes * 2; index++) {
    const angle = (index / (SPLAT.spikes * 2)) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
    const reach = index % 2 === 0 ? radius * (0.92 + Math.random() * 0.22) : radius * 0.66;
    points.push(Math.cos(angle) * reach, Math.sin(angle) * reach);
  }
  return new Graphics()
    .poly(points).fill(SPLAT.rim).stroke({ width: 6, color: SPLAT.ink, join: 'round' })
    .circle(0, 0, radius * 0.62).fill(SPLAT.color);
}

/**
 * The damage of each blow, written big on a red splat over the medallion hit: it pops in, bounces twice, holds, and
 * goes away. A harder blow makes a bigger badge.
 */
export class DamageBadgeLayer {
  readonly view = new Container();
  private badges: Badge[] = [];

  /** `label` already written (« −3 », « −1,2k »); `scale` grows with the blow; it stays `seconds`. */
  add(label: string, x: number, y: number, scale: number, seconds: number): void {
    const crowd = this.badges.filter((other) => other.age < CROWD.seconds && Math.hypot(other.x - x, other.y - y) < CROWD.distance).length;
    const view = new Container();
    const text = new Text({ text: label, style: { ...NUMBER_STYLE, fill: '#ffffff', fontSize: 50, stroke: { color: SPLAT.ink, width: 8 } } });
    text.anchor.set(0.5, 0.52);
    const splat = drawSplat(SPLAT.radius + Math.max(0, label.length - 2) * 7);
    view.addChild(splat, text);
    view.rotation = (Math.random() - 0.5) * 0.3;
    const placedY = y + crowd * CROWD.step;
    view.position.set(x, placedY);
    view.scale.set(0);
    this.view.addChild(view);
    this.badges.push({ view, age: 0, seconds, scale, x, y: placedY });
  }

  update(deltaSeconds: number): void {
    this.badges = this.badges.filter((badge) => this.updateBadge(badge, deltaSeconds));
  }

  private updateBadge(badge: Badge, deltaSeconds: number): boolean {
    badge.age += deltaSeconds;
    const { age, view, seconds } = badge;
    if (age >= seconds) {
      view.destroy({ children: true });
      return false;
    }
    const leaving = Math.max(0, (age - (seconds - BADGE.out)) / BADGE.out);
    view.scale.set(badge.scale * elasticPop(age / BADGE.pop) * (1 + leaving * 0.25));
    view.alpha = 1 - leaving;
    const hop = age < HOP.until ? Math.abs(Math.sin((Math.PI * age) / HOP.period)) * Math.exp(-HOP.damping * age) : 0;
    view.y = badge.y - HOP.height * hop;
    return true;
  }
}
