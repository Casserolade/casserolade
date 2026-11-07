import { Graphics } from 'pixi.js';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';

const { width: W, height: H } = MEDALLION_LAYOUT;
const CX = W / 2;
const CY = H / 2;

/** The light on the one who celebrates: a beam from above and a glow around it, while it speaks. */
export function celebrationSpotlight(): Graphics {
  return new Graphics()
    .poly([CX - 26, -260, CX + 26, -260, CX + W * 0.78, H + 10, CX - W * 0.78, H + 10]).fill({ color: '#fff3c4', alpha: 0.16 })
    .ellipse(CX, CY, W * 0.78, H * 0.74).fill({ color: '#ffd84a', alpha: 0.12 })
    .ellipse(CX, CY, W * 0.66, H * 0.63).fill({ color: '#ffd84a', alpha: 0.16 })
    .ellipse(CX, CY, W * 0.56, H * 0.54).fill({ color: '#fff0a0', alpha: 0.22 })
    .ellipse(CX, H + 12, W * 0.6, 16).fill({ color: '#fff3c4', alpha: 0.3 });
}
