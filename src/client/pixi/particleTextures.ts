import { Texture } from 'pixi.js';

export interface ParticleTextures {
  /** A thin spark, long along its flight: stretched by its speed. */
  streak: Texture;
  /** A soft round ember. */
  ember: Texture;
  /** A soft puff of smoke, lumpy at the edge. */
  smoke: Texture;
  /** A chip of the medallion's frame, a flat chunk. */
  chip: Texture;
  /** A gold coin, seen from the side or the front as it spins. */
  coin: Texture;
}

function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) draw(context);
  return Texture.from(canvas);
}

function drawStreak(context: CanvasRenderingContext2D): void {
  const along = context.createLinearGradient(0, 0, 64, 0);
  along.addColorStop(0, 'rgba(255,255,255,0)');
  along.addColorStop(0.7, 'rgba(255,255,255,0.9)');
  along.addColorStop(1, 'rgba(255,255,255,1)');
  context.fillStyle = along;
  context.beginPath();
  context.moveTo(0, 8);
  context.quadraticCurveTo(48, 3, 64, 8);
  context.quadraticCurveTo(48, 13, 0, 8);
  context.fill();
}

function drawEmber(context: CanvasRenderingContext2D): void {
  const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 32, 32);
}

function drawSmoke(context: CanvasRenderingContext2D): void {
  for (const [x, y, radius] of [[32, 34, 22], [20, 28, 14], [44, 26, 15], [30, 20, 13]]) {
    const puff = context.createRadialGradient(x, y, 0, x, y, radius);
    puff.addColorStop(0, 'rgba(255,255,255,0.55)');
    puff.addColorStop(0.7, 'rgba(255,255,255,0.3)');
    puff.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = puff;
    context.fillRect(0, 0, 64, 64);
  }
}

function drawChip(context: CanvasRenderingContext2D): void {
  context.fillStyle = '#ffffff';
  context.strokeStyle = 'rgba(20,20,30,0.9)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(3, 6);
  context.lineTo(14, 2);
  context.lineTo(21, 12);
  context.lineTo(9, 20);
  context.closePath();
  context.fill();
  context.stroke();
}

function drawCoin(context: CanvasRenderingContext2D): void {
  const face = context.createRadialGradient(13, 11, 2, 16, 16, 15);
  face.addColorStop(0, '#fff6c0');
  face.addColorStop(0.6, '#ffc93a');
  face.addColorStop(1, '#b8780e');
  context.fillStyle = face;
  context.beginPath();
  context.arc(16, 16, 14, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#7a4a06';
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = '#b8780e';
  context.font = 'bold 16px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('€', 16, 17);
}

/** Drawn once per combat, on canvases: every particle is one of these, tinted. */
export function createParticleTextures(): ParticleTextures {
  return {
    streak: canvasTexture(64, 16, drawStreak),
    ember: canvasTexture(32, 32, drawEmber),
    smoke: canvasTexture(64, 64, drawSmoke),
    chip: canvasTexture(24, 24, drawChip),
    coin: canvasTexture(32, 32, drawCoin),
  };
}

export function destroyParticleTextures(textures: ParticleTextures): void {
  Object.values(textures).forEach((texture) => texture.destroy(true));
}
