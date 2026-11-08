import type gsap from 'gsap';
import type { CutsceneActor } from '#src/client/cutscenes/cutsceneActor.ts';
import { BEEP_TIMES } from '#src/client/const/beepTimes.ts';
import { createProp } from '#src/client/cutscenes/cutsceneOverlays.ts';

/**
 * What a prop does by itself, as tweens added to a cutscene's timeline: worn at an ankle, beeping, walking off. Each
 * function places its tweens at `at`.
 */

const BEEP_POPUP_SECONDS = 0.42;
const JOLT_PIXELS = 20;
/** The « BIP ! » pop out on either side of the feet, low and this far from them at least: clear of the big heads. */
const POPUP_SPREAD = 170;
/** A prop walking off the stage takes this long, its little hops this long each. */
const WALK_OFF_SECONDS = 1.8;
const WALK_OFF_HOP = 0.14;
/** Past the left edge, far enough for the widest prop. */
const OFF_LEFT = -700;

/** A prop worn at the ankle (the electronic bracelet): on the near leg, it follows every step. Hidden at first. */
export function createAnkleProp(actor: CutsceneActor, type: string): HTMLElement {
  const worn = createProp(actor.legNear, type, undefined, 'cs-ankle');
  worn.dataset.type = type;
  return worn;
}

/** The red light of a prop that beeps, made the first time it beeps. */
function lightOf(prop: HTMLElement): HTMLElement {
  const existing = prop.querySelector<HTMLElement>(':scope > .cs-prop-light');
  if (existing) return existing;
  const light = document.createElement('span');
  light.className = 'cs-prop-light';
  prop.append(light);
  return light;
}

/** A « BIP ! » that pops out at a point of the stage. */
function createBeepPopup(layer: HTMLElement, x: number, y: number): HTMLElement {
  const popup = document.createElement('span');
  popup.className = 'cs-beep';
  popup.textContent = 'BIP !';
  popup.style.left = `${Math.round(x)}px`;
  popup.style.top = `${Math.round(y)}px`;
  layer.append(popup);
  return popup;
}

/**
 * The prop beeps three times: its light blinks red, a « BIP ! » pops out beside it each time (around `point`, in stage
 * pixels), and the one who wears it jumps at each beep.
 */
export function beep(timeline: gsap.core.Timeline, prop: HTMLElement, wearer: CutsceneActor | null, layer: HTMLElement, point: { x: number; y: number }, at: number): void {
  const light = lightOf(prop);
  BEEP_TIMES.forEach((offset, index) => {
    const start = at + offset;
    // From hidden, so that going back in time hides them again.
    timeline.fromTo(light, { autoAlpha: 0, scale: 1.5, xPercent: -50, yPercent: -50 }, { autoAlpha: 1, scale: 1, duration: 0.05, ease: 'none' }, start);
    timeline.to(light, { autoAlpha: 0, duration: 0.17, ease: 'power2.in' }, start + 0.05);
    const side = index % 2 === 0 ? 1 : -1;
    const popup = createBeepPopup(layer, point.x + side * (POPUP_SPREAD + 60 * index), point.y - 25 * index);
    timeline.fromTo(popup, { autoAlpha: 0, scale: 0.3, rotation: side * -12, y: 0, xPercent: -50, yPercent: -50 }, { autoAlpha: 1, scale: 1.1, y: -30, duration: BEEP_POPUP_SECONDS, ease: 'back.out(3)' }, start);
    timeline.to(popup, { autoAlpha: 0, duration: 0.12 }, start + BEEP_POPUP_SECONDS);
    if (wearer) timeline.to(wearer.hop, { y: -JOLT_PIXELS, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out' }, start);
  });
}

/** A prop on the floor goes off by an edge, in little hops: the cat leaving the room. */
export function walkOff(timeline: gsap.core.Timeline, prop: HTMLElement, toRight: boolean, stageWidth: number, at: number): void {
  timeline.set(prop, { scaleX: toRight ? 1 : -1 }, at);
  timeline.to(prop, { x: toRight ? stageWidth + 80 : OFF_LEFT, duration: WALK_OFF_SECONDS, ease: 'power1.in' }, at);
  const hops = Math.round(WALK_OFF_SECONDS / WALK_OFF_HOP) | 1;
  timeline.to(prop, { y: '-=14', duration: WALK_OFF_HOP, yoyo: true, repeat: hops, ease: 'sine.inOut' }, at);
  timeline.set(prop, { autoAlpha: 0 }, at + WALK_OFF_SECONDS);
}
