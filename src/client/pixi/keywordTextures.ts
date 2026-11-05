import type { Texture } from 'pixi.js';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import { FARTHEST_CORNER, MEDALLION_RESOLUTION, cachedTexture } from '#src/client/pixi/medallionCanvas.ts';

/** The keyword decor of a combat medallion, as MedallionToken.vue draws it: bubble, lectern, halo, slime, sashes. */
const { width: W, height: H } = MEDALLION_LAYOUT;
const CX = W / 2;
const CY = H / 2;
/** A drop of slime: its width, and the room around it for its glow. */
const DRIP_WIDTH = 17;
export const DRIP_PADDING = 8;

/** The Immunité bubble over the whole medallion (`.bubble`): its glow, its tinted inside, its rim and its gleam. */
export function immunityBubbleTexture(): Texture {
  return cachedTexture('bubble', (ctx) => {
    const [rx, ry] = [W / 2 + 15, H / 2 + 15];
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(CX, CY, rx, ry, 0, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(255, 220, 90, 0.85)';
    ctx.shadowBlur = 16 * MEDALLION_RESOLUTION;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255, 220, 90, 0.85)';
    ctx.stroke();
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(rx, ry);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    const inside = ctx.createRadialGradient(0, 0, 0, 0, 0, FARTHEST_CORNER);
    inside.addColorStop(0.4, 'rgba(255, 248, 200, 0.16)');
    inside.addColorStop(0.78, 'rgba(255, 226, 110, 0.42)');
    inside.addColorStop(1, 'rgba(255, 214, 80, 0.7)');
    ctx.fillStyle = inside;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(CX - rx * 0.36, CY - ry * 0.66);
    ctx.scale(rx * 0.34, ry * 0.2);
    const gleam = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gleam.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gleam.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gleam;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(CX, CY, rx - 2, ry - 2, 0, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 250, 210, 0.95)';
    ctx.stroke();
  });
}

/** The lectern of the Porte-parole behind the medallion (`.lectern`): a metal shield, purple inside. Its microphone is a sprite. */
export function lecternTexture(): Texture {
  return cachedTexture('lectern', (ctx) => {
    const shield = (left: number, top: number, right: number, bottom: number) => {
      const [w, h] = [right - left, bottom - top];
      ctx.beginPath();
      ctx.moveTo(left + w / 2, top);
      ctx.lineTo(right, top + h * 0.09);
      ctx.lineTo(right, top + h * 0.52);
      ctx.lineTo(left + w / 2, bottom);
      ctx.lineTo(left, top + h * 0.52);
      ctx.lineTo(left, top + h * 0.09);
      ctx.closePath();
    };
    const box = { left: -20, top: -14, right: W + 20, bottom: H + 30 };
    shield(box.left, box.top, box.right, box.bottom);
    const metal = ctx.createLinearGradient(0, box.top, 0, box.bottom);
    metal.addColorStop(0, '#b9bfca');
    metal.addColorStop(0.6, '#4f5768');
    metal.addColorStop(1, '#2a2f3a');
    ctx.fillStyle = metal;
    ctx.fill();
    const shine = ctx.createLinearGradient(box.left, box.top, box.left + (box.right - box.left) * 0.4, box.top + (box.bottom - box.top) * 0.4);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shine;
    ctx.fill();
    shield(box.left + 7, box.top + 7, box.right - 7, box.bottom - 7);
    const inside = ctx.createLinearGradient(0, box.top, 0, box.bottom);
    inside.addColorStop(0, '#5a3a9a');
    inside.addColorStop(1, '#2a1a52');
    ctx.fillStyle = inside;
    ctx.fill();
  });
}

