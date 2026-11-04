import { Container, Graphics, Text } from 'pixi';

const BUBBLE_WIDTH = 460;
const PADDING = 20;
const QUOTE_STYLE = { fontFamily: 'Alegreya Sans', fontWeight: '700', fontSize: 30, fill: '#111111',
  align: 'center', wordWrap: true, wordWrapWidth: BUBBLE_WIDTH - PADDING * 2, lineHeight: 34 };
const SOURCE_STYLE = { fontFamily: 'Alegreya Sans', fontWeight: '500', fontSize: 19, fill: '#55504a', align: 'center' };

/** Manga speech bubble showing an exact quote and where it comes from. */
export function createSpeechBubble({ quote, source }) {
  const view = new Container();
  const quoteText = new Text({ text: `« ${quote} »`, style: QUOTE_STYLE });
  const sourceText = new Text({ text: source, style: SOURCE_STYLE });
  quoteText.anchor.set(0.5, 0);
  sourceText.anchor.set(0.5, 0);
  const height = PADDING * 2 + quoteText.height + 6 + sourceText.height;
  quoteText.position.set(0, -height + PADDING);
  sourceText.position.set(0, -PADDING - sourceText.height);
  view.addChild(drawBubble(height), quoteText, sourceText);
  return view;
}

function drawBubble(height) {
  const half = BUBBLE_WIDTH / 2;
  return new Graphics()
    .poly([-half, -height, half - 6, -height - 5, half + 4, -8, 44, -2, 14, 38, 2, 0, -half + 6, 4])
    .fill('#ffffff')
    .stroke({ color: '#111111', width: 5 });
}
