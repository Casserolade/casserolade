import { createActor } from '#src/client/cutscenes/cutsceneActor.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { propArt } from '#src/client/cutscenes/cutsceneArt.ts';

/** The DOM of what appears for a moment in a cutscene: hidden until the timeline shows it. */

function element(className: string, parent: HTMLElement, text?: string): HTMLElement {
  const node = document.createElement('div');
  node.className = className;
  if (text !== undefined) node.textContent = text;
  parent.append(node);
  return node;
}

/** A line in a comic bubble, above the head of the one who says it. Real or invented, it looks the same: no mention on screen. */
export function createBubble(actorRoot: HTMLElement, text: string): HTMLElement {
  return element('cs-bubble', actorRoot, text);
}

export function createCaption(overlay: HTMLElement, text: string): HTMLElement {
  return element('cs-caption', overlay, text);
}

/** A host's line: their face in a circle, their name, and what they say, low on the left like a news show. */
export function createHostLine(overlay: HTMLElement, manifest: GameManifest, host: { id: string; name: string }, text: string): HTMLElement {
  const line = element('cs-host', overlay);
  const face = element('cs-host-face', line);
  if (manifest.personnages[host.id]) createActor(face, { role: host.id, personnage: host.id }, manifest, 0.62);
  const lines = element('cs-host-lines', line);
  element('cs-host-name', lines, host.name);
  element('cs-host-text', lines, text);
  return line;
}

export function createShout(overlay: HTMLElement, text: string): HTMLElement {
  return element('cs-crowd', overlay, text);
}

export function createTitle(overlay: HTMLElement, main: string, sub?: string): HTMLElement {
  const title = element('cs-title', overlay);
  element('cs-title-main', title, main);
  if (sub) element('cs-title-sub', title, sub);
  return title;
}

/** The news channels' ticker: the red label, then the text. */
export function createTicker(overlay: HTMLElement, text: string): { ticker: HTMLElement; text: HTMLElement } {
  const ticker = element('cs-ticker', overlay);
  element('cs-ticker-label', ticker, 'ALERTE INFO');
  return { ticker, text: element('cs-ticker-text', ticker, text) };
}

/** A prop: its drawing, and the words written on it (a sign, a newspaper). Without a drawing, a plain board. */
export function createProp(parent: HTMLElement, type: string, text?: string, className = 'cs-prop'): HTMLElement {
  const prop = element(className, parent);
  const art = propArt(type);
  if (art) {
    const image = document.createElement('img');
    image.src = art;
    image.alt = '';
    prop.append(image);
  } else {
    prop.style.background = 'var(--color-paper, #f3ecd8)';
    prop.style.border = '6px solid var(--color-ink, #14110c)';
    prop.style.borderRadius = '18px';
  }
  if (text) element('cs-prop-text', prop, text);
  return prop;
}

/** Confetti pieces at the top of the stage, their colours and places drawn from the cutscene's own random. */
export function createConfetti(layer: HTMLElement, count: number, random: () => number): HTMLElement[] {
  const colours = ['#ffc53d', '#c8102e', '#ffffff', '#1f4fd1', '#7dff9e'];
  return Array.from({ length: count }, () => {
    const piece = document.createElement('i');
    piece.style.left = `${Math.round(random() * 1900)}px`;
    piece.style.background = colours[Math.floor(random() * colours.length)];
    layer.append(piece);
    return piece;
  });
}
