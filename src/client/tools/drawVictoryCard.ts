import type { CharacterArt } from '#src/client/const/gameManifest.ts';
import { SITE_NAME, VICTORY_CARD } from '#src/client/const/victoryCard.ts';
import type { VictoryCardModel, VictoryPolitician } from '#src/client/tools/victoryCardModel.ts';
import type { Camp } from '#src/engine/types.ts';

/** What the card is drawn with: the pictures already loaded, by path, and the colours of the theme. */
export interface VictoryCardPaint {
  image(path: string | null): CanvasImageSource | null;
  campColor(camp: Camp): string;
  /** The yellow of the titles, the ink of their edges, the red of the polls. */
  title: string;
  ink: string;
  polls: string;
}

const NUMBER_FONT = 'Bangers, Impact, sans-serif';
const TEXT_FONT = '"Alegreya Sans", system-ui, sans-serif';
const { width: W, height: H } = VICTORY_CARD;

/** A text with the dark edge of the game's titles. */
function edgedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, edge: number, ink: string): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = edge;
  ctx.strokeStyle = ink;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

/** The font size, from `size` down, at which this text holds in `width`. */
function fittedFont(ctx: CanvasRenderingContext2D, text: string, size: number, width: number, font: (px: number) => string): number {
  let px = size;
  ctx.font = font(px);
  while (px > 9 && ctx.measureText(text).width > width) {
    px -= 1;
    ctx.font = font(px);
  }
  return px;
}

/** The backdrop: the last TV set, covering the card, under a dark veil that lets the words read. */
function drawBackdrop(ctx: CanvasRenderingContext2D, decor: CanvasImageSource | null): void {
  ctx.fillStyle = '#0b0e18';
  ctx.fillRect(0, 0, W, H);
  if (decor) {
    const source = decor as { width: number; height: number };
    const scale = Math.max(W / source.width, H / source.height);
    ctx.drawImage(decor, (W - source.width * scale) / 2, (H - source.height * scale) / 2, source.width * scale, source.height * scale);
  }
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, 'rgb(8 11 24 / 0.86)');
  veil.addColorStop(0.5, 'rgb(8 11 24 / 0.62)');
  veil.addColorStop(1, 'rgb(8 11 24 / 0.9)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
}

/** A cut-out head, its jaw in place, `height` tall, centred on `x` with its top at `y`. */
function drawHead(ctx: CanvasRenderingContext2D, art: CharacterArt, atlas: CanvasImageSource, x: number, y: number, height: number): void {
  const { tete: head, machoire: jaw } = art.pieces;
  const scale = height / head.h;
  const left = x - (head.w * scale) / 2;
  ctx.drawImage(atlas, head.x, head.y, head.w, head.h, left, y, head.w * scale, head.h * scale);
  ctx.drawImage(atlas, jaw.x, jaw.y, jaw.w, jaw.h, left + jaw.pose[0] * scale, y + jaw.pose[1] * scale, jaw.w * scale, jaw.h * scale);
}

/** The winner's hero, in a golden ring. */
function drawHero(ctx: CanvasRenderingContext2D, card: VictoryCardModel, paint: VictoryCardPaint): void {
  const { x, y, radius } = VICTORY_CARD.hero;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#23305c';
  ctx.fill();
  ctx.clip();
  const atlas = paint.image(card.hero?.atlas ?? null);
  if (card.hero && atlas) drawHead(ctx, card.hero, atlas, x, y - radius + 10, radius * 1.9);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = paint.title;
  ctx.stroke();
}