/** The blue halo of the Retour en politique around the frame (`.halo`). */
export function comebackHaloTexture(): Texture {
  return cachedTexture('halo', (ctx) => {
    const [rx, ry] = [W / 2 + 12, H / 2 + 12];
    ctx.translate(CX, CY);
    ctx.scale(rx, ry);
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, FARTHEST_CORNER);
    halo.addColorStop(0.54, 'rgba(90, 180, 255, 0)');
    halo.addColorStop(0.66, 'rgba(90, 180, 255, 0.55)');
    halo.addColorStop(0.76, 'rgba(90, 180, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * The green glow of the Polémique around the frame (`.is-toxic .ring`: box-shadow 0 0 22px 6px): the ring's ellipse,
 * grown by 6 and blurred by 22. Only its blur shows: the ellipse is drawn far away and its shadow brought back.
 */
export function toxicGlowTexture(): Texture {
  const away = 10000;
  return cachedTexture('toxic', (ctx) => {
    ctx.beginPath();
    ctx.ellipse(CX - away, CY, W / 2 + 6, H / 2 + 6, 0, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(120, 255, 60, 0.8)';
    ctx.shadowBlur = 22 * MEDALLION_RESOLUTION;
    ctx.shadowOffsetX = away * MEDALLION_RESOLUTION;
    ctx.fillStyle = '#000000';
    ctx.fill();
  });
}

/** The CSS shape of a drop (`.slime i`): border-radius 40% 40% 50% 50% / 30% 30% 70% 70%, a capsule with a round belly. */
function dropPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const [topX, topY, bottomX, bottomY] = [0.4 * w, 0.3 * h, 0.5 * w, 0.7 * h];
  ctx.beginPath();
  ctx.moveTo(topX, 0);
  ctx.lineTo(w - topX, 0);
  ctx.ellipse(w - topX, topY, topX, topY, 0, -Math.PI / 2, 0);
  ctx.ellipse(w - bottomX, h - bottomY, bottomX, bottomY, 0, 0, Math.PI / 2);
  ctx.ellipse(bottomX, h - bottomY, bottomX, bottomY, 0, Math.PI / 2, Math.PI);
  ctx.ellipse(topX, topY, topX, topY, 0, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

/** One drop of the Polémique's slime, in its own small texture, hanging from its top: lit at 35 % 30 %, glowing. */
export function dripTexture(height: number): Texture {
  const [w, pad] = [DRIP_WIDTH, DRIP_PADDING];
  return cachedTexture(`drip|${height}`, (ctx) => {
    dropPath(ctx, w, height);
    const [lightX, lightY] = [0.35 * w, 0.3 * height];
    const fill = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, Math.hypot(w - lightX, height - lightY));
    fill.addColorStop(0, '#d6ff8a');
    fill.addColorStop(0.45, '#57d11c');
    fill.addColorStop(1, '#2a8a10');
    ctx.shadowColor = 'rgba(120, 255, 60, 0.8)';
    ctx.shadowBlur = 6 * MEDALLION_RESOLUTION;
    ctx.fillStyle = fill;
    ctx.fill();
  }, { width: w + 2 * pad, height: height + 2 * pad, originX: pad, originY: pad });
}

/** A tricolor sash of the Cumul des mandats (`.sash`): an arc of the band, this far around the frame. */
export function sashTexture(outsetX: number, outsetY: number): Texture {
  return cachedTexture(`sash|${outsetX}|${outsetY}`, (ctx) => {
    const [rx, ry] = [W / 2 + outsetX, H / 2 + outsetY];
    const band = (from: number, to: number, color: string) => {
      ctx.beginPath();
      ctx.ellipse(CX, CY, rx - 1, ry - 1, 0, ((from - 90) * Math.PI) / 180, ((to - 90) * Math.PI) / 180);
      ctx.ellipse(CX, CY, rx - 6.5, ry - 6.5, 0, ((to - 90) * Math.PI) / 180, ((from - 90) * Math.PI) / 180, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 3 * MEDALLION_RESOLUTION;
    band(230, 268, '#2a55d6');
    band(268, 300, '#f4f4f4');
    band(300, 338, '#e03a3a');
  });
}
