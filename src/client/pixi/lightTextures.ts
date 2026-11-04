import { Texture } from 'pixi.js';

const SIZE = 256;

export interface LightTextures {
  /** A soft round glow, white at the heart. */
  glow: Texture;
  /** A thin bright ring, for shock waves. */
  ring: Texture;
  /** A vertical beam that fades at both ends. */
  beam: Texture;
  /** A four-pointed glint. */
  spark: Texture;
}

function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) draw(context);
  return Texture.from(canvas);
}

function drawGlow(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, SIZE, SIZE);
}

function drawRing(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.3, SIZE / 2, SIZE / 2, SIZE / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, SIZE, SIZE);
}

function drawBeam(context: CanvasRenderingContext2D): void {
  const across = context.createLinearGradient(0, 0, 64, 0);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.5, 'rgba(255,255,255,1)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = across;
  context.fillRect(0, 0, 64, SIZE);
  // Fades toward the top and at the foot: the light rises from the card and dies in the air.
  context.globalCompositeOperation = 'destination-in';
  const along = context.createLinearGradient(0, 0, 0, SIZE);
  along.addColorStop(0, 'rgba(0,0,0,0)');
  along.addColorStop(0.75, 'rgba(0,0,0,1)');
  along.addColorStop(1, 'rgba(0,0,0,0.2)');
  context.fillStyle = along;
  context.fillRect(0, 0, 64, SIZE);
}

function drawSpark(context: CanvasRenderingContext2D): void {
  const center = 32;
  context.translate(center, center);
  for (const angle of [0, Math.PI / 2]) {
    context.save();
    context.rotate(angle);
    const gradient = context.createLinearGradient(-center, 0, center, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(-center, -2.5, center * 2, 5);
    context.restore();
  }
  const heart = context.createRadialGradient(0, 0, 0, 0, 0, 10);
  heart.addColorStop(0, 'rgba(255,255,255,1)');
  heart.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = heart;
  context.fillRect(-10, -10, 20, 20);
}

/** Drawn once, on a canvas: every light of the combat is one of these, tinted and added. */
export function createLightTextures(): LightTextures {
  return {
    glow: canvasTexture(SIZE, SIZE, drawGlow),
    ring: canvasTexture(SIZE, SIZE, drawRing),
    beam: canvasTexture(64, SIZE, drawBeam),
    spark: canvasTexture(64, 64, drawSpark),
  };
}

export function destroyLightTextures(textures: LightTextures): void {
  Object.values(textures).forEach((texture) => texture.destroy(true));
}
