import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { CharacterArt } from '#src/client/const/gameManifest.ts';
import { RIG_LAYOUT } from '#src/client/const/rigLayout.ts';

export function placeEye(sprite: Sprite, texture: Texture, [x, y, eyeWidth]: [number, number, number], scale: number): void {
  sprite.texture = texture;
  sprite.position.set(x, y);
  sprite.scale.set((eyeWidth * scale) / texture.width);
  sprite.anchor.set(0.5, 64 / texture.height);
}

export function createPlaster(texture: Texture | null, art: CharacterArt): Sprite | null {
  if (!texture) return null;
  const rightEye = art.ancres.oeil_d;
  const plaster = new Sprite(texture);
  plaster.anchor.set(0.5);
  plaster.position.set(rightEye[0] + rightEye[2] * 0.5, rightEye[1] - rightEye[2] * 1.05);
  plaster.scale.set((rightEye[2] * 1.5) / texture.width);
  plaster.visible = false;
  return plaster;
}

export function createStars(texture: Texture | null): Sprite[] {
  if (!texture) return [];
  return Array.from({ length: RIG_LAYOUT.starCount }, () => {
    const star = new Sprite(texture);
    star.anchor.set(0.5);
    star.scale.set(RIG_LAYOUT.starScale / RIG_LAYOUT.headScale);
    star.visible = false;
    return star;
  });
}

/** Without a photo: a cardboard sign where the head would be. */
export function createPlacard(name: string): Container {
  const placard = new Container();
  const board = new Graphics().rect(0, 0, 300, 170).fill('#f3ecd8').stroke({ color: '#14110c', width: 8 });
  const label = new Text({
    text: name,
    style: { fontFamily: 'Alegreya Sans SC', fontWeight: '800', fontSize: 52, fill: '#14110c', align: 'center', wordWrap: true, wordWrapWidth: 270, lineHeight: 54 },
  });
  label.anchor.set(0.5);
  label.position.set(150, 85);
  placard.addChild(board, label);
  placard.rotation = -0.06;
  return placard;
}
