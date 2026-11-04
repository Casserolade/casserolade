import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { CARD_LAYOUT } from '#src/client/const/cardLayout.ts';

export const NUMBER_STYLE = { fontFamily: 'Bangers', fontSize: 72, fill: '#ffffff', stroke: { color: '#111111', width: 8 } };
const RULE_STYLE = { fontFamily: 'Alegreya Sans', fontWeight: '700' as const, fontSize: 44, fill: '#2a2115', align: 'center' as const, wordWrap: true, wordWrapWidth: 370, lineHeight: 46 };
const NAME_STYLE = { fontFamily: 'Alegreya Sans SC', fontWeight: '800' as const, fontSize: 46, fill: '#ffffff', stroke: { color: '#14110c', width: 6 } };

export function createCenteredText(content: string, style: object, x: number, y: number): Text {
  const text = new Text({ text: content, style });
  text.anchor.set(0.5);
  text.position.set(x, y);
  return text;
}

/** The art window, behind the puppet. */
export function createCardBack(artTexture: Texture | null, frameTexture: Texture | undefined, color: string): Container {
  const back = new Container();
  const { artX, artY, artWidth, artHeight, width, height } = CARD_LAYOUT;
  if (artTexture) {
    const art = new Sprite(artTexture);
    art.position.set(artX, artY);
    art.setSize(artWidth, artHeight);
    art.tint = color;
    back.addChild(art);
  } else {
    back.addChild(new Graphics().rect(artX, artY, artWidth, artHeight).fill(color));
  }
  if (frameTexture) {
    const frame = new Sprite(frameTexture);
    frame.setSize(width, height);
    back.addChild(frame);
  } else {
    back.addChild(new Graphics().roundRect(0, 0, width, height, 26).stroke({ color: '#14110c', width: 10 }));
  }
  return back;
}

export interface CardFront {
  view: Container;
  rules: Text;
  attack: Text;
  health: Text;
}

/** What stands in front of the puppet: ribbon, name, rules and medals. */
export function createCardFront(name: string, color: string, ribbon: Texture | null, attackMedal: Texture | null, healthMedal: Texture | null): CardFront {
  const view = new Container();
  const { width, ribbonY, ribbonHeight, nameY, nameMaxWidth, textY, attackMedal: attackPlace, healthMedal: healthPlace } = CARD_LAYOUT;
  if (ribbon) {
    const band = new Sprite(ribbon);
    band.position.set(0, ribbonY);
    band.setSize(width, ribbonHeight);
    band.tint = color;
    view.addChild(band);
  }
  const nameText = createCenteredText(name, NAME_STYLE, width / 2, nameY);
  nameText.scale.set(Math.min(1, nameMaxWidth / nameText.width));
  const rules = createCenteredText('', RULE_STYLE, width / 2, textY - 10);
  view.addChild(nameText, rules);
  for (const [texture, place] of [[attackMedal, attackPlace], [healthMedal, healthPlace]] as const) {
    if (!texture) continue;
    const medal = new Sprite(texture);
    medal.anchor.set(0.5);
    medal.position.set(place.x, place.y);
    medal.setSize(place.size, place.size);
    view.addChild(medal);
  }
  const attack = createCenteredText('', NUMBER_STYLE, attackPlace.x, attackPlace.y);
  const health = createCenteredText('', NUMBER_STYLE, healthPlace.x, healthPlace.y - 6);
  view.addChild(attack, health);
  return { view, rules, attack, health };
}
