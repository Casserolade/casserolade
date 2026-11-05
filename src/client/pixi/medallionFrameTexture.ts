import type { Texture } from 'pixi.js';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import { MEDALLION_RESOLUTION, cachedTexture, ellipsePath } from '#src/client/pixi/medallionCanvas.ts';
import { mixColor } from '#src/client/tools/mixColor.ts';

/** The frame of a combat medallion: the metal ring, the camp's oval and its rays, the golden frame (MedallionToken.vue). */
const { width: W, height: H, ring: RING } = MEDALLION_LAYOUT;
const CX = W / 2;
const CY = H / 2;
const SILVER = ['#f4f6fa', '#9aa3b4', '#4a5264', '#c3c9d4', '#6b7385'];
const SILVER_STOPS = [0, 0.3, 0.52, 0.74, 1];
const GOLD = ['#fff6c4', '#f2c230', '#9a6a08', '#ffe27a', '#c08a14', '#fff0a0'];
const GOLD_STOPS = [0, 0.22, 0.46, 0.66, 0.84, 1];
/** Golden: the ring grows by this much on every side, and the oval sits this deep (`.golden .ring`, `.golden .oval`). */
const GOLDEN = { outset: 5, oval: 9, beads: 30 };
const RAYS = { on: 8, period: 20, alpha: 0.1, centerY: 0.43 };
/** A CSS radial-gradient reaches 100 % at the box's farthest corner: past the ellipse, at √2 of its radius. */
const FARTHEST_CORNER = Math.SQRT2;

export type MedallionLook = { color: string; golden: boolean; bothSides: boolean };

/** A CSS linear-gradient at `degrees` over the medallion's box, with its color stops. */
function angledGradient(ctx: CanvasRenderingContext2D, degrees: number, colors: string[], stops: number[]): CanvasGradient {
  const angle = ((degrees - 90) * Math.PI) / 180;
  const half = (Math.abs(W * Math.cos(angle)) + Math.abs(H * Math.sin(angle))) / 2;
  const gradient = ctx.createLinearGradient(CX - Math.cos(angle) * half, CY - Math.sin(angle) * half, CX + Math.cos(angle) * half, CY + Math.sin(angle) * half);
  colors.forEach((color, i) => gradient.addColorStop(stops[i], color));
  return gradient;
}

function halves(ctx: CanvasRenderingContext2D, left: string, right: string): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, W, 0);
  gradient.addColorStop(0.5, left);
  gradient.addColorStop(0.5, right);
  return gradient;
}

function drawRing(ctx: CanvasRenderingContext2D, look: MedallionLook): void {
  const inset = look.golden ? -GOLDEN.outset : 0;
  ctx.save();
  ellipsePath(ctx, inset);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowOffsetY = 10 * MEDALLION_RESOLUTION;
  ctx.shadowBlur = 16 * MEDALLION_RESOLUTION;
  ctx.fillStyle = look.bothSides ? halves(ctx, '#e2424f', '#2e64d8') : look.golden ? angledGradient(ctx, 160, GOLD, GOLD_STOPS) : angledGradient(ctx, 160, SILVER, SILVER_STOPS);
  ctx.fill();
  if (look.golden) {
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 22 * MEDALLION_RESOLUTION;
    ctx.shadowColor = 'rgba(255, 200, 40, 0.75)';
    ctx.fill();
  }
  ctx.restore();
  ellipsePath(ctx, inset + (look.golden ? 1 : 0.75));
  ctx.lineWidth = look.golden ? 2 : 1.5;
  ctx.strokeStyle = look.golden ? '#6a4400' : 'rgba(0, 0, 0, 0.55)';
  ctx.stroke();
}

/** The camp's oval: a radial light high up, the rays of a TV set, and a shadow at the bottom (`.oval`, `.rays`). */
function drawOval(ctx: CanvasRenderingContext2D, look: MedallionLook): void {
  const inset = look.golden ? GOLDEN.oval : RING;
  const [rx, ry] = [W / 2 - inset, H / 2 - inset];
  ctx.save();
  ellipsePath(ctx, inset);
  ctx.clip();
  if (look.bothSides) {
    ctx.fillStyle = halves(ctx, '#b8303c', '#234ea8');
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.save();
    ctx.translate(CX, CY - ry * 0.24);
    ctx.scale(rx, ry);
    const light = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.3);
    light.addColorStop(0, mixColor(look.color, '#ffffff', 0.5));
    light.addColorStop(0.48, look.color);
    light.addColorStop(1, mixColor(look.color, '#000000', 0.45));
    ctx.fillStyle = light;
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
  const centerY = inset + 2 * ry * RAYS.centerY;
  ctx.fillStyle = `rgba(255, 255, 255, ${RAYS.alpha})`;
  for (let from = 0; from < 360; from += RAYS.period) {
    ctx.beginPath();
    ctx.moveTo(CX, centerY);
    ctx.arc(CX, centerY, W + H, ((from - 90) * Math.PI) / 180, ((from + RAYS.on - 90) * Math.PI) / 180);
    ctx.closePath();
    ctx.fill();
  }
  const shade = ctx.createLinearGradient(0, CY + ry * 0.3, 0, CY + ry);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (look.golden) {
    ellipsePath(ctx, inset + 1.5);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6a4400';
    ctx.stroke();
  }
}

/** The beads strung on a golden frame (`.beads`): a pale dot every 12 degrees, near the outer edge. */
function drawBeads(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(255, 251, 224, 0.9)';
  for (let k = 0; k < GOLDEN.beads; k++) {
    const angle = (k / GOLDEN.beads) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(angle) * (W / 2 + 1 - 3.5), CY + Math.sin(angle) * (H / 2 + 1 - 3.5), 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The frame and the oval behind the puppet, for this camp color, golden or not, of every side or not. */
export function medallionFrameTexture(look: MedallionLook): Texture {
  return cachedTexture(`frame|${look.color}|${look.golden}|${look.bothSides}`, (ctx) => {
    drawRing(ctx, look);
    drawOval(ctx, look);
    if (look.golden) drawBeads(ctx);
  });
}
