import { Container, Text } from 'pixi.js';
import { NUMBER_STYLE } from '#src/client/pixi/createCardDecor.ts';

const FLOATER_SECONDS = 0.95;
const POP_SECONDS = 0.14;
const RISE = 80;
const STROKE = { color: '#111111', width: 7 };
/** Another label born this close, and still this young, is in the way: the new one steps aside. */
const CROWD = { distance: 80, seconds: 0.6, step: 50, aside: 22 };
/** A label pops bigger than it ends: words a little, damage a lot. */
const SIZES = { word: { font: 40, pop: 1.5 }, damage: { font: 58, pop: 2 } } as const;

export type FloaterKind = keyof typeof SIZES;

interface Floater {
  view: Text;
  age: number;
  startX: number;
  startY: number;
  drift: number;
  pop: number;
  scale: number;
}

/** The words and numbers that pop from a card, rise and fade away: damage, gains, triggers. */
export class FloaterLayer {
  readonly view = new Container();
  private floaters: Floater[] = [];

  /** `scale` makes a big hit's number bigger. */
  add(label: string, color: string, x: number, y: number, kind: FloaterKind = 'word', scale = 1): void {
    const size = SIZES[kind];
    const text = new Text({ text: label, style: { ...NUMBER_STYLE, fill: color, fontSize: size.font, stroke: STROKE } });
    text.anchor.set(0.5);
    // Two blows in a row on the same card: one under the other, never overlapping (« −7 » « −7 » read « −77 »),
    // nor side by side (« −7 » « −3 » read « −73 »).
    const crowd = this.floaters.filter((other) => other.age < CROWD.seconds && Math.abs(other.startX - x) < CROWD.distance && Math.abs(other.startY - y) < CROWD.distance * 2).length;
    const startY = y + crowd * CROWD.step;
    const aside = crowd === 0 ? 0 : (crowd % 2 === 1 ? 1 : -1) * CROWD.aside;
    text.position.set(x + aside + (Math.random() - 0.5) * 12, startY);
    text.rotation = (Math.random() - 0.5) * 0.25;
    this.view.addChild(text);
    this.floaters.push({ view: text, age: 0, startX: x, startY, drift: (Math.random() - 0.5) * 30, pop: size.pop, scale });
  }

  update(deltaSeconds: number): void {
    this.floaters = this.floaters.filter((floater) => this.updateFloater(floater, deltaSeconds));
  }

  private updateFloater(floater: Floater, deltaSeconds: number): boolean {
    floater.age += deltaSeconds;
    const { age, scale } = floater;
    const pop = age < POP_SECONDS ? floater.pop - (floater.pop - 1) * (age / POP_SECONDS) : 1;
    floater.view.scale.set(pop * scale);
    // Out fast, then it hangs there a moment before fading.
    const rise = 1 - (1 - Math.min(1, age / FLOATER_SECONDS)) ** 3;
    floater.view.y = floater.startY - RISE * rise;
    floater.view.x += floater.drift * deltaSeconds;
    floater.view.alpha = Math.min(1, (FLOATER_SECONDS - age) * 4);
    if (age < FLOATER_SECONDS) return true;
    floater.view.destroy();
    return false;
  }
}
