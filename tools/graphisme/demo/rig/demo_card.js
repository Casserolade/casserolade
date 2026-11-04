import { Container } from 'pixi';
import { CharacterRig } from '/tools/graphisme/demo/rig/character_rig.js';
import { CardView } from '/tools/graphisme/demo/rig/card_view.js';
import { createSpeechBubble } from '/tools/graphisme/demo/rig/speech_bubble.js';
import { playEffectAndHold, playEffectLoop, playEffectOnce } from '/tools/graphisme/demo/rig/effect_player.js';
import { CARD_LAYOUT } from '/tools/graphisme/demo/const/card_layout.js';
import { jawOpeningFromLevel } from '/tools/graphisme/demo/tools/jaw_opening_from_level.js';

const HAMMER_WIDTH = 512;
const HAMMER_FLOOR_OFFSET = 36;   // the hammer rests above the bottom of its cell
const BIRDS_WIDTH = 384;
const BIRDS_FEET_OFFSET = 8;

/** One character on stage: the card, the puppet and the moments the journal would trigger. */
export class DemoCard {
  constructor({ card, assets, soundPlayer, stage }) {
    const { manifest } = assets;
    this.card = card;
    this.assets = assets;
    this.soundPlayer = soundPlayer;
    this.isTalking = false;
    this.birds = null;
    this.isFlattened = false;
    this.rig = new CharacterRig({
      description: manifest.personnages[card.id],
      headTexture: assets.characters[card.id].head,
      jawTexture: assets.characters[card.id].jaw,
      bodyTexture: assets.bodies[card.camp],
      eyeTextures: assets.eyes,
      starTexture: assets.star,
      plasterTexture: assets.plaster,
    });
    this.cardView = new CardView({ card, camp: manifest.camps[card.camp], frameTextures: assets.frames,
      partTextures: assets.parts, rig: this.rig });
    this.view = this.cardView.view;
    this.foreground = new Container();
    this.view.addChild(this.foreground);
    stage.addChild(this.view);
  }

  update(deltaSeconds) {
    this.rig.update(deltaSeconds);
    if (this.isTalking) this.rig.setJawOpening(jawOpeningFromLevel(this.soundPlayer.readLevel()));
  }

  async talk() {
    if (this.isTalking || this.isFlattened) return;
    this.isTalking = true;
    const bubble = createSpeechBubble({ quote: this.card.quote, source: this.card.quoteSource });
    bubble.position.set(CARD_LAYOUT.width / 2, 70);
    this.foreground.addChild(bubble);
    await this.soundPlayer.play(this.assets.soundUrl('citations', this.card.sound));
    this.isTalking = false;
    this.rig.setJawOpening(0);
    bubble.destroy({ children: true });
  }

  /** Jumps at another card; reachX is the distance in this card's pixels. */
  async attack(reachX, onImpact) {
    if (this.isFlattened) return;
    this.view.parent.addChild(this.view);
    await this.rig.play('attack', { reachX, onImpact });
  }

  async takeHit() {
    if (this.isFlattened) return;
    this.soundPlayer.play(this.assets.soundUrl('bruitages', 'coup'));
    this.rig.setEyes('croix');
    this.rig.showStars(1.6);
    await this.rig.play('hit');
    await wait(1000);
    if (!this.isFlattened) this.rig.setEyes(this.eyesAtRest ?? 'normal');
  }

  /** The 100-ton hammer: pre-rendered effect, the rig flattens on the impact frame. */
  async crush() {
    if (this.isFlattened) return;
    this.isFlattened = true;
    this.view.parent.addChild(this.view);
    await playEffectOnce(this.effectOnFloor('masse_100t', () => this.onHammerImpact()));
    this.birds = playEffectLoop({
      parent: this.foreground,
      frames: this.assets.effectFrames.oiseaux,
      description: this.assets.manifest.effets.oiseaux,
      x: CARD_LAYOUT.feetX,
      y: CARD_LAYOUT.feetY + BIRDS_FEET_OFFSET,
      displayWidth: BIRDS_WIDTH,
    });
  }

  effectOnFloor(effectId, onImpact) {
    return {
      parent: this.foreground,
      frames: this.assets.effectFrames[effectId],
      description: this.assets.manifest.effets[effectId],
      x: CARD_LAYOUT.feetX,
      y: CARD_LAYOUT.feetY + HAMMER_FLOOR_OFFSET,
      displayWidth: HAMMER_WIDTH,
      onImpact,
    };
  }

  /** The glass bell takes the hit: the puppet does not even flinch. */
  async showImmunity() {
    if (this.isFlattened) return;
    await playEffectOnce(this.effectOnFloor('immunite',
      () => this.soundPlayer.play(this.assets.soundUrl('bruitages', 'coup'))));
  }

  /** Bars and striped uniform; a second call opens the cell. */
  async togglePrison() {
    if (this.isFlattened) return;
    if (this.cage) {
      this.cage.destroy();
      this.cage = null;
      this.rig.setBodyTexture(this.assets.bodies[this.card.camp]);
      return;
    }
    this.cage = await playEffectAndHold(this.effectOnFloor('prison', () => {
      this.soundPlayer.play(this.assets.soundUrl('bruitages', 'masse'));
      this.rig.setBodyTexture(this.assets.bodies.prison);
    }));
  }

  /** The pink poo on a stick, followed by the hit it causes. */
  async showPolemic() {
    if (this.isFlattened) return;
    await playEffectOnce(this.effectOnFloor('polemique', () => {
      this.soundPlayer.play(this.assets.soundUrl('bruitages', 'coup'));
      this.rig.setEyes('exorbites');
    }));
    this.rig.setEyes(this.eyesAtRest ?? 'normal');
  }

  onHammerImpact() {
    this.soundPlayer.play(this.assets.soundUrl('bruitages', 'masse'));
    this.rig.setEyes('croix');
    this.rig.play('flattened');
  }

  async getUp() {
    if (!this.isFlattened) return;
    if (this.birds) this.birds.destroy();
    this.birds = null;
    this.rig.setPlasterVisible(true);
    playEffectOnce(this.effectOnFloor('retour'));
    await this.rig.play('comeback');
    this.isFlattened = false;
    this.rig.setEyes(this.eyesAtRest ?? 'normal');
  }

  setRestingEyes(kind) {
    this.eyesAtRest = kind;
    if (!this.isFlattened) this.rig.setEyes(kind);
  }

  toggleGolden() {
    this.cardView.toggleGolden();
    if (this.shine) {
      this.shine.destroy();
      this.shine = null;
      return;
    }
    this.shine = playEffectLoop({
      parent: this.foreground,
      frames: this.assets.effectFrames.dore,
      description: this.assets.manifest.effets.dore,
      x: 0,
      y: 0,
      displayWidth: CARD_LAYOUT.width,
    });
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
}
