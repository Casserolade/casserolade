import { Container, Sprite, Text } from 'pixi';
import { CARD_LAYOUT } from '/tools/graphisme/demo/const/card_layout.js';

const NAME_STYLE = { fontFamily: 'Alegreya Sans SC', fontWeight: '800', fontSize: 38, fill: '#ffffff',
  stroke: { color: '#14110c', width: 5 } };
const CAMP_STYLE = { fontFamily: 'Alegreya Sans SC', fontWeight: '800', fontSize: 21, letterSpacing: 2 };
const TEXT_STYLE = { fontFamily: 'Alegreya Sans', fontWeight: '500', fontSize: 27, fill: '#2a2115', align: 'center',
  wordWrap: true, lineHeight: 32 };
const NUMBER_STYLE = { fontFamily: 'Bangers', fontSize: 66, fill: '#ffffff', stroke: { color: '#111111', width: 7 } };

/**
 * The card around a rig. The art background and frame sit behind the rig, the ribbon and texts in front,
 * so the puppet stands inside the card and its head can poke out of the window.
 */
export class CardView {
  constructor({ card, camp, frameTextures, partTextures, rig }) {
    this.frameTextures = frameTextures;
    this.card = card;
    this.view = new Container();
    this.view.sortableChildren = false;

    const art = new Sprite(partTextures.fond_art);
    art.position.set(CARD_LAYOUT.artX, CARD_LAYOUT.artY);
    art.tint = camp.couleur;
    this.frame = new Sprite(frameTextures[card.tier]);
    this.frame.setSize(CARD_LAYOUT.width, CARD_LAYOUT.height);

    rig.setHome(CARD_LAYOUT.feetX, CARD_LAYOUT.feetY);

    const ribbon = new Sprite(partTextures.bandeau);
    ribbon.position.set(CARD_LAYOUT.ribbonX, CARD_LAYOUT.ribbonY);
    ribbon.setSize(CARD_LAYOUT.width, CARD_LAYOUT.ribbonHeight);
    ribbon.tint = camp.couleur;

    const name = createCenteredText(card.name, NAME_STYLE, CARD_LAYOUT.nameX, CARD_LAYOUT.nameY);
    name.scale.set(Math.min(1, CARD_LAYOUT.nameMaxWidth / name.width));
    const campName = createCenteredText(camp.nom.toUpperCase(), { ...CAMP_STYLE, fill: '#6b5a38' },
      CARD_LAYOUT.textX, CARD_LAYOUT.campY);
    const text = createCenteredText(card.text, { ...TEXT_STYLE, wordWrapWidth: CARD_LAYOUT.textWidth },
      CARD_LAYOUT.textX, CARD_LAYOUT.textY);

    this.attackNumber = createCenteredText(String(card.attack), NUMBER_STYLE,
      CARD_LAYOUT.attackMedal.x, CARD_LAYOUT.attackMedal.y);
    this.healthNumber = createCenteredText(String(card.health), NUMBER_STYLE,
      CARD_LAYOUT.healthMedal.x, CARD_LAYOUT.healthMedal.y - 6);

    this.view.addChild(art, this.frame, rig.view, ribbon, name, campName, text,
      createMedal(partTextures.attaque, CARD_LAYOUT.attackMedal), createMedal(partTextures.pv, CARD_LAYOUT.healthMedal),
      this.attackNumber, this.healthNumber);
    this.isGolden = false;
  }

  /** A triple doubles the stats and swaps the frame. */
  toggleGolden() {
    this.isGolden = !this.isGolden;
    this.frame.texture = this.frameTextures[this.isGolden ? 'dore' : this.card.tier];
    this.frame.setSize(CARD_LAYOUT.width, CARD_LAYOUT.height);
    const factor = this.isGolden ? 2 : 1;
    this.attackNumber.text = String(this.card.attack * factor);
    this.healthNumber.text = String(this.card.health * factor);
  }
}

function createCenteredText(content, style, x, y) {
  const text = new Text({ text: content, style });
  text.anchor.set(0.5);
  text.position.set(x, y);
  return text;
}

function createMedal(texture, { x, y, size }) {
  const medal = new Sprite(texture);
  medal.anchor.set(0.5);
  medal.position.set(x, y);
  medal.width = size;
  medal.height = size;
  return medal;
}