function drawWords(ctx: CanvasRenderingContext2D, card: VictoryCardModel, paint: VictoryCardPaint): void {
  const { x, headline, byline, facts } = VICTORY_CARD.words;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 104px ${NUMBER_FONT}`;
  ctx.fillStyle = paint.title;
  edgedText(ctx, card.headline.toUpperCase(), x, headline, 14, paint.ink);
  const room = W - x - 330;
  fittedFont(ctx, card.byline, 38, room, (px) => `700 ${px}px ${TEXT_FONT}`);
  ctx.fillStyle = '#ffffff';
  edgedText(ctx, card.byline, x, byline, 6, paint.ink);
  ctx.font = `700 26px ${TEXT_FONT}`;
  ctx.fillStyle = '#c9cfdc';
  edgedText(ctx, card.facts, x, facts, 5, paint.ink);
}

function drawLogo(ctx: CanvasRenderingContext2D, logo: CanvasImageSource | null): void {
  if (!logo) return;
  const source = logo as { width: number; height: number };
  const { right, top, height } = VICTORY_CARD.logo;
  const width = (source.width * height) / source.height;
  ctx.drawImage(logo, W - right - width, top, width, height);
}

/** A stat at the foot of a medallion: a disc, and its number at the size that holds in it. */
function drawStat(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, color: string, ink: string): void {
  const { radius } = VICTORY_CARD.stat;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fittedFont(ctx, value, 34, radius * 1.75, (px) => `400 ${px}px ${NUMBER_FONT}`);
  ctx.fillStyle = '#ffffff';
  edgedText(ctx, value, x, y + 2, 5, ink);
}

/** One politician of the board: its oval in its camp's colour, its head, a golden ring if it is golden, its stats, its name. */
function drawPolitician(ctx: CanvasRenderingContext2D, m: VictoryPolitician, x: number, paint: VictoryCardPaint): void {
  const { y, ovalWidth, ovalHeight, ring, name } = VICTORY_CARD.board;
  const oval = () => {
    ctx.beginPath();
    ctx.ellipse(x, y, ovalWidth / 2, ovalHeight / 2, 0, 0, Math.PI * 2);
  };
  ctx.save();
  oval();
  const glow = ctx.createRadialGradient(x, y - 20, 10, x, y, ovalHeight / 2);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.25, paint.campColor(m.camp));
  glow.addColorStop(1, '#10162c');
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.clip();
  const atlas = paint.image(m.art?.atlas ?? null);
  if (m.art && atlas) drawHead(ctx, m.art, atlas, x, y - ovalHeight / 2 + 16, ovalHeight * 0.82);
  ctx.restore();
  oval();
  ctx.lineWidth = ring;
  ctx.strokeStyle = m.golden ? paint.title : paint.ink;
  ctx.stroke();
  const { dx, dy } = VICTORY_CARD.stat;
  drawStat(ctx, m.atk, x - dx, y + dy, '#d9972b', paint.ink);
  drawStat(ctx, m.hp, x + dx, y + dy, paint.polls, paint.ink);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  fittedFont(ctx, m.name, 19, VICTORY_CARD.board.step - 10, (px) => `700 ${px}px ${TEXT_FONT}`);
  ctx.fillStyle = '#ffffff';
  edgedText(ctx, m.name, x, name, 4, paint.ink);
}

function drawFooter(ctx: CanvasRenderingContext2D, paint: VictoryCardPaint): void {
  const { y, margin } = VICTORY_CARD.footer;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `italic 700 24px ${TEXT_FONT}`;
  ctx.fillStyle = '#c9cfdc';
  edgedText(ctx, 'Casseroles et tambouille politique', margin, y, 5, paint.ink);
  ctx.textAlign = 'right';
  ctx.font = `400 40px ${NUMBER_FONT}`;
  ctx.fillStyle = paint.title;
  edgedText(ctx, SITE_NAME, W - margin, y, 7, paint.ink);
}

/**
 * Draws the victory card on a canvas of its size (VICTORY_CARD): the last TV set behind, the winner's hero and the
 * words, the game's logo, the board that won, one medallion per politician, and where the game lives.
 */
export function drawVictoryCard(ctx: CanvasRenderingContext2D, card: VictoryCardModel, paint: VictoryCardPaint): void {
  drawBackdrop(ctx, paint.image(card.backdrop));
  drawHero(ctx, card, paint);
  drawWords(ctx, card, paint);
  drawLogo(ctx, paint.image('logo/casserolade.webp'));
  const { step } = VICTORY_CARD.board;
  const first = W / 2 - ((card.board.length - 1) * step) / 2;
  card.board.forEach((m, index) => drawPolitician(ctx, m, first + index * step, paint));
  drawFooter(ctx, paint);
}
