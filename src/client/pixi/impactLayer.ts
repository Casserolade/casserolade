import { Container, Graphics } from 'pixi.js';

const IMPACT_SECONDS = 0.24;
const SPIKES = 11;

interface Impact {
  view: Container;
  left: number;
  size: number;
}

/** A manga impact: a jagged white star with a yellow heart, a few speed strokes around it. */
function drawImpact(size: number): Container {
  const view = new Container();
  const points: number[] = [];
  for (let index = 0; index < SPIKES * 2; index++) {
    const angle = (index / (SPIKES * 2)) * Math.PI * 2 + Math.random() * 0.15;
    const radius = index % 2 === 0 ? size * (0.85 + Math.random() * 0.3) : size * 0.42;
    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  const star = new Graphics().poly(points).fill('#ffffff').stroke({ width: 5, color: '#111111' });
  const heart = new Graphics().circle(0, 0, size * 0.32).fill('#ffd84a');
  const strokes = new Graphics();
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2 + 0.2;
    strokes.moveTo(Math.cos(angle) * size * 1.15, Math.sin(angle) * size * 1.15).lineTo(Math.cos(angle) * size * 1.6, Math.sin(angle) * size * 1.6);
  }
  strokes.stroke({ width: 5, color: '#ffffff', cap: 'round' });
  view.addChild(strokes, star, heart);
  view.rotation = Math.random() * Math.PI;
  return view;
}

/** The flashes of the hits, under the numbers: they pop and are gone in a quarter of a second. */
export class ImpactLayer {
  readonly view = new Container();
  private impacts: Impact[] = [];

  /** `strength` from about 0.5 (a scratch) to 2 (a knockout blow). */
  add(x: number, y: number, strength: number): void {
    const size = 34 + 26 * strength;
    const view = drawImpact(size);
    view.position.set(x, y);
    view.scale.set(0.3);
    this.view.addChild(view);
    this.impacts.push({ view, left: IMPACT_SECONDS, size });
  }

  update(deltaSeconds: number): void {
    this.impacts = this.impacts.filter((impact) => this.updateImpact(impact, deltaSeconds));
  }

  private updateImpact(impact: Impact, deltaSeconds: number): boolean {
    impact.left -= deltaSeconds;
    const progress = 1 - impact.left / IMPACT_SECONDS;
    impact.view.scale.set(progress < 0.3 ? 0.3 + (progress / 0.3) * 0.9 : 1.2 + (progress - 0.3) * 0.3);
    impact.view.alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
    if (impact.left > 0) return true;
    impact.view.destroy({ children: true });
    return false;
  }
}
